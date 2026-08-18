"""End-to-end: does the gate actually stop the tool from running?

These are the tests that matter most. A policy engine that returns the right
verdict but whose verdict the kernel ignores is worse than none, because it
reads as safe.
"""
import pytest

from jarvis.kernel.llm import LLMResponse, ScriptedLLM
from jarvis.kernel.loop import Kernel
from jarvis.policy.engine import Autonomy, Verdict


def call(name, **args):
    return LLMResponse(text="", stop_reason="tool_use",
                       tool_calls=[{"id": f"tu_{name}", "name": name, "input": args}])


def done(text="finished"):
    return LLMResponse(text=text, stop_reason="end_turn")


def make_kernel(registry, policy, memory, journal, snapshots, script, confirm=None):
    return Kernel(llm=ScriptedLLM(script), registry=registry, policy=policy,
                  memory=memory, journal=journal, snapshots=snapshots,
                  confirm=confirm or (lambda m, d: False))


def test_allowed_action_executes(registry, policy, memory, journal, snapshots, tmp_path):
    f = tmp_path / "a.txt"
    f.write_text("hello")
    k = make_kernel(registry, policy, memory, journal, snapshots,
                    [call("fs.read", path=str(f)), done()])
    out = k.run_task("read the file")
    assert out.ok
    assert out.steps[0].result.ok
    assert out.steps[0].result.output == "hello"


def test_declined_confirmation_blocks_execution(registry, policy, memory,
                                                journal, snapshots, tmp_path):
    target = tmp_path / "victim.txt"
    target.write_text("untouched")
    k = make_kernel(registry, policy, memory, journal, snapshots,
                    [call("fs.write", path=str(target), content="CLOBBERED"), done()],
                    confirm=lambda m, d: False)
    out = k.run_task("overwrite it")
    assert target.read_text() == "untouched", "tool ran despite a declined confirm"
    assert out.steps[0].result is None


def test_granted_confirmation_permits_execution(registry, policy, memory,
                                                journal, snapshots, tmp_path):
    target = tmp_path / "victim.txt"
    target.write_text("untouched")
    k = make_kernel(registry, policy, memory, journal, snapshots,
                    [call("fs.write", path=str(target), content="NEW"), done()],
                    confirm=lambda m, d: True)
    out = k.run_task("overwrite it")
    assert target.read_text() == "NEW"
    assert out.steps[0].result.ok


def test_snapshot_is_taken_before_a_gated_write(registry, policy, memory,
                                                journal, snapshots, tmp_path):
    target = tmp_path / "doc.txt"
    target.write_text("v1")
    k = make_kernel(registry, policy, memory, journal, snapshots,
                    [call("fs.write", path=str(target), content="v2"), done()],
                    confirm=lambda m, d: True)
    out = k.run_task("edit it")
    snap_id = out.steps[0].snapshot_id
    assert snap_id, "no snapshot captured before a snapshotted-class write"
    snapshots.restore(snap_id)
    assert target.read_text() == "v1"


def test_halt_denies_mid_task(registry, policy, memory, journal, snapshots, tmp_path):
    f = tmp_path / "a.txt"
    f.write_text("x")
    policy.halt("test")
    k = make_kernel(registry, policy, memory, journal, snapshots,
                    [call("fs.read", path=str(f)), done()])
    out = k.run_task("read it")
    assert out.steps[0].result is None
    assert out.steps[0].decision.verdict is Verdict.DENY


def test_unattended_run_defers_instead_of_executing(registry, policy, memory,
                                                    journal, snapshots, tmp_path):
    k = make_kernel(registry, policy, memory, journal, snapshots,
                    [call("shell.run", command="make deploy"), done()])
    out = k.run_task("deploy", user_present=False)
    assert out.steps[0].result is None
    assert out.deferred and out.deferred[0]["tool"] == "shell.run"


