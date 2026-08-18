---
name: skill-acquisition
description: Triggers when no other skill clearly fits the request. Do the task anyway, then log the gap to memory/skill-gaps.md so recurring gaps become candidates for new skill folders.
---

# Skill Acquisition

The safety net. When routing in `CLAUDE.md` doesn't produce an obvious match,
this is what runs — and its entire job is to make sure "no skill fits" never
turns into "I can't help with that."

---

## Order of operations

**1. Do the task first.**

Before any logging, bookkeeping, or meta-commentary: handle the request. Fully,
to the same standard as if a dedicated skill existed. The absence of a skill file
is an observation about this repo, not a limit on what you can do.

If the task has any overlap with an existing skill, borrow that skill's standards
— multiple variants from `content-agent`, never-auto-send from `outreach-agent`,
the reversible-action defaults from `CLAUDE.md`. Borrowing partial guidance beats
starting from nothing.

**2. Then log the gap.**

Append to `memory/skill-gaps.md`:

```
## <YYYY-MM-DD> — <short name for this kind of task>
**Request:** <what I actually asked for, one or two lines>
**Business/context:** <business key, or "personal" / "school" / "n/a">
**Routed to:** <the skill you borrowed from, or "nothing — handled ad hoc">
**How it went:** <what you did, and how well it worked>
**Would a skill help?** <yes/no/maybe + what it would need to specify>
**Seen before:** <count if you can tell from the file, else "first time">
```

Write it yourself. Don't ask permission and don't make it a whole conversation —
one appended block, then move on.

**3. Then mention it, briefly.**

One line at the end of the response, at most:

> Logged this as a skill gap — third time something like this has come up.

If it's a first occurrence, you can skip mentioning it entirely.

---

## Recognizing a recurring gap

Before appending, scan `memory/skill-gaps.md` for similar entries. Match on the
*shape* of the task, not the exact words — "make me a thumbnail," "design a
story graphic," and "need a header image" are one gap, not three.

When the same shape hits **three or more** entries, escalate:

1. Set `Would a skill help?` to a clear **yes** with a one-line spec of what the
   skill should cover.
2. Add a line at the top of the entry: `**ESCALATE → review-agent: recurring
   (N×)**`
3. Tell me in one sentence that it's now a candidate for a real skill.

`review-agent` picks these up on its weekly pass and proposes the actual skill
folder. **This skill never creates a new skill folder on its own** — that's a
structural change to how the assistant works, and it goes through review so I see
the diff first.

The one exception: if I say "make that a skill," build it immediately. Direct
instruction beats the review cycle.

---

## What a new skill proposal should contain

When you escalate, sketch enough that `review-agent` can write the real thing:

- **Name and trigger** — what requests should route here
- **Pre-work** — what to check before starting (files, memory, context)
- **Standards** — variant counts, length, format, tone
- **Confirm boundary** — what it can do freely vs. what needs my go-ahead
- **What it logs** — which memory file, in what shape

---

## Never

- Never let logging delay or shrink the actual work.
- Never use "there's no skill for this" as a reason to hand back less.
- Never create or edit a skill folder without going through `review-agent` or a
  direct instruction from me.
