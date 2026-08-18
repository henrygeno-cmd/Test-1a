"""Configuration and assembly. `build()` wires the whole system together."""
from __future__ import annotations

import os
import tomllib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from jarvis.audit.journal import Journal
from jarvis.audit.undo import SnapshotStore
from jarvis.evolve.evaluator import Evaluator
from jarvis.evolve.promoter import Promoter
from jarvis.evolve.proposer import Proposer
from jarvis.evolve.sandbox import Sandbox
from jarvis.kernel.llm import LLM, build_llm
from jarvis.kernel.loop import Kernel, deny_all
from jarvis.memory.store import Memory
from jarvis.policy.engine import Autonomy, Budget, PolicyEngine
from jarvis.tools.registry import Registry

DEFAULT_AUTONOMY: dict[str, Autonomy] = {
    "read":      Autonomy.NOTIFY,   # reading is cheap and reversible
    "files":     Autonomy.CONFIRM,
    "exec":      Autonomy.CONFIRM,
    "network":   Autonomy.CONFIRM,
    "system":    Autonomy.SUGGEST,
    "comms":     Autonomy.SUGGEST,  # never speaks as the user unprompted
    "secrets":   Autonomy.OBSERVE,
    "financial": Autonomy.OBSERVE,  # requires a deliberate config change
    "self":      Autonomy.SUGGEST,
}

DEFAULT_PROTECTED = (
    "~/Documents/**", "~/.ssh/**", "~/.aws/**", "~/.gnupg/**",
    "~/Library/Keychains/**", "~/.config/**",
)


@dataclass
class Config:
    root: Path
    state_dir: Path
    skills_dir: Path
    protected_globs: tuple[str, ...] = DEFAULT_PROTECTED
    autonomy: dict[str, Autonomy] = field(default_factory=lambda: dict(DEFAULT_AUTONOMY))
    budget: Budget = field(default_factory=Budget)
    allow_self_merge: bool = True
    offline: bool = False
    tick_seconds: float = 5.0

    @classmethod
    def load(cls, path: Path | None = None) -> "Config":
        root = Path(__file__).resolve().parents[2]
        state = Path(os.environ.get("JARVIS_STATE_DIR",
                                    Path.home() / ".jarvis")).expanduser()
        skills = Path(os.environ.get("JARVIS_SKILLS_DIR", root / "skills")).expanduser()
        cfg = cls(root=root, state_dir=state, skills_dir=skills)

        path = path or (root / "config" / "jarvis.toml")
        if path.exists():
            data = tomllib.loads(path.read_text())
            cfg.tick_seconds = float(data.get("tick_seconds", cfg.tick_seconds))
            cfg.allow_self_merge = bool(data.get("allow_self_merge", True))
            cfg.offline = bool(data.get("offline", False))
            if globs := data.get("protected_globs"):
                cfg.protected_globs = tuple(globs)
            for domain, level in (data.get("autonomy") or {}).items():
                try:
                    cfg.autonomy[domain] = Autonomy[str(level).upper()]
                except KeyError:
                    raise ValueError(
                        f"unknown autonomy level {level!r} for domain {domain!r}; "
                        f"expected one of {[a.name for a in Autonomy]}") from None
            b = data.get("budget") or {}
            cfg.budget = Budget(
                actions_per_hour=int(b.get("actions_per_hour", 120)),
                writes_per_hour=int(b.get("writes_per_hour", 60)),
                usd_per_day=float(b.get("usd_per_day", 10.0)),
                max_consecutive_failures=int(b.get("max_consecutive_failures", 4)),
            )
        return cfg


@dataclass
class System:
    config: Config
    registry: Registry
    policy: PolicyEngine
    memory: Memory
    journal: Journal
    snapshots: SnapshotStore
    kernel: Kernel
    proposer: Proposer
    evaluator: Evaluator
    promoter: Promoter
    llm: LLM

    def evolution_cycle(self, *, max_proposals: int = 1) -> list[dict[str, Any]]:
        """One full self-improvement pass: mine -> propose -> prove -> gate."""
        results: list[dict[str, Any]] = []
        for opp in self.proposer.find_opportunities()[:max_proposals]:
            proposal = self.proposer.propose(opp)
            if proposal is None:
                results.append({"opportunity": opp, "error": "no well-formed proposal"})
                continue
            wellformed, why = proposal.is_wellformed()
            if not wellformed:
                results.append({"opportunity": opp, "error": why})
                continue
            report = self.evaluator.evaluate(proposal)
            promo = self.promoter.promote(proposal, report)
            if promo.installed:
                self.registry.discover_dir(self.config.skills_dir)
            results.append({"opportunity": opp, "slug": proposal.slug,
                            "report": report.summary(), "promotion": promo.to_json()})
        return results


def build(*, confirm=deny_all, offline: bool | None = None,
          config: Config | None = None) -> System:
    cfg = config or Config.load()
    if offline is not None:
        cfg.offline = offline
    cfg.state_dir.mkdir(parents=True, exist_ok=True)

    registry = Registry()
    registry.discover_package("jarvis.tools")
    registry.discover_dir(cfg.skills_dir)

    policy = PolicyEngine(
        state_dir=cfg.state_dir,
        default_autonomy=cfg.autonomy,
        protected_globs=cfg.protected_globs,
        budget=cfg.budget,
    )
    memory = Memory(cfg.state_dir / "memory.db")
    journal = Journal(cfg.state_dir / "journal.ndjson")
    snapshots = SnapshotStore(cfg.state_dir / "snapshots")
    llm = build_llm(offline=cfg.offline)

    kernel = Kernel(llm=llm, registry=registry, policy=policy, memory=memory,
                    journal=journal, snapshots=snapshots, confirm=confirm)
    sandbox = Sandbox()
    return System(
        config=cfg, registry=registry, policy=policy, memory=memory,
        journal=journal, snapshots=snapshots, kernel=kernel, llm=llm,
        proposer=Proposer(llm, memory),
        evaluator=Evaluator(sandbox, project_root=cfg.root),
        promoter=Promoter(project_root=cfg.root, skills_dir=cfg.skills_dir,
                          journal=journal, allow_self_merge=cfg.allow_self_merge),
    )
