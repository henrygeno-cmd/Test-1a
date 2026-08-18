"""Tool discovery and the single chokepoint through which tools are invoked."""
from __future__ import annotations

import importlib
import importlib.util
import pkgutil
import sys
from pathlib import Path
from typing import Any, Iterator, Mapping

from jarvis.tools.base import Capability, ToolResult, ToolSpec, timed


class Registry:
    def __init__(self) -> None:
        self._tools: dict[str, ToolSpec] = {}

    def register(self, spec: ToolSpec, *, overwrite: bool = False) -> None:
        if spec.name in self._tools and not overwrite:
            raise ValueError(f"duplicate tool name: {spec.name}")
        if not getattr(spec.fn, "_jarvis_timed", False):
            wrapped = timed(spec.fn)
            wrapped._jarvis_timed = True  # type: ignore[attr-defined]
            spec.fn = wrapped
        self._tools[spec.name] = spec

    def get(self, name: str) -> ToolSpec | None:
        return self._tools.get(name)

    def __contains__(self, name: object) -> bool:
        return name in self._tools

    def __iter__(self) -> Iterator[ToolSpec]:
        return iter(self._tools.values())

    def __len__(self) -> int:
        return len(self._tools)

    def catalog(self, *, allow: Capability | None = None) -> list[dict[str, Any]]:
        """Tool descriptions for the planner, optionally filtered by capability."""
        out = []
        for spec in self._tools.values():
            if allow is not None and (spec.capabilities & ~allow):
                continue
            out.append(spec.describe())
        return sorted(out, key=lambda d: d["name"])

    # -- discovery -------------------------------------------------------------
    def discover_package(self, package: str) -> int:
        found = 0
        mod = importlib.import_module(package)
        for _, name, _ in pkgutil.iter_modules(mod.__path__):
            sub = importlib.import_module(f"{package}.{name}")
            found += self._harvest(sub)
        return found

    def discover_dir(self, directory: Path, *, overwrite: bool = True) -> int:
        """Load skills from a plain directory -- this is where evolved skills land."""
        found = 0
        if not directory.exists():
            return 0
        for py in sorted(directory.glob("*.py")):
            if py.name.startswith("_"):
                continue
            spec = importlib.util.spec_from_file_location(f"jarvis_skill_{py.stem}", py)
            if not spec or not spec.loader:
                continue
            module = importlib.util.module_from_spec(spec)
            sys.modules[spec.name] = module
            try:
                spec.loader.exec_module(module)
            except Exception as exc:  # a broken skill must not take the agent down
                print(f"[registry] skill {py.name} failed to load: {exc}", file=sys.stderr)
                continue
            found += self._harvest(module, overwrite=overwrite)
        return found

    def _harvest(self, module: Any, *, overwrite: bool = False) -> int:
        n = 0
        for attr in vars(module).values():
            spec = getattr(attr, "_jarvis_spec", None)
            if isinstance(spec, ToolSpec):
                if spec.name in self._tools and not overwrite:
                    continue
                self.register(spec, overwrite=True)
                n += 1
        return n

    # -- invocation ------------------------------------------------------------
    def invoke(self, name: str, args: Mapping[str, Any], ctx: Any = None) -> ToolResult:
        """Call a tool. The kernel is the only caller; the policy gate runs first.

        Arguments are filtered against the declared signature so a hallucinated
        keyword produces a clean error rather than a TypeError deep in a tool.
        """
        spec = self._tools.get(name)
        if spec is None:
            return ToolResult.failure(f"unknown tool: {name}")
        params = spec.signature.parameters
        if not any(p.kind is p.VAR_KEYWORD for p in params.values()):
            unknown = [k for k in args if k not in params]
            if unknown:
                return ToolResult.failure(
                    f"{name} got unexpected arguments: {', '.join(sorted(unknown))}")
        missing = [
            n for n, p in params.items()
            if n != "ctx" and p.default is p.empty
            and p.kind not in (p.VAR_POSITIONAL, p.VAR_KEYWORD) and n not in args
        ]
        if missing:
            return ToolResult.failure(f"{name} missing arguments: {', '.join(missing)}")
        call_args = dict(args)
        if "ctx" in params:
            call_args["ctx"] = ctx
        return spec.fn(**call_args)
