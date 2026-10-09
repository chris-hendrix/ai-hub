# Plan

Plans are persistent, self-sufficient documents — all context needed to implement without conversation history. One file, three layers: **scan → briefing → tasks**.

**No paragraphs.** A plan is claims, labeled bullets, tables, trees and fenced diagrams. A wall of text is a defect at any layer, and layer 1 has the tightest budget.

**No code is written during planning** — implementation belongs to `implement`.

## Process

1. **Context gathering** — read the codebase fully first (and the web where current practice matters). `file:line` references.
2. **Align fully** — question the user relentlessly (one at a time, offering your position) until you could explain the plan back and they'd say "yes, exactly." Escalate to [grill](./grill.md) for complex plans.
3. **Produce the plan** — complete, in one pass: all three layers.

## Layer 1 — scan

The only layer the human has to read. **No "because":** every justification lives in layer 2 under the same ID.

Forms only — claims (one line each), table, mermaid, tree, one-line bullets, one mockup. **No paragraph over 2 lines.**

- **What changes** — 2–3 lines, user-visible: what it is now, what it becomes.
- **Decisions** — `D1…Dn`, one line each: the call, never the reasoning. Cap 7; more means two plans.
- **Out** — the cuts, one line. Reasons go to layer 2.
- **Shape** — one line (`N tasks · M phases · worst is <phase>`) so scope can be vetoed without reading on.
- **The picture** — mermaid (flow, sequence or state), then the tree with `[A]`/`[M]`/`[D]` and no annotations, then the **one** mockup that decides something. Mockups that decide nothing new go to layer 2 — required whenever the plan touches UI, but only one earns the top.

## Layer 2 — briefing

The implementer's briefing, handed to a subagent with each task — **bytes here × task count is the cost.** Same forms as layer 1, more of them, **3 lines maximum per entry** and a labeled field per line.

| Section | Form |
|---|---|
| **Decision records** | one block per `D1…`: `Why:` · `Rejected:` · `Measured:` · `Revisit if:` — omit a field only when it is genuinely empty |
| **Considered and cut** | one line per cut: `**what** — why it was cut` |
| **Phase modes** | the table: phase · tasks · verification · why |
| **Done means** | one criterion per line, no prose — every `CHECK` should trace to one |
| **Files, annotated** | the layer-1 tree, now with a per-file reason — never a paragraph |
| **Other surfaces** | one line each: surface — why it decides nothing new |
| **Prerequisites** | one line each |
| **Branch & commit** | one line each: branch · commit shape · PR |

## Layer 3 — tasks

- **Checklist** — verification mode declared **per phase**: `TDD` for logic, `test-after` or `manual` where that fits (UI polish, E2E seams). First line of each phase states its mode.
- `### Phase N:` human-readable milestones; `- [ ] Task:` one behavior, 1–3 files.
  - `RED:` failing test + file (TDD only) · `GREEN:` minimal change + file · `CHECK:` command + expected result (test + type-check/lint)
  - TDD discipline: minimal GREEN, refactor only after GREEN, never while RED.
  - `rpi dev <plan> <task-id> "<one line>"` appends a deviation to the task; longer prose goes in the per-task file, and the line ends in a pointer.

`rpi next`/`done` parse the checkbox line, so keep the form:

```md
### Phase 1: [Name] — verification: TDD
- [ ] **Task 1: [Desc]**
  - RED: test for [behavior] in `path/to/test`
  - GREEN: [change] in `path/to/source`
  - CHECK: `npm test` passes; `npm run type-check` clean
```

**State and decisions stay live; narrative does not.** `rpi done` flips checkboxes; a decision reversed mid-implementation edits its `D` row. Review records, execution notes and deviation essays belong in `implementations/`, `reviews/` or `handoffs/` — the plan is not the log.
