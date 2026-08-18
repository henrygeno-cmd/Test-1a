# skills/

The only directory JARVIS may write to without human review.

Files here are loaded at startup by `Registry.discover_dir`. A skill that fails
to import is logged and skipped rather than taking the agent down.

Anything JARVIS proposes that falls outside this directory -- or that declares
`SECRETS`, `FINANCIAL`, `COMMS`, `SYS_CONFIG`, `SELF_MODIFY` or `FS_DELETE` --
lands in `proposals/` with a `REVIEW.md` instead, and waits for you.
