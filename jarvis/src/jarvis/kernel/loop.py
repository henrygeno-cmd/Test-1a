"""The agent loop. Every autonomous action in JARVIS flows through run_task().

    goal -> retrieve context -> model proposes tool call
         -> POLICY GATE -> snapshot -> execute -> journal -> verify -> repeat

The gate sits between proposal and execution, not before planning. The model is
free to *think* about anything; what it may *do* is decided by code that the
model cannot edit without human review.
"""
from __future__ import annotations

import json
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable, Mapping, Sequence

from jarvis.audit.journal import Journal
from jarvis.audit.undo import SnapshotStore
from jarvis.kernel.llm import LLM, LLMResponse
from jarvis.memory.store import Episode, Memory
from jarvis.policy.engine import Autonomy, Decision, PolicyEngine, Verdict
from jarvis.tools.base import ToolResult
from jarvis.tools.registry import Registry

SYSTEM_PROMPT = """You are JARVIS, a resident assistant running on the user's own machine.

Operating rules:
- Work in small, verifiable steps. After each tool result, check whether the
  goal is actually met before continuing.
- Prefer reversible actions. If an irreversible action is the only way, say so
  in plain language and expect to be asked to confirm.
- You do not decide your own permissions. A policy layer may refuse or defer a
  call; when it does, adapt or report back -- never try to route around it.
- If a step fails twice the same way, stop and explain rather than retrying.
- When the goal is met, reply with a short plain-text summary and no tool call.
"""


@dataclass
class StepRecord:
    tool: str
    args: Mapping[str, Any]
    decision: Decision | None
    result: ToolResult | None
    snapshot_id: str | None = None


@dataclass
class TaskOutcome:
    task_id: str
    goal: str
    ok: bool
    summary: str
    steps: list[StepRecord] = field(default_factory=list)
    deferred: list[dict[str, Any]] = field(default_factory=list)
    usd: float = 0.0

    @property
    def actions_taken(self) -> int:
        return sum(1 for s in self.steps if s.result is not None)


# A confirmation callback returns True to permit a gated action. The default
# denies: an unattended process that cannot ask must not assume consent.
ConfirmFn = Callable[[str, Decision], bool]


def deny_all(_msg: str, _d: Decision) -> bool:
    return False


