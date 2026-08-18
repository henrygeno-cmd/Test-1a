import time

from jarvis.memory.store import Episode


def _ep(memory, tool, goal="tidy up", ok=True, task="t1"):
    memory.record(Episode(ts=time.time(), goal=goal, tool=tool, args={},
                          ok=ok, task_id=task))


def test_semantic_round_trip(memory):
    memory.remember("editor", "helix", kind="preference")
    assert memory.recall("editor") == "helix"
    assert memory.recall("absent", "fallback") == "fallback"


def test_facts_filter_by_kind(memory):
    memory.remember("editor", "helix", kind="preference")
    memory.remember("cpu", "m3", kind="fact")
    assert [f["key"] for f in memory.facts(kind="preference")] == ["editor"]


def test_search_finds_related_history(memory):
    _ep(memory, "fs.move", goal="organise the downloads folder by filetype")
    _ep(memory, "fs.list", goal="unrelated calendar summary")
    hits = memory.search("downloads folder organise")
    assert hits
    assert any("downloads" in h["text"] for h in hits)


def test_friction_detects_repeated_sequences(memory):
    for i in range(4):
        _ep(memory, "fs.list", task=f"task{i}")
        _ep(memory, "fs.move", task=f"task{i}")
    found = memory.friction(min_count=3)
    seqs = [f for f in found if f["type"] == "repeated_sequence"]
    assert seqs
    assert seqs[0]["pattern"] == ["fs.list", "fs.move"]


def test_friction_detects_recurring_failures(memory):
    for i in range(5):
        _ep(memory, "net.fetch", ok=False, task=f"t{i}")
    found = memory.friction(min_count=3)
    assert any(f["type"] == "recurring_failure" for f in found)


def test_procedural_win_rate(memory):
    memory.learn("tidy", "sort downloads", [{"tool": "fs.move"}])
    memory.use("tidy", True)
    memory.use("tidy", False)
    row = memory.procedures()[0]
    assert row["uses"] == 2 and row["wins"] == 1
