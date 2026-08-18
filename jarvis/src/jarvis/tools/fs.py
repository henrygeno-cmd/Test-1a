"""Filesystem tools. Deletes go to trash; writes journal their prior contents."""
from __future__ import annotations

import fnmatch
import os
import shutil
from pathlib import Path

from jarvis.audit.undo import trash
from jarvis.tools.base import Capability, Reversibility, ToolResult, tool

MAX_READ = 400_000


def _p(path: str) -> Path:
    return Path(os.path.expanduser(path)).resolve()


@tool("fs.read", "Read a UTF-8 text file.",
      Capability.FS_READ, Reversibility.REVERSIBLE)
def fs_read(path: str, max_bytes: int = MAX_READ) -> ToolResult:
    p = _p(path)
    if not p.exists():
        return ToolResult.failure(f"no such file: {p}")
    if p.is_dir():
        return ToolResult.failure(f"{p} is a directory; use fs.list")
    data = p.read_bytes()[:max_bytes]
    return ToolResult(ok=True, output=data.decode("utf-8", errors="replace"),
                      observations={"path": str(p), "bytes": len(data)})


@tool("fs.list", "List a directory, optionally filtered by a glob pattern.",
      Capability.FS_READ, Reversibility.REVERSIBLE)
def fs_list(path: str = ".", pattern: str = "*", recursive: bool = False) -> ToolResult:
    p = _p(path)
    if not p.is_dir():
        return ToolResult.failure(f"not a directory: {p}")
    it = p.rglob(pattern) if recursive else p.glob(pattern)
    rows = []
    for child in sorted(it)[:2000]:
        try:
            st = child.stat()
        except OSError:
            continue
        rows.append({"path": str(child), "dir": child.is_dir(),
                     "bytes": st.st_size, "mtime": st.st_mtime})
    return ToolResult(ok=True, output=rows, observations={"count": len(rows)})


@tool("fs.write", "Create or overwrite a text file.",
      Capability.FS_WRITE, Reversibility.SNAPSHOTTED, default_risk=3)
def fs_write(path: str, content: str, create_parents: bool = True) -> ToolResult:
    p = _p(path)
    previous = p.read_text(encoding="utf-8", errors="replace") if p.is_file() else None
    if create_parents:
        p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    return ToolResult(
        ok=True, output=f"wrote {len(content)} chars to {p}",
        # The undo payload is the whole point: restoring is a pure function
        # of what we captured here, with no need to re-derive intent.
        undo={"op": "restore_text", "path": str(p), "previous": previous},
        observations={"path": str(p), "created": previous is None},
    )


@tool("fs.move", "Move or rename a file or directory.",
      Capability.FS_WRITE, Reversibility.REVERSIBLE, default_risk=4)
def fs_move(src: str, dst: str) -> ToolResult:
    s, d = _p(src), _p(dst)
    if not s.exists():
        return ToolResult.failure(f"no such path: {s}")
    if d.exists():
        return ToolResult.failure(f"destination exists: {d}")
    d.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(s), str(d))
    return ToolResult(ok=True, output=f"{s} -> {d}",
                      undo={"op": "move", "from": str(d), "to": str(s)})


@tool("fs.delete", "Move a path to JARVIS's trash. Never unlinks directly.",
      Capability.FS_DELETE, Reversibility.REVERSIBLE, default_risk=8)
def fs_delete(path: str) -> ToolResult:
    p = _p(path)
    if not p.exists():
        return ToolResult.failure(f"no such path: {p}")
    if str(p) in ("/", str(Path.home())):
        return ToolResult.failure("refusing to delete a filesystem or home root")
    record = trash(str(p))
    return ToolResult(ok=True, output=f"trashed {p}",
                      undo={"op": "move", "from": record["to"], "to": record["from"]},
                      observations=dict(record))


@tool("fs.search", "Search file contents under a directory for a substring.",
      Capability.FS_READ, Reversibility.REVERSIBLE)
def fs_search(root: str, needle: str, glob: str = "*", limit: int = 200) -> ToolResult:
    base = _p(root)
    hits = []
    for path in base.rglob(glob):
        if len(hits) >= limit:
            break
        if not path.is_file() or path.stat().st_size > 5_000_000:
            continue
        if any(part in {".git", "node_modules", "__pycache__", ".venv"}
               for part in path.parts):
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for i, line in enumerate(text.splitlines(), 1):
            if needle in line:
                hits.append({"path": str(path), "line": i, "text": line.strip()[:200]})
                break
    return ToolResult(ok=True, output=hits, observations={"hits": len(hits)})
