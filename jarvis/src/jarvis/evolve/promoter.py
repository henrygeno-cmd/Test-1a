"""The gate between "JARVIS wrote code" and "JARVIS runs that code".

Containment invariant, in one sentence: **JARVIS may only ever self-merge into
the skills directory, and only a change that passed every gate under strong
isolation.** Everything else -- the kernel, the policy engine, the journal,
this file -- becomes a branch and a diff for a human to read.

The invariant is enforced twice: here, and again in PolicyEngine.PROTECTED_SOURCE
so a skill that tries to edit these paths at runtime is stopped as well. Two
independent checks, because one check is a single edit away from being none.
"""
from __future__ import annotations

import json
import re
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from jarvis.audit.journal import Journal
from jarvis.evolve.evaluator import EvalReport
from jarvis.evolve.proposer import Proposal

# The ONLY directory JARVIS may install into without a human.
SELF_MERGE_ALLOWED = ("skills/",)

# Isolation tiers strong enough to trust an automatic install.
TRUSTED_ISOLATION = ("container",)

# Capabilities that always require a human, however green the tests are.
NEVER_AUTO = {"SECRETS", "FINANCIAL", "COMMS", "SYS_CONFIG", "SELF_MODIFY",
              "FS_DELETE"}

# A slug becomes a filename. It is derived from model-influenced text, so it is
# validated rather than trusted: anything but lowercase word characters is
# rejected outright instead of being sanitised into something surprising.
SAFE_SLUG = re.compile(r"^[a-z0-9][a-z0-9_]{0,63}$")


@dataclass
class Promotion:
    installed: bool
    path: Path | None
    branch: str | None
    reason: str
    needs_review: bool = False

    def to_json(self) -> dict[str, Any]:
        return {"installed": self.installed, "path": str(self.path) if self.path else None,
                "branch": self.branch, "reason": self.reason,
                "needs_review": self.needs_review}


class Promoter:
    def __init__(self, *, project_root: Path, skills_dir: Path, journal: Journal,
                 allow_self_merge: bool = True) -> None:
        self.project_root = project_root
        self.skills_dir = skills_dir
        self.journal = journal
        self.allow_self_merge = allow_self_merge

    # -- the decision ----------------------------------------------------------
    def _may_self_merge(self, proposal: Proposal, report: EvalReport) -> tuple[bool, str]:
        if not self.allow_self_merge:
            return False, "self-merge disabled by configuration"
        if not report.passed:
            return False, f"gates not all green: {report.summary()}"
        if report.isolation not in TRUSTED_ISOLATION:
            return False, (f"isolation tier '{report.isolation}' is too weak to "
                           "install without review (need a container runtime)")
        risky = NEVER_AUTO.intersection(report.declared_capabilities)
        if risky:
            return False, f"declares {', '.join(sorted(risky))}; always human-reviewed"
        if not SAFE_SLUG.match(proposal.slug):
            return False, f"slug {proposal.slug!r} is not a plain identifier"

        # Resolve before comparing. Path.is_relative_to is a lexical test, so
        # "skills/../../src/jarvis/policy/engine.py" would otherwise satisfy a
        # startswith("skills/") check while pointing at the kernel.
        skills_root = self.skills_dir.resolve()
        target = (self.skills_dir / f"{proposal.slug}.py").resolve()
        if target.parent != skills_root:
            return False, f"{target} resolves outside {skills_root}"
        rel = (target.relative_to(self.project_root.resolve())
               if target.is_relative_to(self.project_root.resolve()) else target)
        if not str(rel).startswith(SELF_MERGE_ALLOWED):
            return False, f"{rel} is outside the self-merge allowlist"
        return True, "all gates green under container isolation"

    # -- execution -------------------------------------------------------------
    def promote(self, proposal: Proposal, report: EvalReport) -> Promotion:
        ok, reason = self._may_self_merge(proposal, report)
        branch = f"jarvis/skill-{proposal.slug}-{int(time.time())}"

        if ok:
            self.skills_dir.mkdir(parents=True, exist_ok=True)
            target = self.skills_dir / f"{proposal.slug}.py"
            target.write_text(self._render(proposal, report))
            (self.skills_dir / "tests").mkdir(exist_ok=True)
            (self.skills_dir / "tests" / f"test_{proposal.slug}.py").write_text(
                proposal.test_code)
            self._git("add", str(target),
                      str(self.skills_dir / "tests" / f"test_{proposal.slug}.py"))
            self._git("commit", "-m",
                      f"skill({proposal.slug}): {proposal.rationale[:60]}\n\n"
                      f"Gates: {report.summary()}\nIsolation: {report.isolation}\n"
                      f"Capabilities: {', '.join(report.declared_capabilities) or 'none'}\n"
                      "Installed automatically under the skills/ self-merge allowlist.")
            promo = Promotion(True, target, None, reason)
        else:
            # Park it on a branch. The work is preserved; the decision is the
            # user's. This is the path every kernel/policy change takes.
            staged = self._stage_for_review(proposal, report, branch)
            promo = Promotion(False, staged, branch, reason, needs_review=True)

        self.journal.append(kind="note", actor="evolve", tool="promoter",
                            ok=promo.installed,
                            args={"slug": proposal.slug, "gates": report.gates},
                            decision=promo.to_json())
        return promo

    def _stage_for_review(self, proposal: Proposal, report: EvalReport,
                          branch: str) -> Path:
        # Same reasoning as the install path: never let a slug steer a write.
        safe = proposal.slug if SAFE_SLUG.match(proposal.slug) else "unsafe-slug"
        review = self.project_root / "proposals" / safe
        review.mkdir(parents=True, exist_ok=True)
        (review / "skill.py").write_text(proposal.skill_code)
        (review / "test_skill.py").write_text(proposal.test_code)
        (review / "REVIEW.md").write_text(self._review_note(proposal, report, branch))
        return review

    @staticmethod
    def _review_note(proposal: Proposal, report: EvalReport, branch: str) -> str:
        gates = "\n".join(f"- {'PASS' if v else 'FAIL'} **{k}** -- {report.detail.get(k, '')}"
                          for k, v in report.gates.items())
        return (
            f"# Proposed skill: `{proposal.slug}`\n\n"
            f"**Why JARVIS wrote this:** {proposal.rationale}\n\n"
            f"**Isolation tier during evaluation:** `{report.isolation}`\n\n"
            f"**Declared capabilities:** {', '.join(report.declared_capabilities) or 'none'}\n\n"
            f"## Gates\n{gates}\n\n"
            f"## Evidence\n```json\n{json.dumps(proposal.evidence, indent=2)[:4000]}\n```\n\n"
            f"## To accept\n```sh\ngit checkout -b {branch}\n"
            f"cp proposals/{proposal.slug}/skill.py skills/{proposal.slug}.py\n"
            f"cp proposals/{proposal.slug}/test_skill.py skills/tests/test_{proposal.slug}.py\n"
            f"pytest && git add -A && git commit -m 'skill({proposal.slug})'\n```\n"
        )

    @staticmethod
    def _render(proposal: Proposal, report: EvalReport) -> str:
        header = (
            f'"""Auto-generated JARVIS skill: {proposal.slug}\n\n'
            f"Rationale: {proposal.rationale}\n"
            f"Gates: {report.summary()}\n"
            f"Isolation: {report.isolation}\n"
            f"Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}\n"
            f'"""\n'
        )
        return header + proposal.skill_code + "\n"

    def _git(self, *args: str) -> subprocess.CompletedProcess:
        return subprocess.run(["git", *args], cwd=str(self.project_root),
                              capture_output=True, text=True)
