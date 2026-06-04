---
name: rpi
description: Consolidated brainstorm-plan-evaluate-implement workflow. Use when the user wants to brainstorm an idea, create an implementation plan, evaluate an artifact, implement from a plan, or write output to .thoughts/. Keywords: brainstorm, plan, evaluate, implement all, implement phase N, write.
allowed-tools: Read Write Bash Edit AskUserQuestion Glob Grep Task TodoWrite WebSearch WebFetch Agent
metadata:
  version: "2.0"
---

# rpi — Brainstorm, Plan, Evaluate, Implement

Unified entry point for the brainstorm-plan-evaluate-implement workflow.

## Workflow

```
brainstorm (optional) → plan → evaluate → implement
        ↓                    ↓
   Uses research        Uses research
```

- **brainstorm** — explore approaches, make a decision. Embeds research (codebase + web). Optional — skip for simple changes.
- **plan** — TDD-structured implementation plan with RED/GREEN/CHECK tasks. Embeds research. Includes branch & commit strategy.
- **evaluate** — assess artifacts across quality dimensions with concrete upgrade paths.
- **implement** — execute a plan phase by phase through vertical RED/GREEN cycles.

## Usage

```
/claudehub:rpi <keyword> [args]
```

| Keyword | Syntax | What it does |
|---------|--------|--------------|
| `brainstorm` | `brainstorm <topic>` | Explore approaches for an idea (optional — skip for simple changes) |
| `plan` | `plan <description or .thoughts doc path>` | Create a TDD-structured implementation plan |
| `evaluate` | `evaluate <description>` | Evaluate an artifact across multiple quality dimensions with scoring and upgrade paths |
| `handoff` | `handoff [description of next session]` | Summarize the current conversation into a handoff doc for another agent |
| `pickup` | `pickup [path to handoff]` | Resume work from a handoff document |
| `implement all` | `implement all [plan path]` | Implement all phases from a plan |
| `implement phase N` | `implement phase N [plan path]` | Implement a specific phase from a plan |
| `write` | `write` | Save the most recent output to `.thoughts/` |

## Doc Context

Any keyword can accept a path to an existing `.thoughts/` document as context:

- `plan .thoughts/brainstorms/2026-04-25-my-idea.md` — plan from an existing brainstorm
- `evaluate .thoughts/plans/2026-04-25-my-plan.md` — evaluate a plan
- `implement all .thoughts/plans/2026-04-25-my-plan.md` — implement from a specific plan
- `pickup .thoughts/handoffs/2026-05-24-auth-refactor.md` — resume from a specific handoff

For `implement` with no explicit path, find the most recent `.thoughts/plans/*.md` file and confirm with the user before proceeding. If no plan files exist, tell the user and suggest running `/claudehub:rpi plan` first.

## Dispatch

Parse the first word of the input as the keyword. For `implement`, parse `all` or `phase N`.

Follow the corresponding methodology:

- `brainstorm` → [brainstorming](references/brainstorming.md)
- `plan` → [planning](references/planning.md)
- `evaluate` → [evaluating](references/evaluating.md)
- `implement` → [implementing](references/implementing.md) (for doc conventions, see [writing-documentation](references/writing-documentation.md))
- `handoff` → [handoff](references/handoff.md)
- `pickup` → [handoff](references/handoff.md)
- `write` → Save to `.thoughts/` (see [writing-documentation](references/writing-documentation.md))

## Writing Output

Most workflows save nothing automatically. Run `/rpi write` when ready to persist. The `implement` workflow prompts you at completion — for all others, use `write` explicitly. The `handoff` workflow is the exception: it writes immediately.

See [writing-documentation](references/writing-documentation.md) for naming and auto-detection conventions.

## Unknown or Missing Keyword

If invoked with no keyword or an unrecognized keyword, show the usage table above and ask the user what they'd like to do.
