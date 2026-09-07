# Plan

Plans are persistent, self-sufficient documents — all context needed to implement without conversation history.

**No code is written during planning** — implementation belongs to `implement`.

## Process

1. **Context gathering** — read the codebase fully first (and the web where current best practice matters). Include `file:line` references.
2. **Align fully** — question the user relentlessly (one at a time, offering your position) until you're 100% confident: you could explain the plan back and the user would say "yes, exactly." Escalate to `grill` (see [grill](./grill.md)) for complex plans.
3. **Produce the plan** — complete, in one pass: all sections, full checklist.

## Plan Structure

### Human-facing

- **Overview** — what & why, 1–3 lines. If scope was explicitly bounded, note exclusions here.
- **Success Criteria** — checkboxes; defines "done."
- **Assumptions** — every unconfirmed assumption or open question, each marked confirmed / cut / accepted-as-risk. `plan` doesn't finish while items sit unmarked.
- **Architecture** — show, don't list. Fenced blocks only, no bullets or prose:
  - **Mermaid** for data flow, sequence, state — anything graph-like
  - **Plain text block** for the directory tree, with `[A]`/`[M]` markers and inline annotations
  - **Code snippet** only where the shape is non-obvious
- **Branch & Commit Strategy** — naming, granularity, PR approach; adapted to the repo's conventions.
- **UI Mockups** — required whenever the plan touches UI. ASCII mockup per surface, every interactive state, exact user-facing copy, and the design tokens / existing primitives to reuse at the top. No mockups, no UI tasks.

### Agent-facing

- **Checklist** — verification mode declared **per phase** (`TDD` for logic, `test-after` or `manual` where that fits — e.g. UI polish, E2E seams). First line of each phase states its mode.
  - `### Phase N:` human-readable milestones
  - `- [ ] Task:` one behavior, 1–3 files
    - `RED:` failing test + file (only when TDD)
    - `GREEN:` minimal change + file
    - `CHECK:` command + expected result (test + type-check/lint)
  - TDD discipline: minimal GREEN, refactor only after GREEN, never while RED.
  - Deviations during implementation: note inline on the affected task.

## Template

````markdown
# [Feature] Implementation Plan

## Overview
[What and why, 1–3 lines.]

## Success Criteria
- [ ] [Functional / technical / quality requirement]

## Assumptions
- [ ] [Unconfirmed assumption or open question — confirmed / cut / accepted-as-risk]

## Architecture

[mermaid data-flow diagram]

```text
src/
  feature/
    existing.ts   [M]  what changes
    new.ts        [A]  what it does
tests/
  feature.test.ts [A]
```

[snippet only where the shape is non-obvious]

## Branch & Commit Strategy
[Branch, commits, PR — adapted to the repo's conventions.]

## UI Mockups
[Only if the plan touches UI — one ASCII mockup per surface with states, exact copy, tokens/primitives. No mockups, no UI tasks.]

## Checklist

### Phase 1: [Name] — verification: TDD
- [ ] **Task 1: [Desc]**
  - RED: Write test for [behavior] in `path/to/test`
  - GREEN: Implement [change] in `path/to/source`
  - CHECK: `npm test` — passes; `npm run type-check` — no errors
````