class Kernel:
    def __init__(
        self,
        *,
        llm: LLM,
        registry: Registry,
        policy: PolicyEngine,
        memory: Memory,
        journal: Journal,
        snapshots: SnapshotStore,
        confirm: ConfirmFn = deny_all,
        max_steps: int = 24,
    ) -> None:
        self.llm = llm
        self.registry = registry
        self.policy = policy
        self.memory = memory
        self.journal = journal
        self.snapshots = snapshots
        self.confirm = confirm
        self.max_steps = max_steps

    # -- context assembly ------------------------------------------------------
    def _context_block(self, goal: str) -> str:
        """Volatile content. Deliberately assembled *after* the cache
        breakpoint so it never invalidates the cached system+tools prefix."""
        lines = [f"Goal: {goal}", f"Time: {time.strftime('%Y-%m-%d %H:%M:%S %Z')}"]
        hits = self.memory.search(goal, limit=5)
        if hits:
            lines.append("\nPossibly relevant history:")
            for h in hits:
                lines.append(f"  - [{h['source']}] {h['text'][:160]}")
        prefs = self.memory.facts(kind="preference")
        if prefs:
            lines.append("\nStanding preferences:")
            for p in prefs[:8]:
                lines.append(f"  - {p['key']}: {p['value']}")
        return "\n".join(lines)

    # -- the loop --------------------------------------------------------------
    def run_task(self, goal: str, *, user_present: bool = True,
                 mode: str = "plan", task_id: str | None = None) -> TaskOutcome:
        task_id = task_id or uuid.uuid4().hex[:12]
        outcome = TaskOutcome(task_id=task_id, goal=goal, ok=False, summary="")
        self.journal.append(kind="intent", actor="kernel", task_id=task_id,
                            args={"goal": goal, "user_present": user_present})

        tools = self.registry.catalog()
        messages: list[dict[str, Any]] = [
            {"role": "user", "content": self._context_block(goal)}
        ]

        for _step in range(self.max_steps):
            resp = self.llm.complete(system=SYSTEM_PROMPT, messages=messages,
                                     tools=tools, mode=mode)
            outcome.usd += resp.usd

            if resp.refusal:
                outcome.summary = f"Model declined: {resp.refusal}"
                break
            if not resp.tool_calls:
                outcome.ok = True
                outcome.summary = resp.text or "done"
                break

            messages.append({"role": "assistant",
                             "content": resp.raw_content or self._synth_assistant(resp)})
            results_block: list[dict[str, Any]] = []

            for call in resp.tool_calls:
                step, payload = self._execute(call, goal=goal, task_id=task_id,
                                              user_present=user_present)
                outcome.steps.append(step)
                if step.decision and step.decision.verdict is Verdict.DEFER:
                    outcome.deferred.append({"tool": call["name"],
                                             "args": call["input"],
                                             "reason": step.decision.reason})
                # Every tool_use block must get a tool_result back, including
                # refusals -- dropping one desynchronises the conversation.
                results_block.append({
                    "type": "tool_result",
                    "tool_use_id": call["id"],
                    "content": payload,
                    "is_error": not (step.result and step.result.ok),
                })

            messages.append({"role": "user", "content": results_block})
        else:
            outcome.summary = f"hit the {self.max_steps}-step ceiling without finishing"

        self.journal.append(kind="outcome", actor="kernel", task_id=task_id,
                            ok=outcome.ok, args={"summary": outcome.summary[:500],
                                                 "usd": round(outcome.usd, 4)})
        return outcome

    def _synth_assistant(self, resp: LLMResponse) -> list[dict[str, Any]]:
        """Rebuild assistant content when the stub LLM supplied no raw blocks."""
        blocks: list[dict[str, Any]] = []
        if resp.text:
            blocks.append({"type": "text", "text": resp.text})
        for c in resp.tool_calls:
            blocks.append({"type": "tool_use", "id": c["id"],
                           "name": c["name"], "input": c["input"]})
        return blocks

    # -- one gated action ------------------------------------------------------
    def _execute(self, call: Mapping[str, Any], *, goal: str, task_id: str,
                 user_present: bool) -> tuple[StepRecord, str]:
        name, args = call["name"], call["input"]
        spec = self.registry.get(name)
        if spec is None:
            return StepRecord(name, args, None, ToolResult.failure("unknown tool")), \
                f"No such tool: {name}"

        decision = self.policy.evaluate(spec, args, user_present=user_present)
        self.journal.append(kind="decision", actor="kernel", task_id=task_id,
                            tool=name, args=dict(args),
                            decision=decision.to_json())

        if decision.verdict is Verdict.DENY:
            return StepRecord(name, args, decision, None), \
                f"DENIED by policy: {decision.reason}"

        if decision.verdict is Verdict.DEFER:
            return StepRecord(name, args, decision, None), \
                (f"DEFERRED to the next review window: {decision.reason}. "
                 "Continue with work that does not depend on this, or stop.")

        if decision.verdict is Verdict.CONFIRM:
            prompt = (f"{name}({json.dumps(args, default=str)[:300]}) "
                      f"-- risk {decision.risk.score} ({decision.risk.band}); "
                      f"{decision.reason}")
            if not self.confirm(prompt, decision):
                return StepRecord(name, args, decision, None), \
                    "User declined this action."

        # Snapshot before mutating so the undo path exists even if the tool
        # crashes halfway through.
        snap_id = None
        if decision.snapshot_paths:
            snap = self.snapshots.capture(decision.snapshot_paths)
            snap_id = snap.id if snap else None

        result = self.registry.invoke(name, args, ctx=self)
        self.policy.record_outcome(spec, result.ok)

        self.journal.append(kind="outcome", actor="kernel", task_id=task_id,
                            tool=name, args=dict(args), ok=result.ok,
                            error=result.error,
                            undo=dict(result.undo) if result.undo else
                            ({"op": "snapshot", "id": snap_id} if snap_id else None))
        self.memory.record(Episode(ts=time.time(), goal=goal, tool=name, args=args,
                                   ok=result.ok, error=result.error,
                                   duration_ms=result.duration_ms, task_id=task_id))

        payload = (json.dumps(result.output, default=str)[:8000] if result.ok
                   else f"ERROR: {result.error}")
        return StepRecord(name, args, decision, result, snap_id), payload
