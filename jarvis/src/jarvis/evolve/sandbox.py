"""Isolated execution for code JARVIS wrote itself.

Defence in depth, weakest-to-strongest, degrading gracefully by platform:
  1. separate process, temp cwd, scrubbed environment  (always)
  2. CPU / address-space / file-size rlimits           (POSIX)
  3. no network via a stub proxy env + blocked socket  (best effort)
  4. container or seccomp jail                         (when available)

Nothing here is a security boundary against hostile code -- it is a blast
shield against *buggy* code, which is the realistic failure mode for a skill
the agent just wrote. Anything stronger needs a real VM, and the promoter
refuses to auto-merge whenever the strong tier is unavailable.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
import textwrap
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping

PREAMBLE = textwrap.dedent(
    """
    import resource, socket, sys
    resource.setrlimit(resource.RLIMIT_CPU, (%(cpu)d, %(cpu)d))
    resource.setrlimit(resource.RLIMIT_AS, (%(mem)d, %(mem)d))
    resource.setrlimit(resource.RLIMIT_FSIZE, (%(fsize)d, %(fsize)d))
    resource.setrlimit(resource.RLIMIT_NPROC, (64, 64))
    if not %(net)s:
        def _blocked(*a, **k):
            raise OSError("network disabled inside the JARVIS sandbox")
        socket.socket = _blocked
        socket.create_connection = _blocked
    """
).strip()


@dataclass
class SandboxResult:
    ok: bool
    stdout: str
    stderr: str
    returncode: int
    isolation: str          # "container" | "rlimit" | "process"
    timed_out: bool = False


def _has_container_runtime() -> str | None:
    for runtime in ("docker", "podman"):
        if shutil.which(runtime):
            return runtime
    return None


class Sandbox:
    def __init__(self, *, cpu_seconds: int = 30, memory_mb: int = 1024,
                 max_file_mb: int = 64, allow_network: bool = False,
                 prefer_container: bool = True,
                 image: str = "python:3.11-slim") -> None:
        self.cpu_seconds = cpu_seconds
        self.memory_mb = memory_mb
        self.max_file_mb = max_file_mb
        self.allow_network = allow_network
        self.prefer_container = prefer_container
        self.image = image

    @property
    def isolation_tier(self) -> str:
        if self.prefer_container and _has_container_runtime():
            return "container"
        if hasattr(os, "fork") and sys.platform != "win32":
            return "rlimit"
        return "process"

    def run_script(self, script: str, *, extra_files: Mapping[str, str] | None = None,
                   timeout: int = 60) -> SandboxResult:
        with tempfile.TemporaryDirectory(prefix="jarvis-sbx-") as tmp:
            root = Path(tmp)
            for rel, content in (extra_files or {}).items():
                target = root / rel
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(content)
            (root / "__main__.py").write_text(script)

            tier = self.isolation_tier
            if tier == "container":
                return self._run_container(root, timeout)
            return self._run_local(root, timeout, tier)

    # -- tiers -----------------------------------------------------------------
    def _run_local(self, root: Path, timeout: int, tier: str) -> SandboxResult:
        preamble = PREAMBLE % {
            "cpu": self.cpu_seconds,
            "mem": self.memory_mb * 1024 * 1024,
            "fsize": self.max_file_mb * 1024 * 1024,
            "net": "True" if self.allow_network else "False",
        } if tier == "rlimit" else ""
        runner = root / "_runner.py"
        runner.write_text(f"{preamble}\nexec(open('__main__.py').read())\n")

        env = {
            "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
            "HOME": str(root),
            "TMPDIR": str(root),
            "PYTHONPATH": os.environ.get("PYTHONPATH", ""),
            "PYTHONDONTWRITEBYTECODE": "1",
        }
        try:
            cp = subprocess.run([sys.executable, str(runner)], cwd=str(root), env=env,
                                capture_output=True, text=True, timeout=timeout)
        except subprocess.TimeoutExpired as exc:
            return SandboxResult(False, exc.stdout or "", f"timeout after {timeout}s",
                                 -1, tier, timed_out=True)
        return SandboxResult(cp.returncode == 0, cp.stdout[-40000:],
                             cp.stderr[-20000:], cp.returncode, tier)

    def _run_container(self, root: Path, timeout: int) -> SandboxResult:
        runtime = _has_container_runtime() or "docker"
        cmd = [
            runtime, "run", "--rm",
            "--network", "none" if not self.allow_network else "bridge",
            "--memory", f"{self.memory_mb}m",
            "--cpus", "1",
            "--pids-limit", "128",
            "--read-only",
            "--tmpfs", "/tmp:rw,size=64m",
            "-v", f"{root}:/work:ro",
            "-w", "/work",
            self.image, "python", "__main__.py",
        ]
        try:
            cp = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        except subprocess.TimeoutExpired as exc:
            return SandboxResult(False, exc.stdout or "", f"timeout after {timeout}s",
                                 -1, "container", timed_out=True)
        except FileNotFoundError:
            return self._run_local(root, timeout, "rlimit")
        return SandboxResult(cp.returncode == 0, cp.stdout[-40000:],
                             cp.stderr[-20000:], cp.returncode, "container")
