# Handoff

Two workflows live here: writing a handoff document for another agent, and picking up a handoff to resume work.

---

## Creating a Handoff

Invoked via `rpi handoff [description]`.

Unlike `brainstorm` / `plan` / `evaluate`, this **always writes** immediately — no separate `/rpi write` step needed.

Write a handoff document summarizing the current conversation so a fresh agent can continue the work. Save to `.thoughts/handoffs/`.

### Naming

`.thoughts/handoffs/YYYY-MM-DD-[topic].md`

| Part | Rule |
|------|------|
| Date prefix | `date +%Y-%m-%d` — today's date |
| Topic | Short kebab-case description based on the current work |

### Frontmatter

```yaml
---
date: YYYY-MM-DD
topic: Brief description
status: handed-off
---
```

### Document Content

Including the right amount of context is the most important thing. The next agent has **zero conversation history** — the handoff is all they get.

**What went before:**
- What was being worked on — goals, progress made, what's currently in flight
- Key decisions made and why (with `file:line` references to code)
- Riddles or blockers encountered and their resolution or current status

**Where things stand now:**
- Current state of the code / workspace — any uncommitted changes, branches
- Any risks the next agent should be aware of
- Relevant `file:line` references — point to specific code, not just file names

**What comes next:**
- Concrete next steps, in priority order
- Any open questions or decisions still pending
- Describe what "done" looks like for each next step

**Suggested skills:**
- Suggest skills the next agent should invoke (e.g., `rpi implement`, `rpi plan`, or other installed skills)

### Reference, Don't Duplicate

If the work produced other artifacts in `.thoughts/` (plans, brainstorms, evaluations), reference them by path instead of restating them:

```markdown
See [implementation plan](../plans/2026-05-24-auth-refactor.md) for full task breakdown.
```

### Redact Sensitive Information

Redact any API keys, passwords, connection strings, tokens, PII — or anything else that shouldn't be in a persistent document.

### Arguments

If the user passed arguments after `rpi handoff`, treat them as a description of what the next session will focus on. Tailor the document toward that context. If no args, produce a general summary of the current session.

---

## Picking Up a Handoff

Invoked via `rpi pickup [path]`.

Restore context from a previously written handoff so work can resume.

### With a Path

If the user specifies a path (e.g., `rpi pickup .thoughts/handoffs/2026-05-24-auth-refactor.md`):

1. Read the file
2. Present a concise summary of the state of affairs from the handoff
3. Ask what the user wants to do next

### Without a Path

If no path is specified:

1. Glob `.thoughts/handoffs/*.md` and sort by date descending (date is the filename prefix)
2. If no handoffs exist, tell the user and suggest running `/rpi handoff` first
3. If there are handoffs, find the most recent one and confirm with the user before loading:
   - Show the filename, topic, and date
   - Ask "Load this handoff?"
4. Once confirmed, read the file, present a summary, and ask what to do next
