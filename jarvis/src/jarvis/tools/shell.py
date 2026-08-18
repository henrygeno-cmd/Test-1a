"""Process execution. The highest-leverage and highest-risk tool JARVIS has."""
from __future__ import annotations

import os
import shlex
import subprocess
from pathlib import Path

from jarvis.tools.base import Capability, Reversibility, ToolResult, tool

# Commands that are pure reads. Classifying them separately keeps everyday
# inspection cheap instead of forcing a confirmation for `git status`.
READ_ONLY_BINARIES = {
    "ls", "cat", "head", "tail", "grep", "rg", "find", "wc", "stat", "file",
    "du", "df", "ps", "top", "uname", "whoami", "pwd", "which", "echo", "date",
    "env", "printenv", "uptime", "hostname", "sw_vers", "sysctl",
}
GIT_READ_SUBCOMMANDS = {"status", "log", "diff", "show", "branch", "remote", "blame"}


def _is_read_only(command: str) -> bool:
    try:
        parts = shlex.split(command)
    except ValueError:
        return False
    if not parts:
        return False
    # Any shell metacharacter means we can no longer reason about it statically.
    if any(tok in command for tok in ("|", ";", "&&", "||", ">", "<", "`", "$(")):
        return False
    head = os.path.basename(parts[0])
    if head == "git":
        return len(parts) > 1 and parts[1] in GIT_READ_SUBCOMMANDS
    return head in READ_ONLY_BINARIES


@tool("shell.run", "Run a shell command and capture its output.",
      Capability.PROC_EXEC | Capability.FS_WRITE,
      Reversibility.COSTLY, default_risk=6, unsafe_unattended=False)
def shell_run(command: str, cwd: str = ".", timeout: int = 120,
              env: dict | None = None) -> ToolResult:
    workdir = Path(os.path.expanduser(cwd)).resolve()
    if not workdir.is_dir():
        return ToolResult.failure(f"cwd does not exist: {workdir}")
    proc_env = {**os.environ, **(env or {})}
    try:
        cp = subprocess.run(command, shell=True, cwd=str(workdir), env=proc_env,
                            capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return ToolResult.failure(f"timed out after {timeout}s: {command}")
    out = (cp.stdout or "")[-40_000:]
    err = (cp.stderr or "")[-10_000:]
    return ToolResult(
        ok=cp.returncode == 0,
        output={"stdout": out, "stderr": err, "code": cp.returncode},
        error=None if cp.returncode == 0 else f"exit {cp.returncode}: {err[:500]}",
        observations={"cwd": str(workdir), "read_only": _is_read_only(command)},
    )


@tool("shell.query", "Run a known read-only command (ls, git status, ps...).",
      Capability.PROC_EXEC, Reversibility.REVERSIBLE, default_risk=0)
def shell_query(command: str, cwd: str = ".", timeout: int = 30) -> ToolResult:
    """Split out from shell.run so that inspection stays low-friction.

    The allowlist is checked here rather than in the policy engine because it
    is a property of the command string, not of the caller's authority.
    """
    if not _is_read_only(command):
        return ToolResult.failure(
            "not on the read-only allowlist; use shell.run (which requires approval)")
    return shell_run(command=command, cwd=cwd, timeout=timeout)
