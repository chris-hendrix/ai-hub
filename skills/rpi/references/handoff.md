# Handoff

Summarize the current conversation into a handoff for another agent. Always writes immediately via the script.

The next agent has **zero conversation history** — the handoff is all it gets.

**What went before:** goals, progress, key decisions (with `file:line` refs), blockers and resolutions.

**Where things stand:** current workspace state (uncommitted changes, branches), risks, relevant `file:line` refs.

**What comes next:** concrete next steps in priority order, open questions, what "done" looks like.

Reference other `.thoughts/` artifacts by path instead of restating them. Redact API keys, passwords, tokens, PII.

If args were passed to `rpi handoff`, tailor toward that focus; otherwise, general session summary.
