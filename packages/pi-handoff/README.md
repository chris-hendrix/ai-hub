# pi-handoff

Session handoff and pickup for pi. A handoff is a model-generated document
stored as a signifier entry **inside the session itself** — sessions are the
only storage, and no files are ever written.

## Install

Published install:

```
pi install npm:pi-handoff
```

> PENDING (2026-09-27): the npm name `pi-handoff` is **already taken** by an
> unrelated pi handoff extension (maintainer `akuzmenko`, latest 1.1.9), so the
> line above would currently install *that* package, not this one. A name must
> be chosen (e.g. a scoped `@<user>/pi-handoff`) and this section updated before
> publishing. Until then, install from the local path below.

Local development (path relative to the settings file that declares it):

```
"packages": ["../../git/ai-hub/packages/pi-handoff"]
```

Requires interactive (TUI) mode and a selected model.

## Commands

### `/handoff`

No arguments. Summarizes the current session and continues in a fresh one.

What happens:

1. Resolves the prompt (see Configuration) and serializes the conversation
   (compaction-aware: a compaction summary plus the entries kept after it).
2. Makes exactly one model call behind a loader (Esc cancels: nothing is
   written, no new session opens). In default mode, workspace facts
   (branch, HEAD, status, recent commits) are included.
3. Appends a `handoff` signifier (`{doc, topic, summary, createdAt}`) to the
   source session. It renders as a dim one-liner there and never enters LLM
   context.
4. Opens a fresh session (parented to the source) with the handoff injected
   as a collapsed, expandable block, plus a hidden receive directive that
   triggers exactly one turn. The receiver proposes next steps in priority
   order, states what it needs from you, and waits for confirmation. It does
   not start work on its own.

Refuses when there is nothing to hand off yet or while a turn is running.

### `/pickup [session-id-or-prefix]`

Resume work from any past session. With no argument, a searchable picker
lists sessions (current workspace first, then newest first) showing time,
topic, summary, and a `ready` / `derive` mark. With an argument, an exact
session-id match wins; otherwise a unique case-insensitive prefix matches;
an ambiguous prefix aborts with an error. The current session is excluded.

What happens per row:

- `ready` — the session's recent entries already contain a `handoff`
  signifier, so the stored doc is reused with **zero model calls**.
- `derive` — no signifier found, so a handoff is generated on the spot from
  that session (workspace facts come from the source session's workspace),
  written back to that session (so the next pickup reuses it), then
  injected. If the session file changed since it was listed, the command
  aborts and asks you to run `/pickup` again.

Either way the result is a fresh session like `/handoff` produces: the doc
as a collapsed block, then the receiver proposes next steps and waits for
confirmation. The same session can be picked up twice into two independent
sessions.

## Configuration

Optional `handoff` block in settings (`<cwd>/.pi/settings.json` for
project, agent dir `settings.json` for global). Exactly two keys:

```json
{
  "handoff": {
    "instructions": "Custom prompt text…",
    "instructionsFile": "./handoff-prompt.md"
  }
}
```

- `instructions`: inline prompt text replacing the built-in instruction.
- `instructionsFile`: path to a prompt file. Resolved relative to the
  settings file that set it; `~` and absolute paths are supported.

Precedence: project settings beat global; within one scope
`instructionsFile` beats `instructions`; when nothing is set the built-in
prompt is used. A custom prompt replaces the instruction only — the
conversation is always supplied, and workspace facts are omitted. An
unreadable `instructionsFile` aborts with an error and never silently
falls back. Empty or whitespace-only values are treated as unset.

## Performance

Session scanning never reads a whole session file and never opens sessions
on the hot path. Per file it reads only the first line (header) and the
last 64 KB (signifier tail), plus a stat.

## Non-goals

- No handoff files are ever written; there is nothing to clean up.
- Handoffs are not consumable by other agents (no opencode support).
- The receiver always waits for your confirmation — there is no hard gate
  beyond that, and it may still propose tool calls for you to approve.
- Prompts are not tailored per argument; `/handoff` takes no arguments.
