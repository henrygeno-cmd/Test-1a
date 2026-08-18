"""The gate. Nothing reaches the operating system without a verdict from here.

Design stance: JARVIS is *granted* full access to the machine. What is
rationed is not access but **autonomy** -- how much it may do without a human
in the loop. Autonomy is per-domain, earned from a measured track record, and
lost fast. That is the difference between a useful assistant and a liability.
"""
from __future__ import annotations

import enum
import fnmatch
import json
import os
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Mapping

from jarvis.policy.risk import RiskAssessment, assess
from jarvis.tools.base import Capability, Reversibility, ToolSpec


class Autonomy(enum.IntEnum):
    """The autonomy ladder, applied per domain -- never globally."""

    OBSERVE = 0     # may read and report, may not change anything
    SUGGEST = 1     # drafts the action, human executes
    CONFIRM = 2     # executes, but only after an explicit yes
    NOTIFY = 3      # executes immediately, tells the user after
    SILENT = 4      # executes, logs only; no interruption


class Verdict(enum.Enum):
    ALLOW = "allow"
    CONFIRM = "confirm"          # needs a synchronous human yes
    DEFER = "defer"              # queued for the next review window
    DENY = "deny"


@dataclass
class Decision:
    verdict: Verdict
    reason: str
    risk: RiskAssessment
    autonomy: Autonomy
    domain: str
    # Set when the action must be snapshotted before running.
    snapshot_paths: list[str] = field(default_factory=list)

    def to_json(self) -> dict[str, Any]:
        return {
            "verdict": self.verdict.value,
            "reason": self.reason,
            "risk_score": self.risk.score,
            "risk_band": self.risk.band,
            "risk_reasons": self.risk.reasons,
            "autonomy": self.autonomy.name,
            "domain": self.domain,
            "snapshot_paths": self.snapshot_paths,
        }


@dataclass
class Budget:
    """Hard resource ceilings. Exhausting one halts autonomous execution.

    An agent that has gone wrong usually goes wrong *fast* and *repetitively*.
    Rate ceilings turn a runaway loop into a bounded incident.
    """

    actions_per_hour: int = 120
    writes_per_hour: int = 60
    usd_per_day: float = 10.0
    max_consecutive_failures: int = 4

    _actions: list[float] = field(default_factory=list)
    _writes: list[float] = field(default_factory=list)
    _spend: list[tuple[float, float]] = field(default_factory=list)
    consecutive_failures: int = 0

    def _prune(self, now: float) -> None:
        self._actions = [t for t in self._actions if now - t < 3600]
        self._writes = [t for t in self._writes if now - t < 3600]
        self._spend = [(t, c) for t, c in self._spend if now - t < 86400]

    def check(self, *, is_write: bool) -> str | None:
        now = time.time()
        self._prune(now)
        if len(self._actions) >= self.actions_per_hour:
            return f"action budget exhausted ({self.actions_per_hour}/hr)"
        if is_write and len(self._writes) >= self.writes_per_hour:
            return f"write budget exhausted ({self.writes_per_hour}/hr)"
        if sum(c for _, c in self._spend) >= self.usd_per_day:
            return f"spend budget exhausted (${self.usd_per_day}/day)"
        if self.consecutive_failures >= self.max_consecutive_failures:
            return (f"halted after {self.consecutive_failures} consecutive "
                    f"failures -- needs a human look")
        return None

    def record(self, *, is_write: bool, ok: bool, usd: float = 0.0) -> None:
        now = time.time()
        self._actions.append(now)
        if is_write:
            self._writes.append(now)
        if usd:
            self._spend.append((now, usd))
        self.consecutive_failures = 0 if ok else self.consecutive_failures + 1


