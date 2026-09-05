---
name: rpi
description: "Consolidated research-plan-review-implement workflow. Use when the user wants to research or explore solutions, create an implementation plan, review a plan or artifact, implement from a plan, hand off work to another session, pick up a handoff, write output to .rpi/, or grill a plan/design through relentless interviewing. Keywords: research, plan, review, implement, handoff, pickup, write, grill."
---

# rpi — Research, Plan, Review, Implement

Parse the first word of the input as the keyword (`implement all [plan]` / `implement phase N [plan]` is the shape there). Any keyword accepts a path to a `.rpi/` document as context; `implement` with no path uses the most recent `.rpi/plans/*.md` (confirm with the user). Unknown or missing keyword → show the table and ask.

| Keyword | Reference |
|---------|-----------|
| `research <topic>` | [research](references/research.md) — explore solutions with the user |
| `plan <description \| doc path>` | [plan](references/plan.md) — TDD-structured implementation plan |
| `review <plan \| artifact>` | [review](references/review.md) — findings list + verdict |
| `grill <topic>` | [grill](references/grill.md) — relentless interview until fully aligned |
| `implement [all \| phase N] [plan path]` | [implement](references/implement.md) — orchestrate subagents through a plan's checklist |
| `handoff [focus]` | [handoff](references/handoff.md) — summarize session for another agent |
| `pickup [path]` | [pickup](references/pickup.md) — resume from a handoff |
| `write` | [write](references/write.md) — save output to `.rpi/` |
