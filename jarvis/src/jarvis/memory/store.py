"""Four-tier memory. SQLite-backed so it survives restarts and stays greppable.

  working    -- the live context window; not persisted here
  episodic   -- what happened, in order (the raw material for self-improvement)
  semantic   -- durable facts and preferences about the user and machine
  procedural -- learned how-to: recipes that worked, promoted into skills

The episodic log is the important one. Self-improvement is not magic; it is
mining this table for repeated friction and turning the pattern into a tool.
"""
from __future__ import annotations

import json
import math
import re
import sqlite3
import time
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

SCHEMA = """
CREATE TABLE IF NOT EXISTS episodic (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    ts        REAL NOT NULL,
    task_id   TEXT,
    goal      TEXT,
    tool      TEXT,
    args      TEXT,
    ok        INTEGER,
    error     TEXT,
    duration_ms INTEGER DEFAULT 0,
    tokens    INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_epi_ts   ON episodic(ts);
CREATE INDEX IF NOT EXISTS idx_epi_tool ON episodic(tool);
CREATE INDEX IF NOT EXISTS idx_epi_task ON episodic(task_id);

CREATE TABLE IF NOT EXISTS semantic (
    key       TEXT PRIMARY KEY,
    value     TEXT NOT NULL,
    kind      TEXT DEFAULT 'fact',
    source    TEXT,
    confidence REAL DEFAULT 0.7,
    updated   REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS procedural (
    name      TEXT PRIMARY KEY,
    intent    TEXT NOT NULL,
    recipe    TEXT NOT NULL,
    uses      INTEGER DEFAULT 0,
    wins      INTEGER DEFAULT 0,
    created   REAL NOT NULL,
    last_used REAL
);

CREATE TABLE IF NOT EXISTS reflections (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    ts        REAL NOT NULL,
    window    TEXT,
    finding   TEXT NOT NULL,
    action    TEXT
);
"""

_STOP = {"the", "a", "an", "and", "or", "to", "of", "in", "for", "on", "my",
         "me", "is", "it", "that", "this", "with", "please", "can", "you"}


def _tokens(text: str) -> list[str]:
    return [w for w in re.findall(r"[a-z0-9_]+", (text or "").lower())
            if w not in _STOP and len(w) > 2]


@dataclass
class Episode:
    ts: float
    goal: str
    tool: str
    args: Mapping[str, Any]
    ok: bool
    error: str | None = None
    duration_ms: int = 0
    task_id: str | None = None