@dataclass
class TrustLedger:
    """Per-domain track record driving the autonomy ratchet.

    Asymmetric on purpose: trust accrues slowly on success and collapses on
    failure. Ten good outcomes should not buy forgiveness for one bad one.
    """

    path: Path
    grants: dict[str, int] = field(default_factory=dict)     # domain -> Autonomy
    ceilings: dict[str, int] = field(default_factory=dict)   # domain -> max
    successes: dict[str, int] = field(default_factory=dict)
    failures: dict[str, int] = field(default_factory=dict)

    PROMOTE_AFTER = 20   # clean runs needed to earn one rung
    DEMOTE_AFTER = 1     # failures needed to lose one rung

    def load(self) -> "TrustLedger":
        if self.path.exists():
            data = json.loads(self.path.read_text())
            self.grants = data.get("grants", {})
            self.successes = data.get("successes", {})
            self.failures = data.get("failures", {})
        return self

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps({
            "grants": self.grants,
            "successes": self.successes,
            "failures": self.failures,
        }, indent=2))

    def level(self, domain: str, default: Autonomy) -> Autonomy:
        raw = self.grants.get(domain)
        lvl = Autonomy(raw) if raw is not None else default
        ceiling = self.ceilings.get(domain)
        if ceiling is not None:
            lvl = Autonomy(min(int(lvl), ceiling))
        return lvl

    def record(self, domain: str, ok: bool, default: Autonomy) -> Autonomy:
        cur = self.level(domain, default)
        if ok:
            self.successes[domain] = self.successes.get(domain, 0) + 1
            if (self.successes[domain] % self.PROMOTE_AFTER == 0
                    and cur < Autonomy.NOTIFY):
                # Note the cap: the ratchet never promotes to SILENT on its
                # own. Fully unattended execution is a human decision.
                cur = Autonomy(int(cur) + 1)
                self.grants[domain] = int(cur)
        else:
            self.failures[domain] = self.failures.get(domain, 0) + 1
            self.successes[domain] = 0
            if cur > Autonomy.OBSERVE:
                cur = Autonomy(int(cur) - 1)
                self.grants[domain] = int(cur)
        self.save()
        return cur


# Source files JARVIS may propose changes to but may never self-merge.
# Everything that enforces containment lives behind human review, forever.
PROTECTED_SOURCE = (
    "*/jarvis/policy/*",
    "*/jarvis/audit/*",
    "*/jarvis/evolve/promoter.py",
    "*/config/policy.yaml",
)