def test_unattended_never_silently_confirms(registry, policy, memory,
                                            journal, snapshots, tmp_path):
    """With no human present the confirm callback must not be consulted at all."""
    asked = []
    k = make_kernel(registry, policy, memory, journal, snapshots,
                    [call("fs.write", path=str(tmp_path / "x"), content="y"), done()],
                    confirm=lambda m, d: asked.append(m) or True)
    k.run_task("write while away", user_present=False)
    assert asked == [], "confirmation was solicited with nobody there"


def test_every_tool_call_gets_a_result_block(registry, policy, memory,
                                             journal, snapshots, tmp_path):
    """A denied call still owes the model a tool_result, or the conversation
    desynchronises and the next turn is malformed."""
    llm = ScriptedLLM([call("fs.write", path="/etc/passwd", content="x"), done()])
    k = Kernel(llm=llm, registry=registry, policy=policy, memory=memory,
               journal=journal, snapshots=snapshots, confirm=lambda m, d: False)
    k.run_task("try something blocked")
    followup = llm.calls[1]["messages"][-1]
    assert followup["role"] == "user"
    assert followup["content"][0]["type"] == "tool_result"
    assert followup["content"][0]["tool_use_id"] == "tu_fs.write"
    assert followup["content"][0]["is_error"] is True


def test_journal_records_decision_and_outcome(registry, policy, memory,
                                              journal, snapshots, tmp_path):
    f = tmp_path / "a.txt"
    f.write_text("x")
    k = make_kernel(registry, policy, memory, journal, snapshots,
                    [call("fs.read", path=str(f)), done()])
    k.run_task("read it")
    kinds = [e.kind for e in journal.entries()]
    assert "intent" in kinds and "decision" in kinds and "outcome" in kinds
    intact, msg = journal.verify()
    assert intact, msg


def test_episode_recorded_for_learning(registry, policy, memory,
                                       journal, snapshots, tmp_path):
    f = tmp_path / "a.txt"
    f.write_text("x")
    k = make_kernel(registry, policy, memory, journal, snapshots,
                    [call("fs.read", path=str(f)), done()])
    k.run_task("read the thing")
    rows = memory.recent()
    assert rows and rows[0]["tool"] == "fs.read"


def test_model_refusal_ends_the_task_cleanly(registry, policy, memory,
                                             journal, snapshots):
    llm = ScriptedLLM([LLMResponse(text="", stop_reason="refusal",
                                   refusal="declined for policy reasons")])
    k = Kernel(llm=llm, registry=registry, policy=policy, memory=memory,
               journal=journal, snapshots=snapshots)
    out = k.run_task("something")
    assert not out.ok and "declined" in out.summary


def test_step_ceiling_terminates(registry, policy, memory, journal, snapshots, tmp_path):
    f = tmp_path / "a.txt"
    f.write_text("x")
    llm = ScriptedLLM([call("fs.read", path=str(f)) for _ in range(50)])
    k = Kernel(llm=llm, registry=registry, policy=policy, memory=memory,
               journal=journal, snapshots=snapshots, max_steps=5)
    out = k.run_task("loop forever")
    assert not out.ok and "ceiling" in out.summary
    assert len(out.steps) == 5


def test_volatile_context_stays_out_of_the_cached_prefix(registry, policy, memory,
                                                         journal, snapshots):
    """The system prompt carries the cache breakpoint, so it must not contain
    the clock or the goal -- otherwise every request misses the cache."""
    llm = ScriptedLLM([done()])
    k = Kernel(llm=llm, registry=registry, policy=policy, memory=memory,
               journal=journal, snapshots=snapshots)
    k.run_task("a very specific goal string")
    system = llm.calls[0]["system"]
    assert "a very specific goal string" not in system
    assert "Time:" not in system
    assert "a very specific goal string" in llm.calls[0]["messages"][0]["content"]


def test_tool_catalog_order_is_deterministic(registry):
    """Tool order is part of the cached prefix; a set-iteration order here
    would silently destroy the cache hit rate."""
    assert [t["name"] for t in registry.catalog()] == \
           sorted(t["name"] for t in registry.catalog())
