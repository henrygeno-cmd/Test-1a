"""Tool contract: every action JARVIS can take in the world passes through this."""
from __future__ import annotations

import enum
import functools
import inspect
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Mapping


class Capability(enum.Flag):
    """What a tool is able to touch.

    Capabilities are declared statically by the tool and are the unit the
    policy engine reasons about. A tool may never exercise a capability it
    did not declare -- the registry enforces the declaration at call time.
    """

    NONE = 0
    FS_READ = enum.auto()
    FS_WRITE = enum.auto()
    FS_DELETE = enum.auto()
    PROC_EXEC = enum.auto()
    NET_READ = enum.auto()
    NET_WRITE = enum.auto()
    SYS_CONFIG = enum.auto()      # settings, daemons, packages, drivers
    SECRETS = enum.auto()         # keychain, tokens, credential stores
    COMMS = enum.auto()           # email, chat, SMS -- speaks as the user
    FINANCIAL = enum.auto()       # anything that moves money
    SELF_MODIFY = enum.auto()     # writes to JARVIS's own source tree

    @classmethod
    def parse(cls, spec: str | None) -> "Capability":
        """Parse "FS_READ|PROC_EXEC" from config files."""
        if not spec:
            return cls.NONE
        out = cls.NONE
        for part in spec.replace(",", "|").split("|"):
            part = part.strip().upper()
            if part and part != "NONE":
                out |= cls[part]
        return out

    def names(self) -> list[str]:
        return [c.name for c in Capability if c is not Capability.NONE and c & self]


class Reversibility(enum.IntEnum):
    """How hard it is to take an action back.

    This is the single most important field on a tool. Autonomy is cheap for
    REVERSIBLE work and expensive for IRREVERSIBLE work, and the policy engine
    prices it exactly that way.
    """

    REVERSIBLE = 0      # journal holds enough state to undo it exactly
    SNAPSHOTTED = 1     # undoable only because we snapshot first
    COSTLY = 2          # undoable in principle, expensive/manual in practice
    IRREVERSIBLE = 3    # sent email, deleted cloud object, spent money


@dataclass(frozen=True)
class ToolResult:
    ok: bool
    output: Any = None
    error: str | None = None
    # Opaque payload the journal stores so this action can be rolled back.
    undo: Mapping[str, Any] | None = None
    # Free-form facts worth remembering (paths touched, ids created).
    observations: Mapping[str, Any] = field(default_factory=dict)
    duration_ms: int = 0

    @classmethod
    def failure(cls, error: str) -> "ToolResult":
        return cls(ok=False, error=error)


@dataclass
class ToolSpec:
    name: str
    description: str
    capabilities: Capability
    reversibility: Reversibility
    fn: Callable[..., ToolResult]
    # Rough blast radius hint used for risk scoring; the policy engine
    # refines this with the actual arguments at call time.
    default_risk: int = 1
    # Tools marked unsafe_unattended never run while the user is away,
    # regardless of accumulated trust.
    unsafe_unattended: bool = False

    @property
    def signature(self) -> inspect.Signature:
        return inspect.signature(self.fn)

    def describe(self) -> dict[str, Any]:
        """The JSON-schema-ish blob handed to the planning model."""
        params: dict[str, Any] = {}
        required: list[str] = []
        for pname, p in self.signature.parameters.items():
            if pname == "ctx":
                continue
            ann = p.annotation
            params[pname] = {
                "type": _json_type(ann),
                "description": "",
            }
            if p.default is inspect.Parameter.empty:
                required.append(pname)
        return {
            "name": self.name,
            "description": self.description,
            "capabilities": self.capabilities.names(),
            "reversibility": self.reversibility.name,
            "input_schema": {
                "type": "object",
                "properties": params,
                "required": required,
            },
        }


def _json_type(ann: Any) -> str:
    mapping = {str: "string", int: "integer", float: "number", bool: "boolean",
               list: "array", dict: "object"}
    return mapping.get(ann, "string")


def tool(
    name: str,
    description: str,
    capabilities: Capability,
    reversibility: Reversibility,
    *,
    default_risk: int = 1,
    unsafe_unattended: bool = False,
) -> Callable[[Callable[..., ToolResult]], Callable[..., ToolResult]]:
    """Decorator that tags a function as a JARVIS tool.

    The metadata is attached to the function; `Registry.discover` picks it up.
    """

    def wrap(fn: Callable[..., ToolResult]) -> Callable[..., ToolResult]:
        fn._jarvis_spec = ToolSpec(  # type: ignore[attr-defined]
            name=name,
            description=description,
            capabilities=capabilities,
            reversibility=reversibility,
            fn=fn,
            default_risk=default_risk,
            unsafe_unattended=unsafe_unattended,
        )
        return fn

    return wrap


def timed(fn: Callable[..., ToolResult]) -> Callable[..., ToolResult]:
    """Wrap a tool body so failures become ToolResults instead of exceptions.

    Tools must never raise into the kernel: an unhandled exception in a tool
    would abort the loop before the journal records what happened, which is
    exactly the state we can't recover from.
    """

    @functools.wraps(fn)
    def inner(*a: Any, **kw: Any) -> ToolResult:
        start = time.monotonic()
        try:
            res = fn(*a, **kw)
        except Exception as exc:  # noqa: BLE001 - deliberate catch-all
            res = ToolResult.failure(f"{type(exc).__name__}: {exc}")
        ms = int((time.monotonic() - start) * 1000)
        return ToolResult(ok=res.ok, output=res.output, error=res.error,
                          undo=res.undo, observations=res.observations,
                          duration_ms=ms)

    return inner
