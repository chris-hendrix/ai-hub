# Plan

- Plans are persistent and self-sufficient: all context needed to implement without conversation history.
- One file, three sections: **Summary → Details → Checklist**.
- **No code is written during planning** — that belongs to `implement`.

## Format rule (every section)

- **Bullets only. No prose paragraphs, ever.**
- One bullet = one line or one sentence; two only if it truly can't be split.
- Anything longer becomes sub-bullets.
- Only headings, tables and code blocks may be non-bullet.
- A wall of text is a defect at any section; the Summary has the tightest budget.

## Process

1. **Context gathering** — read the codebase fully first (and the web where current practice matters). Cite `file:line`.
2. **Align fully** — question the user relentlessly, one at a time, offering your position. Done when you could explain the plan back and they'd say "yes, exactly." Escalate to [grill](./grill.md) for complex plans.
3. **Produce the plan** — complete, in one pass: all three sections.

## Summary

- The only section the human has to read; no "because" (that lives in Details, under the same ID).
- Under 35 lines outside code blocks; `rpi write` warns past that.

```md
## Summary

### Why
- [TICKET-123](link): [the problem, one line]

### What
- Now: [one line]
- After: [one line]
- Out: [cut], [cut]

### How
- N branches · N PRs · N phases · N tasks
- Phase 1 ([mode]): [one line]

### Sketch
[mermaid] [tree] [pseudocode]
```

- **Why** — link a ticket, incident or thread.
- **What** — 2–3 lines, user-visible: what it is now, what it becomes, and the cuts.
- **Decisions** — `D1…Dn`, one line each: the call, never the reasoning. Cap 7; more means two plans.
- **Shape** — one line (`N tasks · M phases · worst is <phase>`) so scope can be vetoed without reading on.
- **Sketch** — any of these, only when they help:
  - A small mermaid flowchart or sequence.
  - A tree of the major source files, `[A]`/`[M]`/`[D]` and no annotations.
  - The core change as shortened pseudocode.
  - The **one** mockup that decides something — required whenever the plan touches UI.
  - Mockups that decide nothing new go to Details.

## Details

- Handed to a subagent with each task — **bytes here × task count is the cost**, keep it tight.
- 3 lines maximum per entry, one labelled field per line.
- In this order:
  - **Decisions** — `#### D1: [the call]`; bullets labelled `Because` / `Rejected` / `Measured` / `Watch` / `Revisit if` — omit a field only when it is genuinely empty.
  - **Out** — one line per cut: `**what** — why it was cut`.
  - **Phase modes** — the table: phase · tasks · verification · why.
  - **Done means** — one criterion per line, no prose — every `CHECK` should trace to one.
  - **Files** — `file:line` + the change, and what stays unchanged; never a paragraph.
  - **Other surfaces** — one line each: surface — why it decides nothing new.
  - **Setup** — one line each: prerequisites · worktree · branch · commit shape · PR.

## Checklist

- Verification mode declared **per phase**:
  - `TDD` for logic; `test-after` or `manual` where that fits (UI polish, E2E seams).
  - First line of each phase states its mode.
- `### Phase N:` — human-readable milestones.
- `- [ ] Task:` — one behavior, 1–3 files.
  - `RED:` failing test + file (TDD only).
  - `GREEN:` minimal change + file.
  - `CHECK:` command + expected result (test + type-check/lint).
- TDD discipline: minimal GREEN, refactor only after GREEN, never while RED.
- Deviations: `rpi dev <plan> <task-id> "<one line>"` appends one to the task.
  - Anything longer goes in the per-task file; the line ends in a pointer.

`rpi next`/`done` parse the checkbox line, so keep the form:

```md
## Checklist

### Phase 1: [Name] — verification: TDD
- [ ] **Task 1: [Desc]**
  - RED: test for [behavior] in `path/to/test`
  - GREEN: [change] in `path/to/source`
  - CHECK: `npm test` passes; `npm run type-check` clean
```

## Keep the plan live

- State and decisions stay live; narrative does not.
- `rpi done` flips checkboxes.
- A decision reversed mid-implementation edits its `D` row.
- Review records, execution notes and deviation essays go in `.rpi/reviews/`, `.rpi/implementations/` or `.rpi/handoffs/`.
- The plan is not the log.
