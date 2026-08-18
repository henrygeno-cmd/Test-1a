# Pending Review

Proposals from headless / cron runs of `skills/review-agent/`, waiting on my
approval. Nothing here has been applied.

Headless runs write proposals here and stop — no edits to `CLAUDE.md`, no new
skill folders, no changes to existing skills, because no one was present to
approve them. At the start of the next interactive session, surface anything
still `awaiting approval` in one line.

Once I decide, mark each proposal in place and leave it in the file:

- `APPROVED — applied YYYY-MM-DD`
- `REJECTED — <reason>`
- `SUPERSEDED — <by what>`

Keeping rejections is the point: it's what stops the same proposal coming back
every week.

**Format:**

```
## Review — YYYY-MM-DD (headless)
**Reviewed:** learnings through <date>, skill-gaps through <date>
**Proposals:** N

### Proposal 1: <one-line summary>
**Evidence:** <what triggered this — cite entries/dates>
**File:** <path>
**Change:**

~~~diff
- <exact current text>
+ <exact proposed text>
~~~

**Why:** <one or two lines>
**Risk if wrong:** <one line>
**Status:** awaiting approval
```

---

<!-- proposals below -->
