"""Prove a proposed skill before it is allowed anywhere near the real machine.

Four gates, all of which must pass:
  1. static screen  -- obvious hazards in the source
  2. import check   -- it loads and registers exactly one tool
  3. unit tests     -- the model's own tests, run in the sandbox
  4. regression     -- JARVIS's existing suite still passes

Gate 4 is the one people skip and the one that matters: a skill that works is
worthless if installing it breaks something that already worked.
"""
from __future__ import annotations

import json
import textwrap
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from jarvis.evolve.proposer import Proposal, static_screen
from jarvis.evolve.sandbox import Sandbox, SandboxResult


@dataclass
class EvalReport:
    passed: bool
    gates: dict[str, bool] = field(default_factory=dict)
    detail: dict[str, str] = field(default_factory=dict)
    isolation: str = "process"
    declared_capabilities: list[str] = field(default_factory=list)

    def summary(self) -> str:
        marks = " ".join(f"{'PASS' if v else 'FAIL'}:{k}" for k, v in self.gates.items())
        return f"{'PROVEN' if self.passed else 'REJECTED'} [{marks}]"


HARNESS = textwrap.dedent("""
    import json, sys, importlib.util, traceback

    report = {}

    # -- gate 2: does the skill import and register exactly one tool? --------
    try:
        spec = importlib.util.spec_from_file_location("candidate", "skill.py")
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        specs = [getattr(v, "_jarvis_spec", None) for v in vars(mod).values()]
        specs = [s for s in specs if s is not None]
        if len(specs) != 1:
            report["import"] = [False, f"expected 1 tool, found {len(specs)}"]
        else:
            s = specs[0]
            report["import"] = [True, s.name]
            report["capabilities"] = [c.name for c in type(s.capabilities)
                                      if c.value and (c & s.capabilities)]
            report["reversibility"] = s.reversibility.name
    except Exception:
        report["import"] = [False, traceback.format_exc()[-2000:]]

    # -- gate 3: the model's own tests --------------------------------------
    if report.get("import", [False])[0]:
        try:
            import pytest
            code = pytest.main(["-q", "--no-header", "-x", "test_skill.py"])
            report["tests"] = [code == 0, f"pytest exit {code}"]
        except Exception:
            report["tests"] = [False, traceback.format_exc()[-2000:]]
    else:
        report["tests"] = [False, "skipped: import gate failed"]

    print("__JARVIS_REPORT__" + json.dumps(report))
""").strip()


class Evaluator:
    def __init__(self, sandbox: Sandbox, *, project_root: Path) -> None:
        self.sandbox = sandbox
        self.project_root = project_root

    def evaluate(self, proposal: Proposal) -> EvalReport:
        report = EvalReport(passed=False, isolation=self.sandbox.isolation_tier)

        # Gate 1 -- static screen.
        findings = static_screen(proposal.skill_code)
        report.gates["static"] = not findings
        report.detail["static"] = "; ".join(findings) or "clean"
        if findings:
            return report

        # Gates 2 and 3 -- run inside the sandbox, with the real jarvis package
        # importable so the tool contract resolves.
        src = self.project_root / "src"
        harness = (f"import sys; sys.path.insert(0, {str(src)!r})\n" + HARNESS)
        res: SandboxResult = self.sandbox.run_script(
            harness,
            extra_files={"skill.py": proposal.skill_code,
                         "test_skill.py": proposal.test_code},
            timeout=180,
        )
        parsed = self._parse(res)
        report.gates["import"] = bool(parsed.get("import", [False])[0])
        report.detail["import"] = str(parsed.get("import", [False, "no report"])[1])
        report.gates["tests"] = bool(parsed.get("tests", [False])[0])
        report.detail["tests"] = str(parsed.get("tests", [False, "no report"])[1])
        report.declared_capabilities = list(parsed.get("capabilities", []))
        if not (report.gates["import"] and report.gates["tests"]):
            if not parsed:
                report.detail["sandbox"] = (res.stderr or res.stdout)[-2000:]
            return report

        # Gate 4 -- the existing suite, with the candidate installed.
        report.gates["regression"] = self._regression(proposal)
        report.detail["regression"] = "existing suite re-run with candidate loaded"

        report.passed = all(report.gates.values())
        return report

    @staticmethod
    def _parse(res: SandboxResult) -> dict[str, Any]:
        for line in res.stdout.splitlines():
            if line.startswith("__JARVIS_REPORT__"):
                try:
                    return json.loads(line[len("__JARVIS_REPORT__"):])
                except json.JSONDecodeError:
                    return {}
        return {}

    def _regression(self, proposal: Proposal) -> bool:
        """Install the candidate into a scratch skills dir and re-run the suite."""
        import shutil
        import subprocess
        import sys
        import tempfile

        with tempfile.TemporaryDirectory(prefix="jarvis-reg-") as tmp:
            staging = Path(tmp) / "skills"
            staging.mkdir(parents=True)
            (staging / f"{proposal.slug}.py").write_text(proposal.skill_code)
            env = {
                "PATH": "/usr/bin:/bin:/usr/local/bin",
                "HOME": tmp,
                "PYTHONPATH": str(self.project_root / "src"),
                "JARVIS_SKILLS_DIR": str(staging),
                "JARVIS_STATE_DIR": tmp,
                "PYTHONDONTWRITEBYTECODE": "1",
            }
            try:
                cp = subprocess.run(
                    [sys.executable, "-m", "pytest", "-q", "--no-header",
                     str(self.project_root / "tests")],
                    cwd=str(self.project_root), env=env,
                    capture_output=True, text=True, timeout=600,
                )
            except (subprocess.TimeoutExpired, FileNotFoundError):
                return False
            return cp.returncode == 0
