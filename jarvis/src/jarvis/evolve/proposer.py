"""Turn observed friction into a candidate skill.

Self-improvement here is narrow and concrete: JARVIS does not rewrite its own
reasoning. It notices work it keeps doing by hand, writes a tool that does it
in one step, proves the tool with tests, and asks to install it. That is the
version of "improves itself" that compounds without drifting.
"""
from __future__ import annotations

import json
import re
import textwrap
from dataclasses import dataclass, field
from typing import Any, Mapping, Sequence

from jarvis.kernel.llm import LLM
from jarvis.memory.store import Memory

PROPOSER_SYSTEM = textwrap.dedent("""
You write new tools for JARVIS, a resident assistant on the user's machine.

You will be given evidence of repeated friction from the assistant's own
history. Produce ONE new skill that removes it.

Output exactly two fenced blocks and nothing else:

```python name=skill
# the skill module
```
```python name=test
# pytest tests for the skill
```

Skill module rules:
- Import from jarvis.tools.base only:
      from jarvis.tools.base import Capability, Reversibility, ToolResult, tool
- Expose exactly one function decorated with @tool(name, description,
  capabilities, reversibility).
- Declare the narrowest capabilities that actually work. Over-declaring gets
  the skill rejected; under-declaring gets it killed at runtime.
- Return ToolResult(ok=..., output=..., undo=...). Populate `undo` whenever the
  action changes anything, or the skill cannot be promoted above CONFIRM.
- Pure stdlib. No network calls unless NET_READ/NET_WRITE is declared.
- No subprocess use unless PROC_EXEC is declared.

Test rules:
- Plain pytest, no fixtures beyond tmp_path.
- Cover the happy path, one failure path, and the undo payload.
- Tests must pass with no network and no access to the real home directory.
""").strip()

BLOCK_RE = re.compile(r"```python\s+name=(skill|test)\s*\n(.*?)```", re.S)


@dataclass
class Proposal:
    slug: str
    rationale: str
    skill_code: str
    test_code: str
    evidence: list[dict[str, Any]] = field(default_factory=list)

    def is_wellformed(self) -> tuple[bool, str]:
        if "from jarvis.tools.base import" not in self.skill_code:
            return False, "skill does not import the tool contract"
        if "@tool(" not in self.skill_code:
            return False, "skill declares no @tool entry point"
        if not self.test_code.strip():
            return False, "no tests supplied"
        if "def test_" not in self.test_code:
            return False, "test block contains no test functions"
        return True, "ok"


# Imports a generated skill may not use. Not a sandbox -- a fast, legible
# tripwire that catches the obvious before anything is executed at all.
FORBIDDEN_IMPORTS = ("ctypes", "importlib", "marshal", "pickle", "shutil.rmtree")


def static_screen(code: str) -> list[str]:
    findings = []
    for bad in FORBIDDEN_IMPORTS:
        if re.search(rf"\b{re.escape(bad)}\b", code):
            findings.append(f"uses {bad}")
    if re.search(r"\bexec\s*\(|\beval\s*\(", code):
        findings.append("uses exec/eval")
    if re.search(r"__import__", code):
        findings.append("uses __import__")
    if re.search(r"\bos\.system\b|\bsubprocess\b", code) and "PROC_EXEC" not in code:
        findings.append("spawns processes without declaring PROC_EXEC")
    if re.search(r"\b(requests|urllib|httpx|socket)\b", code) and "NET_" not in code:
        findings.append("touches the network without declaring NET_*")
    if re.search(r"\bos\.remove\b|\bos\.unlink\b|rmtree", code):
        findings.append("deletes directly instead of routing through fs.delete")
    return findings


class Proposer:
    def __init__(self, llm: LLM, memory: Memory) -> None:
        self.llm = llm
        self.memory = memory

    def find_opportunities(self, *, min_count: int = 3) -> list[dict[str, Any]]:
        return self.memory.friction(min_count=min_count)

    def propose(self, opportunity: Mapping[str, Any],
                examples: Sequence[Mapping[str, Any]] = ()) -> Proposal | None:
        evidence = {
            "pattern": opportunity.get("pattern"),
            "occurrences": opportunity.get("count"),
            "type": opportunity.get("type"),
            "hypothesis": opportunity.get("hypothesis"),
            "recent_examples": list(examples)[:10],
        }
        prompt = (
            "Evidence of repeated friction:\n"
            + json.dumps(evidence, indent=2, default=str)
            + "\n\nWrite the skill that removes it."
        )
        resp = self.llm.complete(
            system=PROPOSER_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
            mode="evolve",
            max_tokens=32000,
        )
        blocks = dict((m.group(1), m.group(2)) for m in BLOCK_RE.finditer(resp.text))
        if "skill" not in blocks or "test" not in blocks:
            return None

        slug = self._slugify(opportunity)
        return Proposal(slug=slug,
                        rationale=str(opportunity.get("hypothesis", "")),
                        skill_code=blocks["skill"].strip(),
                        test_code=blocks["test"].strip(),
                        evidence=[dict(evidence)])

    @staticmethod
    def _slugify(opportunity: Mapping[str, Any]) -> str:
        parts = opportunity.get("pattern") or ["skill"]
        raw = "_".join(str(p) for p in parts)
        slug = re.sub(r"[^a-z0-9_]+", "_", raw.lower()).strip("_")
        return (slug or "skill")[:40]
