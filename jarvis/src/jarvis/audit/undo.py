"""Reversibility: snapshot before mutating, restore on demand.

Copy-on-write where the filesystem offers it (APFS/btrfs/ZFS), plain file
copies otherwise. The point is that an autonomous agent's mistakes should cost
minutes, not days -- which is only true if the pre-state still exists.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Mapping


@dataclass
class Snapshot:
    id: str
    ts: float
    root: Path
    entries: dict[str, str]   # original path -> stored copy ("" == did not exist)

    def to_json(self) -> dict[str, Any]:
        return {"id": self.id, "ts": self.ts, "root": str(self.root),
                "entries": self.entries}


class SnapshotStore:
    def __init__(self, root: Path, *, max_bytes: int = 2 << 30) -> None:
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)
        self.max_bytes = max_bytes

    # -- native CoW ------------------------------------------------------------
    @staticmethod
    def _try_clone(src: Path, dst: Path) -> bool:
        """Use a filesystem-level clone when available -- near-free and instant."""
        try:
            if hasattr(os, "clonefile"):          # macOS/APFS via os module
                os.clonefile(str(src), str(dst))  # type: ignore[attr-defined]
                return True
        except Exception:
            pass
        for cmd in (["cp", "-c", str(src), str(dst)],        # APFS
                    ["cp", "--reflink=always", str(src), str(dst)]):  # btrfs/XFS
            try:
                if subprocess.run(cmd, capture_output=True, timeout=30).returncode == 0:
                    return True
            except Exception:
                continue
        return False

    def capture(self, paths: Iterable[str]) -> Snapshot | None:
        """Snapshot the given paths. Returns None if there was nothing to save."""
        paths = [p for p in dict.fromkeys(paths)]
        if not paths:
            return None
        snap_id = f"{int(time.time())}-{uuid.uuid4().hex[:6]}"
        base = self.root / snap_id
        entries: dict[str, str] = {}

        for p in paths:
            src = Path(p)
            if not src.exists():
                # Record absence so undo can delete something we created.
                entries[str(src)] = ""
                continue
            if src.is_dir():
                if self._dir_size(src) > self.max_bytes:
                    entries[str(src)] = "__TOO_LARGE__"
                    continue
                dst = base / "d" / src.name
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copytree(src, dst, symlinks=True, dirs_exist_ok=True)
            else:
                if src.stat().st_size > self.max_bytes:
                    entries[str(src)] = "__TOO_LARGE__"
                    continue
                dst = base / "f" / f"{uuid.uuid4().hex[:8]}_{src.name}"
                dst.parent.mkdir(parents=True, exist_ok=True)
                if not self._try_clone(src, dst):
                    shutil.copy2(src, dst)
            entries[str(src)] = str(dst)

        if not entries:
            return None
        snap = Snapshot(id=snap_id, ts=time.time(), root=base, entries=entries)
        base.mkdir(parents=True, exist_ok=True)
        (base / "manifest.json").write_text(json.dumps(snap.to_json(), indent=2))
        return snap

    @staticmethod
    def _dir_size(path: Path) -> int:
        total = 0
        for dirpath, _, files in os.walk(path):
            for f in files:
                fp = Path(dirpath) / f
                try:
                    total += fp.stat().st_size
                except OSError:
                    pass
                if total > (4 << 30):
                    return total
        return total

    def restore(self, snapshot_id: str) -> list[str]:
        """Put the world back. Returns the paths restored."""
        manifest = self.root / snapshot_id / "manifest.json"
        if not manifest.exists():
            raise FileNotFoundError(f"no snapshot {snapshot_id}")
        data = json.loads(manifest.read_text())
        restored: list[str] = []
        for original, stored in data["entries"].items():
            orig = Path(original)
            if stored == "":
                # It did not exist before; remove whatever is there now.
                if orig.is_dir():
                    shutil.rmtree(orig, ignore_errors=True)
                elif orig.exists():
                    orig.unlink()
                restored.append(original)
                continue
            if stored == "__TOO_LARGE__":
                continue
            src = Path(stored)
            if not src.exists():
                continue
            orig.parent.mkdir(parents=True, exist_ok=True)
            if src.is_dir():
                shutil.rmtree(orig, ignore_errors=True)
                shutil.copytree(src, orig, symlinks=True)
            else:
                shutil.copy2(src, orig)
            restored.append(original)
        return restored

    def prune(self, keep_days: float = 7.0) -> int:
        cutoff = time.time() - keep_days * 86400
        removed = 0
        for child in self.root.iterdir():
            if not child.is_dir():
                continue
            man = child / "manifest.json"
            ts = json.loads(man.read_text()).get("ts", 0) if man.exists() else 0
            if ts < cutoff:
                shutil.rmtree(child, ignore_errors=True)
                removed += 1
        return removed


def trash(path: str) -> Mapping[str, Any]:
    """Never unlink. Move to a dated trash so 'delete' is always reversible."""
    src = Path(path)
    tdir = Path.home() / ".jarvis" / "trash" / time.strftime("%Y-%m-%d")
    tdir.mkdir(parents=True, exist_ok=True)
    dst = tdir / f"{uuid.uuid4().hex[:8]}_{src.name}"
    shutil.move(str(src), str(dst))
    return {"op": "trash", "from": str(src), "to": str(dst)}
