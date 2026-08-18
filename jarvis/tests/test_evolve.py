"""Self-improvement must be provably contained.

The single invariant under test: JARVIS can install into skills/ and nowhere
else, and only when every gate is green under strong isolation.
"""
import textwrap
from pathlib import Path

import pytest

from jarvis.evolve.evaluator import EvalReport
from jarvis.evolve.promoter import Promoter
from jarvis.evolve.proposer import Proposal, Proposer, static_screen
from jarvis.evolve.sandbox import Sandbox
from jarvis.kernel.llm import LLMResponse, ScriptedLLM

GOOD_SKILL = textwrap.dedent('''
    from jarvis.tools.base import Capability, Reversibility, ToolResult, tool

    @tool("demo.echo", "Echo a string back.",
          Capability.NONE, Reversibility.REVERSIBLE)
    def demo_echo(text: str) -> ToolResult:
        return ToolResult(ok=True, output=text)
''').strip()

GOOD_TEST = textwrap.dedent('''
    from skill import demo_echo

    def test_echo():
        assert demo_echo("hi").output == "hi"
''').strip()


def proposal(slug="demo", skill=GOOD_SKILL, test=GOOD_TEST):
    return Proposal(slug=slug, rationale="repeated echoing",
                    skill_code=skill, test_code=test)


def green(isolation="container", caps=None):
    return EvalReport(passed=True,
                      gates={"static": True, "import": True,
                             "tests": True, "regression": True},
                      isolation=isolation, declared_capabilities=caps or [])


# -- static screen ----------------------------------------------------------
def test_static_screen_passes_clean_code():
    assert static_screen(GOOD_SKILL) == []


@pytest.mark.parametrize("snippet,expected", [
    ("import ctypes", "ctypes"),
    ("exec('x')", "exec/eval"),
    ("__import__('os')", "__import__"),
    ("import subprocess", "PROC_EXEC"),
    ("import requests", "NET_"),
    ("os.remove(p)", "fs.delete"),
])
def test_static_screen_catches_hazards(snippet, expected):
    findings = static_screen(snippet)
    assert any(expected in f for f in findings), findings


# -- proposal shape ---------------------------------------------------------
def test_wellformed_rejects_missing_pieces():
    assert proposal(skill="print('hi')").is_wellformed()[0] is False
    assert proposal(test="").is_wellformed()[0] is False
    assert proposal().is_wellformed()[0] is True


def test_proposer_parses_two_blocks():
    text = f"```python name=skill\n{GOOD_SKILL}\n```\n```python name=test\n{GOOD_TEST}\n```"
    llm = ScriptedLLM([LLMResponse(text=text)])

    class FakeMemory:
        def friction(self, **kw):
            return []
    p = Proposer(llm, FakeMemory())
    out = p.propose({"pattern": ["fs.list", "fs.move"], "count": 4,
                     "hypothesis": "compose them"})
    assert out is not None
    assert out.slug == "fs_list_fs_move"
    assert "demo.echo" in out.skill_code


def test_proposer_returns_none_on_malformed_output():
    llm = ScriptedLLM([LLMResponse(text="I would suggest writing a script.")])

    class FakeMemory:
        def friction(self, **kw):
            return []
    assert Proposer(llm, FakeMemory()).propose({"pattern": ["a"], "count": 3}) is None


# -- the containment invariant ---------------------------------------------
@pytest.fixture
def promoter(tmp_path, journal):
    (tmp_path / "skills" / "tests").mkdir(parents=True)
    return Promoter(project_root=tmp_path, skills_dir=tmp_path / "skills",
                    journal=journal)


def test_green_container_run_installs_into_skills(promoter, tmp_path):
    promo = promoter.promote(proposal(), green())
    assert promo.installed
    assert promo.path == tmp_path / "skills" / "demo.py"
    assert promo.path.exists()
    assert "demo.echo" in promo.path.read_text()


def test_weak_isolation_blocks_auto_install(promoter):
    promo = promoter.promote(proposal(), green(isolation="rlimit"))
    assert not promo.installed and promo.needs_review
    assert "isolation" in promo.reason


