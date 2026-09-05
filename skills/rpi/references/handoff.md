# Handoff

Summarize the current conversation into a handoff for another agent. Writes immediately via the script when the keyword is invoked.

The next agent has **zero conversation history** — the handoff is all it gets. Cover:

1. **What went before:** goals, progress, key decisions (with `file:line` refs), blockers and resolutions.
2. **Where things stand:** current workspace state (uncommitted changes, branches), risks, relevant `file:line` refs.
3. **What comes next:** concrete next steps in priority order, open questions, what "done" looks like.

- Reference other artifacts by path only if the next agent genuinely needs them.
- Redact API keys, passwords, tokens, PII.
- If focus args were passed to the `handoff` keyword, tailor toward that focus; otherwise, general session summary.
