# Handoff

Two workflows: writing a handoff for another agent, and picking up a handoff to resume.

---

## Creating a Handoff

Invoked via `rpi handoff [description]`.

Unlike `plan` / `evaluate`, this **always writes immediately** (via `scripts/rpi write --type handoff`).

### Document Content

The next agent has **zero conversation history** — the handoff is all it gets.

**What went before:** goals, progress, key decisions (with `file:line` refs), blockers and resolutions.

**Where things stand:** current workspace state (uncommitted changes, branches), risks, relevant `file:line` refs.

**What comes next:** concrete next steps in priority order, open questions, what "done" looks like.

**Suggested skills:** e.g. `rpi implement`, `rpi plan`.

Reference other `.thoughts/` artifacts by path instead of restating them:

```markdown
See [implementation plan](../plans/2026-05-24-auth-refactor.md) for full task breakdown.
```

Redact API keys, passwords, tokens, PII.

If args were passed to `rpi handoff`, tailor toward that focus; otherwise, general session summary.

---

## Picking Up a Handoff

Invoked via `rpi pickup [path]`.

**With a path** (`rpi pickup .thoughts/handoffs/2026-05-24-auth-refactor.md`): read the file, summarize, ask what to do next.

**Without a path**: glob `.thoughts/handoffs/*.md`, sort by date, confirm with the user, then read and summarize.