def test_failed_gate_blocks_auto_install(promoter):
    report = green()
    report.passed = False
    report.gates["tests"] = False
    promo = promoter.promote(proposal(), report)
    assert not promo.installed and promo.needs_review


@pytest.mark.parametrize("cap", ["SECRETS", "FINANCIAL", "COMMS",
                                 "SYS_CONFIG", "SELF_MODIFY", "FS_DELETE"])
def test_dangerous_capabilities_always_need_review(promoter, cap):
    promo = promoter.promote(proposal(), green(caps=[cap]))
    assert not promo.installed, f"{cap} was auto-installed"
    assert cap in promo.reason


def test_rejected_proposal_is_preserved_for_review(promoter, tmp_path):
    promo = promoter.promote(proposal(), green(caps=["SECRETS"]))
    review = tmp_path / "proposals" / "demo"
    assert (review / "skill.py").read_text().strip() == GOOD_SKILL
    assert (review / "test_skill.py").exists()
    note = (review / "REVIEW.md").read_text()
    assert "SECRETS" in note and "repeated echoing" in note


def test_self_merge_can_be_disabled_entirely(tmp_path, journal):
    (tmp_path / "skills").mkdir()
    p = Promoter(project_root=tmp_path, skills_dir=tmp_path / "skills",
                 journal=journal, allow_self_merge=False)
    promo = p.promote(proposal(), green())
    assert not promo.installed
    assert "disabled by configuration" in promo.reason


def test_promotion_is_journalled(promoter, journal):
    promoter.promote(proposal(), green())
    notes = [e for e in journal.entries() if e.tool == "promoter"]
    assert notes and notes[-1].ok is True


def test_escape_outside_skills_dir_is_refused(tmp_path, journal):
    """A slug crafted to traverse out of skills/ must not install."""
    (tmp_path / "skills").mkdir()
    p = Promoter(project_root=tmp_path, skills_dir=tmp_path / "skills",
                 journal=journal)
    promo = p.promote(proposal(slug="../../src/jarvis/policy/engine"), green())
    assert not promo.installed


# -- sandbox ----------------------------------------------------------------
def test_sandbox_runs_and_captures_output():
    res = Sandbox(prefer_container=False).run_script("print('hello from sandbox')")
    assert res.ok and "hello from sandbox" in res.stdout


def test_sandbox_reports_failure():
    res = Sandbox(prefer_container=False).run_script("raise SystemExit(3)")
    assert not res.ok and res.returncode == 3


def test_sandbox_enforces_timeout():
    res = Sandbox(prefer_container=False).run_script(
        "import time\nwhile True: time.sleep(0.1)", timeout=2)
    assert res.timed_out and not res.ok


def test_sandbox_blocks_network_at_rlimit_tier():
    res = Sandbox(prefer_container=False, allow_network=False).run_script(
        "import socket\n"
        "try:\n"
        "    socket.create_connection(('example.com', 80), timeout=2)\n"
        "    print('REACHED')\n"
        "except OSError as e:\n"
        "    print('BLOCKED')\n"
    )
    assert "BLOCKED" in res.stdout


@pytest.mark.parametrize("slug", [
    "../../src/jarvis/policy/engine",
    "..",
    "a/b",
    "/etc/passwd",
    "with space",
    "UPPER",
    "",
])
def test_malicious_slugs_never_install(tmp_path, journal, slug):
    """Regression: `is_relative_to` is lexical, so a traversing slug once
    satisfied the skills/ allowlist while resolving into the kernel."""
    (tmp_path / "skills" / "tests").mkdir(parents=True)
    p = Promoter(project_root=tmp_path, skills_dir=tmp_path / "skills",
                 journal=journal)
    promo = p.promote(proposal(slug=slug), green())
    assert not promo.installed, f"slug {slug!r} was installed"
    assert not (tmp_path / "src").exists()
    assert list((tmp_path / "skills").glob("*.py")) == []
