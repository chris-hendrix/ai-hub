---
name: rpi
description: "Consolidated research-plan-review-implement workflow. Use when the user wants to research or explore solutions, create an implementation plan, review a plan or artifact, implement from a plan, hand off work to another session, pick up a handoff, write output to .thoughts/, or grill a plan/design through relentless interviewing. Keywords: research, plan, review, implement, handoff, pickup, write, grill."
---

# rpi — Research, Plan, Evaluate, Implement

Unified entry point for the research-plan-review-implement workflow.

## Workflow

```
research (optional) → plan → review → implement
```

- **research** — explore solutions with the user. Dialogue mode: establish the problem and what good looks like, then explore code/web together. Nothing is written. Optional — skip for simple changes.
- **plan** — TDD-structured implementation plan with RED/GREEN/CHECK tasks. Researches the codebase and web as needed. Includes branch & commit strategy.
- **review** — review a plan (or any artifact) against explicit dimensions; report a list of findings.
- **grill** — interview the user relentlessly about a plan or design, walking every branch of the decision tree until reaching shared understanding. Interstitial — usable at any phase.
- **implement** — execute a plan phase by phase through vertical RED/GREEN cycles.

## Keyword Reference

| Keyword | Syntax | What it does |
|---------|--------|--------------|
| `research` | `research <topic>` | Explore solutions collaboratively (optional — skip for simple changes) |
| `plan` | `plan <description or .thoughts doc path>` | Create a TDD-structured implementation plan |
| `review` | `review <plan or artifact>` | Review a plan/artifact against explicit dimensions; report findings |
| `grill` | `grill <topic>` | Interview the user relentlessly about a plan or design, walking the decision tree |
| `handoff` | `handoff [description of next session]` | Summarize the current conversation into a handoff doc for another agent |
| `pickup` | `pickup [path to handoff]` | Resume work from a handoff document |
| `implement all` | `implement all [plan path]` | Implement all phases from a plan |
| `implement phase N` | `implement phase N [plan path]` | Implement a specific phase from a plan |
| `write` | `write` | Save the most recent output to `.thoughts/` |

## Doc Context

Any keyword can accept a path to an existing `.thoughts/` document as context:

- `plan .thoughts/plans/2026-04-25-my-plan.md` — plan from an existing doc
- `review .thoughts/plans/2026-04-25-my-plan.md` — review a plan
- `implement all .thoughts/plans/2026-04-25-my-plan.md` — implement from a specific plan
- `pickup .thoughts/handoffs/2026-05-24-auth-refactor.md` — resume from a specific handoff

For `implement` with no explicit path, find the most recent `.thoughts/plans/*.md` file and confirm with the user before proceeding. If no plan files exist, tell the user and suggest running `rpi plan` first.

## Dispatch

Parse the first word of the input as the keyword. For `implement`, parse `all` or `phase N`.

| Keyword | Reference |
|---------|-----------|
| `research` | [researching](references/researching.md) |
| `plan` | [planning](references/planning.md) |
| `review` | [review](references/review.md) |
| `grill` | [grilling](references/grilling.md) |
| `implement` | [implementing](references/implementing.md) |
| `handoff` | [handoff](references/handoff.md) |
| `pickup` | [handoff](references/handoff.md) |
| `write` | [writing-documentation](references/writing-documentation.md) |

Document conventions follow [writing-documentation](references/writing-documentation.md).

## Writing Output

Most workflows save nothing automatically. When the user says `write`, persist via `skills/rpi/scripts/rpi write --type <type> --topic "..."` — body on stdin (see [writing-documentation](references/writing-documentation.md) for types and subdirs). The `implement` workflow prompts at completion; `handoff` writes immediately. `research` never writes.

## Unknown or Missing Keyword

If invoked with no keyword or an unrecognized keyword, show the keyword reference table above and ask the user what they'd like to do.
