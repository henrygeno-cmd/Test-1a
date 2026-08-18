"""Model access for the kernel.

Two implementations behind one Protocol:
  ClaudeLLM   -- the real thing, via the Anthropic SDK
  ScriptedLLM -- a deterministic stub so the kernel, policy gate and evolution
                 loop are all testable with no API key and no network

Prompt-cache discipline matters more here than in a chat app: a resident agent
issues thousands of requests a day against a nearly identical prefix. The
request is assembled strictly as tools -> system -> messages, with the tool
catalog sorted and the system prompt frozen. Everything volatile (clock,
current goal, retrieved memories) goes *after* the last cache breakpoint.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any, Iterable, Protocol, Sequence

MODEL = "claude-opus-5"

# Effort is the main cost/quality dial for a resident agent. Routine chores run
# cheap; planning and self-modification get the full budget.
EFFORT_BY_MODE = {
    "reflex": "low",       # single obvious tool call
    "routine": "medium",   # everyday multi-step chores
    "plan": "high",        # decomposing a real task
    "evolve": "xhigh",     # writing code that becomes part of JARVIS
}


@dataclass
class LLMResponse:
    text: str
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    stop_reason: str = "end_turn"
    raw_content: Any = None
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_tokens: int = 0
    refusal: str | None = None

    @property
    def usd(self) -> float:
        # claude-opus-5: $5/MTok in, $25/MTok out; cached reads bill at ~0.1x.
        billed_in = max(self.input_tokens - self.cache_read_tokens, 0)
        return (billed_in * 5.0 + self.cache_read_tokens * 0.5
                + self.output_tokens * 25.0) / 1_000_000


class LLM(Protocol):
    def complete(
        self,
        *,
        system: str,
        messages: Sequence[dict[str, Any]],
        tools: Sequence[dict[str, Any]] = (),
        mode: str = "routine",
        max_tokens: int = 16000,
    ) -> LLMResponse: ...


class ClaudeLLM:
    def __init__(self, model: str = MODEL, *, api_key: str | None = None,
                 use_fallbacks: bool = True) -> None:
        import anthropic  # imported lazily so the stub path needs no dependency

        self._anthropic = anthropic
        self.client = anthropic.Anthropic(api_key=api_key) if api_key else anthropic.Anthropic()
        self.model = model
        self.use_fallbacks = use_fallbacks

    def complete(
        self,
        *,
        system: str,
        messages: Sequence[dict[str, Any]],
        tools: Sequence[dict[str, Any]] = (),
        mode: str = "routine",
        max_tokens: int = 16000,
    ) -> LLMResponse:
        # The cache breakpoint sits at the end of the system prompt, so the
        # frozen instructions plus the (sorted) tool schemas form one stable
        # prefix that survives across every request in a session.
        system_blocks = [{
            "type": "text",
            "text": system,
            "cache_control": {"type": "ephemeral", "ttl": "1h"},
        }]
        kwargs: dict[str, Any] = {
            "model": self.model,
            "max_tokens": max_tokens,
            "system": system_blocks,
            "messages": list(messages),
            "thinking": {"type": "adaptive"},
            "output_config": {"effort": EFFORT_BY_MODE.get(mode, "high")},
        }
        if tools:
            kwargs["tools"] = list(tools)

        try:
            if self.use_fallbacks:
                # A policy refusal mid-run would otherwise strand an autonomous
                # task with no output; server-side fallback keeps it moving.
                with self.client.beta.messages.stream(
                    betas=["server-side-fallback-2026-07-01"],
                    fallbacks="default",
                    **kwargs,
                ) as stream:
                    msg = stream.get_final_message()
            else:
                with self.client.messages.stream(**kwargs) as stream:
                    msg = stream.get_final_message()
        except self._anthropic.APIStatusError as exc:
            if self.use_fallbacks and exc.status_code == 400:
                # Gateway without the fallback beta: retry plainly rather than
                # failing the task outright.
                self.use_fallbacks = False
                return self.complete(system=system, messages=messages, tools=tools,
                                     mode=mode, max_tokens=max_tokens)
            raise

        return self._to_response(msg)

    def _to_response(self, msg: Any) -> LLMResponse:
        text_parts: list[str] = []
        calls: list[dict[str, Any]] = []
        for block in msg.content:
            if block.type == "text":
                text_parts.append(block.text)
            elif block.type == "tool_use":
                # Inputs arrive as parsed JSON; never string-match on them.
                calls.append({"id": block.id, "name": block.name,
                              "input": dict(block.input)})
        usage = msg.usage
        refusal = None
        if msg.stop_reason == "refusal":
            details = getattr(msg, "stop_details", None)
            refusal = getattr(details, "explanation", None) or "declined"
        return LLMResponse(
            text="\n".join(text_parts).strip(),
            tool_calls=calls,
            stop_reason=msg.stop_reason,
            raw_content=msg.content,
            input_tokens=getattr(usage, "input_tokens", 0) or 0,
            output_tokens=getattr(usage, "output_tokens", 0) or 0,
            cache_read_tokens=getattr(usage, "cache_read_input_tokens", 0) or 0,
            refusal=refusal,
        )


class ScriptedLLM:
    """Replays a fixed list of responses so the kernel, policy gate and
    evolution loop can be exercised deterministically with no API key."""

    def __init__(self, script: Iterable[LLMResponse]) -> None:
        self.script = list(script)
        self.calls: list[dict[str, Any]] = []
        self._i = 0

    def complete(self, *, system: str, messages: Sequence[dict[str, Any]],
                 tools: Sequence[dict[str, Any]] = (), mode: str = "routine",
                 max_tokens: int = 16000) -> LLMResponse:
        self.calls.append({"system": system, "messages": list(messages),
                           "tools": list(tools), "mode": mode})
        if self._i >= len(self.script):
            return LLMResponse(text="done", stop_reason="end_turn")
        res = self.script[self._i]
        self._i += 1
        return res


def build_llm(*, offline: bool = False) -> LLM:
    if offline or not (os.environ.get("ANTHROPIC_API_KEY")
                       or os.environ.get("ANTHROPIC_AUTH_TOKEN")):
        return ScriptedLLM([])
    return ClaudeLLM()
