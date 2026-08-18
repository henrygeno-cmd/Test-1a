"""Risk scoring: turn (tool, arguments, context) into a number 0-100."""
from __future__ import annotations

import fnmatch
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping

from jarvis.tools.base import Capability, Reversibility, ToolSpec

# Paths where a mistake is unrecoverable or catastrophic. Touching anything
# under these is an automatic high-risk finding regardless of the tool.
CRITICAL_PATHS = (
    "/System", "/Library/LaunchDaemons", "/etc", "/boot", "/dev", "/usr/bin",
    "~/.ssh", "~/.aws", "~/.config/gcloud", "~/Library/Keychains",
    "~/.gnupg", "~/.password-store",
)

# Shell fragments that are load-bearing enough to warrant a hard look.
DANGEROUS_SHELL = (
    (re.compile(r"\brm\s+(-\w*\s+)*-\w*[rf]", re.I), 45, "recursive/forced delete"),
    (re.compile(r"\bdd\s+.*\bof=/dev/", re.I), 60, "raw device write"),
    (re.compile(r"\bmkfs(\.\w+)?\b", re.I), 60, "filesystem format"),
    (re.compile(r":\(\)\s*\{.*\|.*&.*\}\s*;", re.I), 60, "fork bomb"),
    (re.compile(r"\bchmod\s+(-\w+\s+)*777\b"), 25, "world-writable permissions"),
    (re.compile(r"\bcurl\b[^|]*\|\s*(sudo\s+)?(ba)?sh", re.I), 50, "pipe-to-shell"),
    (re.compile(r"\bwget\b[^|]*\|\s*(sudo\s+)?(ba)?sh", re.I), 50, "pipe-to-shell"),
    (re.compile(r"\bsudo\b"), 30, "privilege escalation"),
    (re.compile(r"\bgit\s+push\b.*(--force|-f)\b", re.I), 30, "force push"),
    (re.compile(r"\bgit\s+reset\s+--hard\b", re.I), 25, "discards working tree"),
    (re.compile(r"\b(shutdown|reboot|halt)\b", re.I), 35, "host power state"),
    (re.compile(r"\b(launchctl|systemctl)\s+(disable|stop|unload)", re.I), 25,
     "disables a system service"),
    (re.compile(r"\bkillall?\s+-9", re.I), 20, "hard process kill"),
    (re.compile(r"\bhistory\s+-c|\bshred\b", re.I), 40, "destroys audit trail"),
)

CAPABILITY_WEIGHT: dict[Capability, int] = {
    Capability.FS_READ: 1,
    Capability.FS_WRITE: 8,
    Capability.FS_DELETE: 22,
    Capability.PROC_EXEC: 15,
    Capability.NET_READ: 3,
    Capability.NET_WRITE: 18,
    Capability.SYS_CONFIG: 30,
    Capability.SECRETS: 45,
    Capability.COMMS: 35,
    Capability.FINANCIAL: 60,
    Capability.SELF_MODIFY: 40,
}

REVERSIBILITY_WEIGHT: dict[Reversibility, int] = {
    Reversibility.REVERSIBLE: 0,
    Reversibility.SNAPSHOTTED: 6,
    Reversibility.COSTLY: 18,
    Reversibility.IRREVERSIBLE: 32,
}


@dataclass
class RiskAssessment:
    score: int
    reasons: list[str] = field(default_factory=list)
    # Concrete filesystem paths this action is expected to mutate. The undo
    # layer snapshots these before the action runs.
    touches: list[str] = field(default_factory=list)
    # Critical or user-protected paths this action would touch. Tracked
    # separately from `score` because trust must never buy past them, however
    # low the arithmetic happens to come out.
    critical: list[str] = field(default_factory=list)

    @property
    def band(self) -> str:
        if self.score >= 70:
            return "critical"
        if self.score >= 40:
            return "high"
        if self.score >= 15:
            return "moderate"
        return "low"


def _expand(p: str) -> str:
    return os.path.abspath(os.path.expanduser(p))


def _is_critical_path(path: str) -> str | None:
    ap = _expand(path)
    for crit in CRITICAL_PATHS:
        cp = _expand(crit)
        if ap == cp or ap.startswith(cp.rstrip("/") + "/"):
            return crit
    return None


def _path_like(value: Any) -> list[str]:
    """Pull anything that smells like a filesystem path out of an argument."""
    out: list[str] = []
    if isinstance(value, (str, Path)):
        s = str(value)
        if s.startswith(("/", "~/", "./", "../")) or (os.sep in s and " " not in s):
            out.append(s)
    elif isinstance(value, (list, tuple)):
        for v in value:
            out.extend(_path_like(v))
    return out


def assess(
    spec: ToolSpec,
    args: Mapping[str, Any],
    *,
    protected_globs: tuple[str, ...] = (),
) -> RiskAssessment:
    """Score an intended action. Higher is more dangerous."""
    score = spec.default_risk
    reasons: list[str] = []
    touches: list[str] = []
    critical: list[str] = []

    for cap, weight in CAPABILITY_WEIGHT.items():
        if spec.capabilities & cap:
            score += weight
            reasons.append(f"capability {cap.name} (+{weight})")

    rw = REVERSIBILITY_WEIGHT[spec.reversibility]
    if rw:
        score += rw
        reasons.append(f"{spec.reversibility.name.lower()} action (+{rw})")

    # Argument-level inspection: the same tool is wildly different in risk
    # depending on what you point it at.
    for key, val in args.items():
        for candidate in _path_like(val):
            touches.append(_expand(candidate))
            crit = _is_critical_path(candidate)
            if crit:
                score += 35
                critical.append(f"{candidate} (critical path {crit})")
                reasons.append(f"{key} targets critical path {crit} (+35)")
            for glob in protected_globs:
                if fnmatch.fnmatch(_expand(candidate), _expand(glob)):
                    score += 30
                    critical.append(f"{candidate} (protected glob {glob})")
                    reasons.append(f"{key} matches protected glob {glob} (+30)")
                    break
            if candidate.strip() in ("/", "~", os.path.expanduser("~")):
                score += 50
                critical.append(f"{candidate} (filesystem/home root)")
                reasons.append(f"{key} targets a filesystem root (+50)")

        if isinstance(val, str) and spec.capabilities & Capability.PROC_EXEC:
            for pattern, weight, label in DANGEROUS_SHELL:
                if pattern.search(val):
                    score += weight
                    reasons.append(f"{label} (+{weight})")

        # A glob or recursive flag multiplies whatever the base action is.
        if isinstance(val, str) and any(t in val for t in ("*", "**")):
            score += 10
            reasons.append(f"{key} contains a wildcard (+10)")
        if key in ("recursive", "force") and val is True:
            score += 12
            reasons.append(f"{key}=True (+12)")

    return RiskAssessment(score=min(score, 100), reasons=reasons,
                          touches=sorted(set(touches)),
                          critical=sorted(set(critical)))
