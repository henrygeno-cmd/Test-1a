# JARVIS

A resident assistant that runs on your own machine, has real access to it,
works while you're away, and writes its own new skills over time.

**[DESIGN.md](DESIGN.md) is the actual document** — the architecture and the
reasoning behind it. This file is just how to run it.

## The one-paragraph version

JARVIS gets full access to your machine on day one. What it may do *without
asking* starts near zero and is earned per domain from a measured track record
— 20 clean runs promote a domain one rung, a single failure demotes it. Every
action is scored for risk and reversibility before it runs, snapshotted if it
mutates anything, and written to a hash-chained journal. Unattended, it may
only take actions it can undo; anything irreversible waits for you. It writes
new skills for itself by mining its own history for repeated work, proves them
against four gates, and may install them **only** into `skills/` — never into
the policy engine, the journal, or the code enforcing that rule.

## Install

```sh
cd jarvis
pip install -e ".[model,dev]"
export ANTHROPIC_API_KEY=...        # or: ant auth login
```

## Use

```sh
jarvis do "sort my downloads folder by type"   # one task, interactive
jarvis run                                     # the resident daemon
jarvis status                                  # autonomy, trust, journal integrity
jarvis undo --limit 10                         # list recent reversible actions
jarvis undo --apply 0                          # reverse one
jarvis evolve                                  # one self-improvement cycle
jarvis halt                                    # stop everything
jarvis halt --resume
```

Add `--offline` to any command to run against a scripted stub model — no API
key, no network, no calls. The whole system is exercisable this way.

## Stop button

```sh
touch ~/.jarvis/HALT
```

Checked before every single action, ahead of budgets and any standing grant.
It's a file so that it works from any shell even if the daemon is wedged.

## Configuration

Everything that matters is `[autonomy]` in `config/jarvis.toml`:

```toml
[autonomy]
read      = "NOTIFY"     # executes, tells you after
files     = "CONFIRM"    # executes after an explicit yes
exec      = "CONFIRM"
secrets   = "OBSERVE"    # reads and reports only
financial = "OBSERVE"
```

Levels, least to most: `OBSERVE`, `SUGGEST`, `CONFIRM`, `NOTIFY`, `SILENT`.
The trust ratchet can promote a domain over time but **never past `NOTIFY`** —
reaching `SILENT` is always a deliberate edit here.

Start low. [DESIGN.md §12](DESIGN.md#12-suggested-rollout) has a four-week
rollout that builds the trust ledger out of real evidence.

## Layout

```
src/jarvis/
  kernel/     agent loop, model client (prompt-cache disciplined)
  policy/     autonomy ladder, risk scoring, budgets   ← protected
  audit/      hash-chained journal, snapshots, undo    ← protected
  memory/     episodic / semantic / procedural + friction mining
  tools/      capability-declaring tool contract and registry
  daemon/     supervisor, triggers, presence detection
  evolve/     propose → sandbox → 4 gates → promotion  ← promoter protected
skills/       the ONLY directory JARVIS may write to unsupervised
proposals/    everything else it wrote, waiting for your review
```

## Tests

```sh
pytest              # 103 tests
```

The suite is also gate 4 of the evolution pipeline: a proposed skill must leave
these passing before it can be installed. Two of these tests exist because they
caught real bugs — a `SILENT` domain that could rewrite `~/.ssh/authorized_keys`,
and a path-traversal slug that satisfied the `skills/` allowlist while resolving
onto the policy engine. Both are documented in DESIGN.md §2 and §7.

## Status

The kernel, policy gate, audit layer, memory, daemon, and evolution pipeline are
implemented and tested. Voice I/O is stubbed — the interfaces layer has a CLI,
and wiring Whisper + local TTS is a straightforward addition.
