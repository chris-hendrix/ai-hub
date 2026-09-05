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
- **Architecture** — show, don't list. Fenced blocks only, no bullets or prose:
  - **Mermaid** for data flow, sequence, state — anything graph-like
  - **Plain text block** for the directory tree, with `[A]`/`[M]` markers and inline annotations
  - **Code snippet** only where the shape is non-obvious
- **Branch & Commit Strategy** — naming, granularity, PR approach; adapted to the repo's conventions.

### Agent-facing

- **Checklist** — first line declares the mode: `verification: TDD | test-after | manual`
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

## Checklist — verification: TDD

### Phase 1: [Name]
- [ ] **Task 1: [Desc]**
  - RED: Write test for [behavior] in `path/to/test`
  - GREEN: Implement [change] in `path/to/source`
  - CHECK: `npm test` — passes; `npm run type-check` — no errors
````
