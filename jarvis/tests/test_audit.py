"""The journal is the forensic record and the undo source. It must be
tamper-evident and it must survive being appended to concurrently."""
import json

from jarvis.audit.undo import trash


def test_chain_verifies(journal):
    for i in range(5):
        journal.append(kind="note", actor="test", args={"i": i})
    intact, msg = journal.verify()
    assert intact, msg


def test_tampering_is_detected(journal):
    for i in range(3):
        journal.append(kind="note", actor="test", args={"i": i})
    lines = journal.path.read_text().splitlines()
    edited = json.loads(lines[1])
    edited["args"] = {"i": 999}
    lines[1] = json.dumps(edited)
    journal.path.write_text("\n".join(lines) + "\n")
    intact, msg = journal.verify()
    assert not intact
    assert "tampered" in msg


def test_truncation_is_detected(journal):
    for i in range(4):
        journal.append(kind="note", actor="test", args={"i": i})
    lines = journal.path.read_text().splitlines()
    del lines[1]                       # excise a middle entry
    journal.path.write_text("\n".join(lines) + "\n")
    intact, _ = journal.verify()
    assert not intact


def test_undoable_filters_to_reversible_successes(journal):
    journal.append(kind="outcome", actor="k", tool="fs.write", ok=True,
                   undo={"op": "restore_text", "path": "/tmp/a", "previous": None})
    journal.append(kind="outcome", actor="k", tool="fs.read", ok=True)
    journal.append(kind="outcome", actor="k", tool="fs.write", ok=False,
                   undo={"op": "restore_text"})
    items = journal.undoable()
    assert len(items) == 1
    assert items[0].tool == "fs.write"


def test_snapshot_round_trip(snapshots, tmp_path):
    f = tmp_path / "doc.txt"
    f.write_text("original")
    snap = snapshots.capture([str(f)])
    f.write_text("clobbered")
    restored = snapshots.restore(snap.id)
    assert f.read_text() == "original"
    assert str(f) in restored


def test_snapshot_undoes_file_creation(snapshots, tmp_path):
    """A path that did not exist must be removed on restore, not resurrected."""
    ghost = tmp_path / "new.txt"
    snap = snapshots.capture([str(ghost)])
    ghost.write_text("created after the snapshot")
    snapshots.restore(snap.id)
    assert not ghost.exists()


def test_snapshot_directory_round_trip(snapshots, tmp_path):
    d = tmp_path / "proj"
    (d / "sub").mkdir(parents=True)
    (d / "sub" / "a.txt").write_text("A")
    snap = snapshots.capture([str(d)])
    (d / "sub" / "a.txt").write_text("B")
    (d / "sub" / "b.txt").write_text("extra")
    snapshots.restore(snap.id)
    assert (d / "sub" / "a.txt").read_text() == "A"
    assert not (d / "sub" / "b.txt").exists()


def test_trash_is_reversible(tmp_path, monkeypatch):
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setattr("pathlib.Path.home", lambda: tmp_path)
    victim = tmp_path / "gone.txt"
    victim.write_text("still here")
    record = trash(str(victim))
    assert not victim.exists()
    assert record["op"] == "trash"
    from pathlib import Path
    Path(record["to"]).rename(record["from"])
    assert victim.read_text() == "still here"