class Memory:
    def __init__(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(str(path), check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db.executescript(SCHEMA)
        self.db.commit()

    # -- episodic --------------------------------------------------------------
    def record(self, ep: Episode) -> None:
        self.db.execute(
            "INSERT INTO episodic (ts,task_id,goal,tool,args,ok,error,duration_ms)"
            " VALUES (?,?,?,?,?,?,?,?)",
            (ep.ts, ep.task_id, ep.goal, ep.tool, json.dumps(ep.args, default=str),
             int(ep.ok), ep.error, ep.duration_ms),
        )
        self.db.commit()

    def recent(self, limit: int = 50) -> list[sqlite3.Row]:
        return self.db.execute(
            "SELECT * FROM episodic ORDER BY ts DESC LIMIT ?", (limit,)
        ).fetchall()

    def failures_for(self, tool: str, since_hours: float = 168) -> int:
        cutoff = time.time() - since_hours * 3600
        return self.db.execute(
            "SELECT COUNT(*) c FROM episodic WHERE tool=? AND ok=0 AND ts>?",
            (tool, cutoff),
        ).fetchone()["c"]

    # -- semantic --------------------------------------------------------------
    def remember(self, key: str, value: Any, *, kind: str = "fact",
                 source: str = "observed", confidence: float = 0.7) -> None:
        self.db.execute(
            "INSERT INTO semantic (key,value,kind,source,confidence,updated)"
            " VALUES (?,?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET"
            " value=excluded.value, kind=excluded.kind, source=excluded.source,"
            " confidence=excluded.confidence, updated=excluded.updated",
            (key, json.dumps(value, default=str), kind, source, confidence, time.time()),
        )
        self.db.commit()

    def recall(self, key: str, default: Any = None) -> Any:
        row = self.db.execute("SELECT value FROM semantic WHERE key=?", (key,)).fetchone()
        return json.loads(row["value"]) if row else default

    def facts(self, kind: str | None = None) -> list[sqlite3.Row]:
        if kind:
            return self.db.execute(
                "SELECT * FROM semantic WHERE kind=? ORDER BY confidence DESC", (kind,)
            ).fetchall()
        return self.db.execute(
            "SELECT * FROM semantic ORDER BY confidence DESC").fetchall()

    # -- procedural ------------------------------------------------------------
    def learn(self, name: str, intent: str, recipe: Sequence[Mapping[str, Any]]) -> None:
        self.db.execute(
            "INSERT INTO procedural (name,intent,recipe,created) VALUES (?,?,?,?)"
            " ON CONFLICT(name) DO UPDATE SET recipe=excluded.recipe,"
            " intent=excluded.intent",
            (name, intent, json.dumps(recipe, default=str), time.time()),
        )
        self.db.commit()

    def use(self, name: str, ok: bool) -> None:
        self.db.execute(
            "UPDATE procedural SET uses=uses+1, wins=wins+?, last_used=?"
            " WHERE name=?", (int(ok), time.time(), name),
        )
        self.db.commit()

    def procedures(self) -> list[sqlite3.Row]:
        return self.db.execute(
            "SELECT * FROM procedural ORDER BY uses DESC").fetchall()

    # -- retrieval -------------------------------------------------------------
    def search(self, query: str, limit: int = 8) -> list[dict[str, Any]]:
        """BM25-flavoured lexical retrieval over goals and stored facts.

        Deliberately dependency-free. Swap in an embedding index behind this
        same signature when the corpus outgrows it -- nothing above this layer
        needs to know.
        """
        q = _tokens(query)
        if not q:
            return []
        rows: list[tuple[str, str, str]] = []
        for r in self.db.execute(
                "SELECT goal, tool, ts FROM episodic ORDER BY ts DESC LIMIT 3000"):
            rows.append(("episodic", r["goal"] or "", f"{r['tool']} @ {r['ts']}"))
        for r in self.db.execute("SELECT key, value FROM semantic"):
            rows.append(("semantic", f"{r['key']} {r['value']}", r["key"]))
        for r in self.db.execute("SELECT name, intent FROM procedural"):
            rows.append(("procedural", f"{r['name']} {r['intent']}", r["name"]))

        n = len(rows) or 1
        df = Counter()
        docs = [(_tokens(text), src, ref) for src, text, ref in rows]
        for toks, _, _ in docs:
            for t in set(toks):
                df[t] += 1

        scored: list[tuple[float, dict[str, Any]]] = []
        for toks, src, ref in docs:
            if not toks:
                continue
            tf = Counter(toks)
            score = sum(
                (tf[t] / len(toks)) * math.log(1 + n / (1 + df[t]))
                for t in q if t in tf
            )
            if score > 0:
                scored.append((score, {"source": src, "ref": ref,
                                       "text": " ".join(toks[:40]), "score": round(score, 4)}))
        scored.sort(key=lambda x: -x[0])
        return [d for _, d in scored[:limit]]

    # -- reflection ------------------------------------------------------------
    def reflect(self, window: str, finding: str, action: str | None = None) -> None:
        self.db.execute(
            "INSERT INTO reflections (ts,window,finding,action) VALUES (?,?,?,?)",
            (time.time(), window, finding, action),
        )
        self.db.commit()

    def friction(self, min_count: int = 3, since_hours: float = 336) -> list[dict[str, Any]]:
        """Find repeated work: the signal that a new skill should exist.

        Two flavours matter -- sequences repeated verbatim (automate it) and
        tools that keep failing (fix it). Both feed the evolution loop.
        """
        cutoff = time.time() - since_hours * 3600
        out: list[dict[str, Any]] = []

        seqs = Counter()
        by_task: dict[str, list[str]] = {}
        for r in self.db.execute(
                "SELECT task_id, tool FROM episodic WHERE ts>? AND ok=1 ORDER BY ts",
                (cutoff,)):
            by_task.setdefault(r["task_id"] or "-", []).append(r["tool"] or "")
        for tools in by_task.values():
            for i in range(len(tools) - 1):
                seqs[(tools[i], tools[i + 1])] += 1
        for (a, b), c in seqs.most_common(10):
            if c >= min_count:
                out.append({"type": "repeated_sequence", "pattern": [a, b],
                            "count": c,
                            "hypothesis": f"compose {a}->{b} into one skill"})

        for r in self.db.execute(
                "SELECT tool, COUNT(*) c FROM episodic WHERE ts>? AND ok=0"
                " GROUP BY tool HAVING c>=? ORDER BY c DESC", (cutoff, min_count)):
            out.append({"type": "recurring_failure", "pattern": [r["tool"]],
                        "count": r["c"],
                        "hypothesis": f"{r['tool']} fails often; needs a guard or fix"})

        goals = Counter()
        for r in self.db.execute(
                "SELECT goal FROM episodic WHERE ts>? AND goal IS NOT NULL", (cutoff,)):
            key = " ".join(sorted(set(_tokens(r["goal"])))[:5])
            if key:
                goals[key] += 1
        for key, c in goals.most_common(5):
            if c >= min_count * 2:
                out.append({"type": "repeated_request", "pattern": key.split(),
                            "count": c,
                            "hypothesis": f"'{key}' recurs {c}x; worth a dedicated skill"})
        return out
