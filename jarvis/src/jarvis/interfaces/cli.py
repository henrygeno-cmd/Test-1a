"""Command line front end. `python -m jarvis <command>`."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from jarvis.config import build
from jarvis.daemon.service import PresenceDetector, Supervisor
from jarvis.daemon.triggers import ScheduleTrigger
from jarvis.policy.engine import Decision


def interactive_confirm(message: str, decision: Decision) -> bool:
    print(f"\n  JARVIS wants to: {message}")
    print(f"  domain={decision.domain} autonomy={decision.autonomy.name} "
          f"risk={decision.risk.score} ({decision.risk.band})")
    for r in decision.risk.reasons[:5]:
        print(f"    - {r}")
    if decision.snapshot_paths:
        print(f"  will snapshot {len(decision.snapshot_paths)} path(s) first")
    try:
        return input("  allow? [y/N] ").strip().lower() in ("y", "yes")
    except (EOFError, KeyboardInterrupt):
        print()
        return False


def cmd_do(args: argparse.Namespace) -> int:
    system = build(confirm=interactive_confirm, offline=args.offline)
    outcome = system.kernel.run_task(args.goal, user_present=True, mode="plan")
    print(f"\n{'OK' if outcome.ok else 'INCOMPLETE'}: {outcome.summary}")
    print(f"  {outcome.actions_taken} action(s), ${outcome.usd:.4f}")
    for d in outcome.deferred:
        print(f"  deferred: {d['tool']} -- {d['reason']}")
    return 0 if outcome.ok else 1


def cmd_run(args: argparse.Namespace) -> int:
    system = build(confirm=interactive_confirm, offline=args.offline)
    triggers = [
        ScheduleTrigger(name="morning-brief", every_seconds=86400,
                        only_between=(7, 10),
                        goal="Summarise today: calendar, unread mail, anything "
                             "that needs me. Read-only."),
        ScheduleTrigger(name="tidy-downloads", every_seconds=86400,
                        only_between=(2, 5),
                        goal="Sort ~/Downloads into dated folders by type. "
                             "Trash nothing."),
    ]
    sup = Supervisor(kernel=system.kernel, policy=system.policy,
                     memory=system.memory, journal=system.journal,
                     triggers=triggers, presence=PresenceDetector(),
                     state_dir=system.config.state_dir,
                     tick_seconds=system.config.tick_seconds,
                     evolve_hook=lambda: system.evolution_cycle())
    sup.install_signal_handlers()
    print(f"jarvis daemon up. halt with: touch {system.policy.halt_file}")
    sup.run_forever()
    return 0


def cmd_status(args: argparse.Namespace) -> int:
    system = build(offline=True)
    intact, msg = system.journal.verify()
    print(f"tools     : {len(system.registry)}")
    print(f"journal   : {'intact' if intact else 'COMPROMISED'} -- {msg}")
    print(f"halted    : {system.policy.halt_file.exists()}")
    print("autonomy  :")
    for domain in sorted(set(system.config.autonomy) | set(system.policy.trust.grants)):
        lvl = system.policy.trust.level(domain, system.config.autonomy.get(domain))
        wins = system.policy.trust.successes.get(domain, 0)
        fails = system.policy.trust.failures.get(domain, 0)
        print(f"  {domain:<10} {lvl.name:<8} ({wins} clean / {fails} failed)")
    print("friction  :")
    for opp in system.memory.friction() or [{"hypothesis": "(none observed yet)"}]:
        print(f"  - {opp.get('hypothesis')}")
    return 0


def cmd_undo(args: argparse.Namespace) -> int:
    system = build(offline=True)
    entries = system.journal.undoable(limit=args.limit)
    if not entries:
        print("nothing to undo")
        return 0
    for i, e in enumerate(entries):
        print(f"  [{i}] {e.tool} {json.dumps(e.args, default=str)[:80]} "
              f"-> {json.dumps(e.undo, default=str)[:80]}")
    if args.apply is None:
        print("\nre-run with --apply N to reverse one")
        return 0
    entry = entries[args.apply]
    undo = entry.undo or {}
    op = undo.get("op")
    if op == "restore_text":
        target = Path(undo["path"])
        if undo.get("previous") is None:
            target.unlink(missing_ok=True)
            print(f"removed {target}")
        else:
            target.write_text(undo["previous"])
            print(f"restored {target}")
    elif op == "move":
        Path(undo["from"]).rename(undo["to"])
        print(f"moved back {undo['from']} -> {undo['to']}")
    elif op == "snapshot":
        restored = system.snapshots.restore(undo["id"])
        print(f"restored {len(restored)} path(s) from snapshot {undo['id']}")
    else:
        print(f"no undo handler for op={op!r}")
        return 1
    system.journal.append(kind="note", actor="user", tool="undo",
                          args={"reversed": entry.id}, ok=True)
    return 0


def cmd_evolve(args: argparse.Namespace) -> int:
    system = build(offline=args.offline)
    results = system.evolution_cycle(max_proposals=args.max)
    if not results:
        print("no friction worth automating yet")
    for r in results:
        print(json.dumps(r, indent=2, default=str))
    return 0


def cmd_halt(args: argparse.Namespace) -> int:
    system = build(offline=True)
    if args.resume:
        system.policy.resume()
        print("resumed")
    else:
        system.policy.halt("cli")
        print(f"halted -- {system.policy.halt_file}")
    return 0


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="jarvis")
    p.add_argument("--offline", action="store_true",
                   help="use the scripted stub model (no API calls)")
    sub = p.add_subparsers(dest="cmd", required=True)

    d = sub.add_parser("do", help="run a single task")
    d.add_argument("goal")
    d.set_defaults(func=cmd_do)

    r = sub.add_parser("run", help="run the resident daemon")
    r.set_defaults(func=cmd_run)

    s = sub.add_parser("status", help="autonomy, trust and journal integrity")
    s.set_defaults(func=cmd_status)

    u = sub.add_parser("undo", help="list or reverse recent actions")
    u.add_argument("--limit", type=int, default=10)
    u.add_argument("--apply", type=int, default=None)
    u.set_defaults(func=cmd_undo)

    e = sub.add_parser("evolve", help="run one self-improvement cycle")
    e.add_argument("--max", type=int, default=1)
    e.set_defaults(func=cmd_evolve)

    h = sub.add_parser("halt", help="stop all autonomous action")
    h.add_argument("--resume", action="store_true")
    h.set_defaults(func=cmd_halt)

    args = p.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
