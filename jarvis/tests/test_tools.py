"""Tools must never raise into the kernel, and must always describe themselves
accurately enough for the planner and the policy gate."""
import pytest

from jarvis.tools.base import Capability, Reversibility, ToolResult
from jarvis.tools.shell import _is_read_only


def test_every_tool_declares_metadata(registry):
    assert len(registry) > 0
    for spec in registry:
        assert spec.name and "." in spec.name
        assert spec.description
        assert isinstance(spec.reversibility, Reversibility)
        d = spec.describe()
        assert d["input_schema"]["type"] == "object"


def test_unknown_tool_is_a_result_not_an_exception(registry):
    res = registry.invoke("nope.nope", {})
    assert not res.ok and "unknown tool" in res.error


def test_unexpected_argument_is_rejected_cleanly(registry):
    res = registry.invoke("fs.read", {"path": "/tmp/x", "bogus": 1})
    assert not res.ok and "unexpected" in res.error


def test_missing_argument_is_rejected_cleanly(registry):
    res = registry.invoke("fs.write", {"path": "/tmp/x"})
    assert not res.ok and "missing" in res.error


def test_tool_exception_becomes_a_failed_result(registry, tmp_path):
    res = registry.invoke("fs.read", {"path": str(tmp_path / "absent")})
    assert not res.ok
    assert res.error


def test_write_captures_undo_payload(registry, tmp_path):
    target = tmp_path / "f.txt"
    target.write_text("before")
    res = registry.invoke("fs.write", {"path": str(target), "content": "after"})
    assert res.ok
    assert res.undo["previous"] == "before"
    assert target.read_text() == "after"


def test_write_undo_marks_creation(registry, tmp_path):
    target = tmp_path / "brand-new.txt"
    res = registry.invoke("fs.write", {"path": str(target), "content": "x"})
    assert res.undo["previous"] is None      # signals "delete me to undo"


def test_delete_refuses_home_and_root(registry):
    import pathlib
    res = registry.invoke("fs.delete", {"path": str(pathlib.Path.home())})
    assert not res.ok and "refusing" in res.error


def test_shell_readonly_classifier():
    assert _is_read_only("git status")
    assert _is_read_only("ls -la /tmp")
    assert not _is_read_only("git push")
    assert not _is_read_only("rm -rf /")
    # Anything with shell metacharacters is unanalysable, so untrusted.
    assert not _is_read_only("ls | tee /etc/passwd")
    assert not _is_read_only("cat x > /etc/hosts")
    assert not _is_read_only("echo $(rm -rf /tmp/x)")


def test_shell_query_rejects_non_readonly(registry):
    res = registry.invoke("shell.query", {"command": "rm -rf /tmp/whatever"})
    assert not res.ok and "allowlist" in res.error


def test_shell_query_runs_readonly(registry, tmp_path):
    res = registry.invoke("shell.query", {"command": "pwd", "cwd": str(tmp_path)})
    assert res.ok
    assert res.output["code"] == 0


def test_timed_wrapper_records_duration(registry, tmp_path):
    (tmp_path / "a.txt").write_text("x")
    res = registry.invoke("fs.list", {"path": str(tmp_path)})
    assert res.ok and res.duration_ms >= 0
