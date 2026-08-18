"""Append-only, hash-chained record of everything JARVIS did and why.

Two jobs:
  1. Forensics -- when something goes wrong at 3am you need to reconstruct the
     exact sequence, including the decision that let it through.
  2. Undo -- each entry carries the payload needed to reverse the action.

The chain is tamper-evident: each record commits to the hash of the previous
one, so a truncated or edited journal is detectable. JARVIS holds no capability
to rewrite it (the audit module is in PROTECTED_SOURCE).
"""
from __future__ import annotations

import hashlib
import json
import os
import time
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Iterator, Mapping

GENESIS = "0" * 64


@dataclass
class Entry:
    id: str
    ts: float
    kind: str                       # intent | decision | action | outcome | note
    actor: str                      # kernel | daemon | evolve | user
    tool: str | None = None
    args: Mapping[str, Any] = field(default_factory=dict)
    decision: Mapping[str, Any] | None = None
    ok: bool | None = None
    error: str | None = None
    undo: Mapping[str, Any] | None = None
    task_id: str | None = None
    prev: str = GENESIS
    digest: str = ""

    def compute_digest(self) -> str:
        body = json.dumps(
            {k: v for k, v in asdict(self).items() if k != "digest"},
            sort_keys=True, default=str,
        )
        return hashlib.sha256(body.encode()).hexdigest()


class Journal:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.touch(exist_ok=True)

    # -- writing ---------------------------------------------------------------
    def _last_digest(self) -> str:
        last = None
        for line in self._raw_lines():
            last = line
        return last.get("digest", GENESIS) if last else GENESIS

    def append(self, **kw: Any) -> Entry:
        entry = Entry(
            id=kw.pop("id", None) or uuid.uuid4().hex[:12],
            ts=kw.pop("ts", None) or time.time(),
            prev=self._last_digest(),
            **kw,
        )
        entry.digest = entry.compute_digest()
        with self.path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(asdict(entry), default=str) + "\n")
            fh.flush()
            os.fsync(fh.fileno())   # survive a hard power loss mid-action
        return entry

    # -- reading ---------------------------------------------------------------
    def _raw_lines(self) -> Iterator[dict[str, Any]]:
        if not self.path.exists():
            return
        with self.path.open(encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line:
                    try:
                        yield json.loads(line)
                    except json.JSONDecodeError:
                        continue

    def entries(self) -> Iterator[Entry]:
        for raw in self._raw_lines():
            yield Entry(**raw)

    def tail(self, n: int = 20) -> list[Entry]:
        return list(self.entries())[-n:]

    def verify(self) -> tuple[bool, str]:
        """Walk the hash chain. Returns (intact, message)."""
        prev = GENESIS
        count = 0
        for e in self.entries():
            if e.prev != prev:
                return False, f"chain break at entry {e.id} (#{count})"
            if e.compute_digest() != e.digest:
                return False, f"tampered entry {e.id} (#{count})"
            prev = e.digest
            count += 1
        return True, f"{count} entries intact"

    def undoable(self, limit: int = 50) -> list[Entry]:
        """Most recent successful actions that carry an undo payload."""
        out = [e for e in self.entries()
               if e.kind == "outcome" and e.ok and e.undo]
        return out[-limit:][::-1]
