"""What wakes JARVIS up.

An assistant that only acts when spoken to is a chatbot. The trigger layer is
what makes it resident: schedules, filesystem events, and internal conditions
all produce the same Activation object, which the supervisor turns into a task.
"""
from __future__ import annotations

import fnmatch
import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Iterable, Protocol


@dataclass
class Activation:
    source: str
    goal: str
    payload: dict[str, Any] = field(default_factory=dict)
    ts: float = field(default_factory=time.time)
    # Activations from watchers describe the world, not the user's wishes.
    # They are never treated as instructions -- see the supervisor.
    trusted: bool = False


class Trigger(Protocol):
    name: str
    def poll(self) -> Iterable[Activation]: ...


@dataclass
class ScheduleTrigger:
    """Fires on a fixed cadence. Deliberately not a full cron parser -- an
    interval plus an optional hour window covers essentially every real
    'do this every morning' request without a dependency."""

    name: str
    goal: str
    every_seconds: float
    only_between: tuple[int, int] | None = None   # local hours, inclusive-exclusive
    _last: float = 0.0

    def poll(self) -> Iterable[Activation]:
        now = time.time()
        if now - self._last < self.every_seconds:
            return []
        if self.only_between:
            hour = time.localtime(now).tm_hour
            lo, hi = self.only_between
            inside = lo <= hour < hi if lo <= hi else (hour >= lo or hour < hi)
            if not inside:
                return []
        self._last = now
        return [Activation(source=f"schedule:{self.name}", goal=self.goal, trusted=True)]


@dataclass
class FileWatchTrigger:
    """Polls a directory for changes. Polling rather than inotify/FSEvents on
    purpose: one code path on every platform, and a resident agent can afford
    a stat() sweep every few seconds."""

    name: str
    path: Path
    goal_template: str
    pattern: str = "*"
    settle_seconds: float = 5.0
    _seen: dict[str, float] = field(default_factory=dict)
    _primed: bool = False

    def poll(self) -> Iterable[Activation]:
        if not self.path.is_dir():
            return []
        out: list[Activation] = []
        now = time.time()
        current: dict[str, float] = {}
        for child in self.path.iterdir():
            if not fnmatch.fnmatch(child.name, self.pattern):
                continue
            try:
                mtime = child.stat().st_mtime
            except OSError:
                continue
            current[str(child)] = mtime
            # Wait for the file to stop changing before acting on it -- half a
            # download is worse than no download.
            if now - mtime < self.settle_seconds:
                continue
            if self._primed and self._seen.get(str(child)) != mtime:
                out.append(Activation(
                    source=f"file:{self.name}",
                    goal=self.goal_template.format(path=child),
                    payload={"path": str(child)},
                ))
        self._seen = current
        if not self._primed:
            # First sweep only establishes a baseline; otherwise every existing
            # file in the directory looks brand new.
            self._primed = True
            return []
        return out


@dataclass
class ConditionTrigger:
    """Fires when a predicate over the machine's state becomes true."""

    name: str
    goal: str
    predicate: Callable[[], bool]
    cooldown_seconds: float = 3600
    _last: float = 0.0

    def poll(self) -> Iterable[Activation]:
        now = time.time()
        if now - self._last < self.cooldown_seconds:
            return []
        try:
            fired = bool(self.predicate())
        except Exception:
            return []
        if not fired:
            return []
        self._last = now
        return [Activation(source=f"condition:{self.name}", goal=self.goal, trusted=True)]


def disk_pressure(threshold_pct: float = 92.0, path: str = "/") -> Callable[[], bool]:
    def check() -> bool:
        st = os.statvfs(path)
        used = 100.0 * (1 - st.f_bavail / st.f_blocks) if st.f_blocks else 0.0
        return used >= threshold_pct
    return check