class PolicyEngine:
    def __init__(
        self,
        *,
        state_dir: Path,
        default_autonomy: Mapping[str, Autonomy] | None = None,
        protected_globs: tuple[str, ...] = (),
        budget: Budget | None = None,
        halt_file: Path | None = None,
    ) -> None:
        self.state_dir = state_dir
        self.trust = TrustLedger(state_dir / "trust.json").load()
        self.budget = budget or Budget()
        self.protected_globs = protected_globs
        self.halt_file = halt_file or (state_dir / "HALT")
        self.default_autonomy: dict[str, Autonomy] = dict(default_autonomy or {})

    # -- domain classification -------------------------------------------------
    @staticmethod
    def domain_of(spec: ToolSpec) -> str:
        """Group tools into trust domains. Trust in one domain says nothing
        about another: being good at tidying Downloads earns no credit toward
        sending mail."""
        c = spec.capabilities
        if c & Capability.FINANCIAL:
            return "financial"
        if c & Capability.SECRETS:
            return "secrets"
        if c & Capability.COMMS:
            return "comms"
        if c & Capability.SELF_MODIFY:
            return "self"
        if c & Capability.SYS_CONFIG:
            return "system"
        if c & (Capability.FS_DELETE | Capability.FS_WRITE):
            return "files"
        if c & Capability.PROC_EXEC:
            return "exec"
        if c & Capability.NET_WRITE:
            return "network"
        return "read"

    def _default_for(self, domain: str) -> Autonomy:
        # Absent explicit configuration, assume the least autonomy that is
        # still useful. New domains start at CONFIRM, never higher.
        return self.default_autonomy.get(domain, Autonomy.CONFIRM)

    # -- the decision ----------------------------------------------------------
    def evaluate(
        self,
        spec: ToolSpec,
        args: Mapping[str, Any],
        *,
        user_present: bool,
        explicitly_requested: bool = False,
    ) -> Decision:
        domain = self.domain_of(spec)
        risk = assess(spec, args, protected_globs=self.protected_globs)
        autonomy = self.trust.level(domain, self._default_for(domain))

        def decide(v: Verdict, why: str) -> Decision:
            snaps = [p for p in risk.touches
                     if spec.reversibility <= Reversibility.SNAPSHOTTED
                     and os.path.exists(p)]
            return Decision(verdict=v, reason=why, risk=risk,
                            autonomy=autonomy, domain=domain,
                            snapshot_paths=snaps)

        # 1. The kill switch outranks everything, including the user's own
        #    standing grants. One file, checked on every action.
        if self.halt_file.exists():
            return decide(Verdict.DENY, f"halt file present at {self.halt_file}")

        # 2. Budgets.
        is_write = bool(spec.capabilities & (
            Capability.FS_WRITE | Capability.FS_DELETE | Capability.NET_WRITE
            | Capability.SYS_CONFIG | Capability.COMMS | Capability.FINANCIAL))
        if (over := self.budget.check(is_write=is_write)) is not None:
            return decide(Verdict.DENY, over)

        # 3. Self-modification of the containment machinery is never
        #    self-approved. This is the invariant the whole design rests on.
        for path in risk.touches:
            if any(fnmatch.fnmatch(path, g) for g in PROTECTED_SOURCE):
                return decide(
                    Verdict.CONFIRM,
                    f"{path} is containment-critical source; human review required",
                )

        # 4. Critical and user-protected paths always stop for a human, at
        #    every autonomy level including SILENT. SILENT means "do not
        #    interrupt me for routine work" -- it is not a blank cheque, and a
        #    domain that has earned trust tidying Downloads has earned nothing
        #    with respect to ~/.ssh.
        if risk.critical:
            return decide(Verdict.CONFIRM,
                          "touches protected or critical paths: "
                          + "; ".join(risk.critical[:3]))

        # 5. Critical risk is always a stop, however trusted the domain.
        if risk.band == "critical":
            return decide(Verdict.CONFIRM,
                          f"risk {risk.score} is critical: " + "; ".join(risk.reasons[:3]))

        # 6. A direct instruction raises the floor to CONFIRM but never
        #    bypasses the checks above -- asking for a thing is not the same
        #    as authorising every way of achieving it.
        effective = max(autonomy, Autonomy.CONFIRM) if explicitly_requested else autonomy

        # 7. Unattended execution is strictly narrower than attended.
        if not user_present:
            if spec.unsafe_unattended:
                return decide(Verdict.DEFER,
                              f"{spec.name} is marked unsafe while unattended")
            if spec.reversibility >= Reversibility.COSTLY:
                return decide(Verdict.DEFER,
                              f"{spec.reversibility.name.lower()} action deferred "
                              "to the next review window")
            if risk.band == "high":
                return decide(Verdict.DEFER,
                              f"risk {risk.score} too high to run unattended")
            if effective < Autonomy.NOTIFY:
                return decide(Verdict.DEFER,
                              f"{domain} autonomy is {effective.name}; "
                              "no human available to confirm")
            return decide(Verdict.ALLOW, f"{domain} @ {effective.name}, risk {risk.score}")

        # 8. Attended path.
        if effective <= Autonomy.SUGGEST:
            return decide(Verdict.CONFIRM,
                          f"{domain} autonomy is {effective.name}")
        if effective == Autonomy.CONFIRM:
            if risk.band == "low" and spec.reversibility == Reversibility.REVERSIBLE:
                return decide(Verdict.ALLOW, "low-risk reversible action auto-approved")
            return decide(Verdict.CONFIRM, f"{domain} requires confirmation at risk {risk.score}")
        if risk.band == "high":
            return decide(Verdict.CONFIRM,
                          f"risk {risk.score} is high; confirmation required even "
                          f"at {effective.name}")
        return decide(Verdict.ALLOW, f"{domain} @ {effective.name}, risk {risk.score}")

    def record_outcome(self, spec: ToolSpec, ok: bool, usd: float = 0.0) -> None:
        domain = self.domain_of(spec)
        is_write = bool(spec.capabilities & (
            Capability.FS_WRITE | Capability.FS_DELETE | Capability.NET_WRITE
            | Capability.SYS_CONFIG | Capability.COMMS | Capability.FINANCIAL))
        self.budget.record(is_write=is_write, ok=ok, usd=usd)
        self.trust.record(domain, ok, self._default_for(domain))

    def halt(self, reason: str = "manual") -> None:
        self.halt_file.parent.mkdir(parents=True, exist_ok=True)
        self.halt_file.write_text(f"{time.time()} {reason}\n")

    def resume(self) -> None:
        self.halt_file.unlink(missing_ok=True)
        self.budget.consecutive_failures = 0
