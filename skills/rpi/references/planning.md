# Writing Implementation Plans

Create detailed, actionable plans with enough specificity for an LLM to implement. Plans are the persistent source of truth for multi-session implementation — the entire implementation is too large for a single context window.

Save via `skills/rpi/scripts/rpi write --type plan --topic "..."` — frontmatter and filename are handled by the script (see [writing-documentation](./writing-documentation.md)).

## Philosophy

- **Self-contained context**: Architecture must include all details to implement without prior conversation history.
- **Task-level verification**: Each task is independently verifiable (RED/GREEN/CHECK) for tight feedback loops.
- **TDD core loop**: Each task is a vertical slice — RED (failing test) → GREEN (minimal pass) → CHECK (verify). One behavior per task.
- **Refactor after GREEN**: After each task goes green, pause. Extract duplication, deepen modules. Run tests after each step. Never refactor while RED.
- **Enough detail, not full code**: Include structure and patterns, not complete implementation.
- **Living document**: Checkboxes track progress; any session can resume from the plan.

## Plan Structure

### Specification (Beginning)

**Overview** — What we're building and why.

**Success Criteria** — Checkboxes for acceptance criteria (functional, technical, documentation). These define "done."

**What We're NOT Doing** — Explicit scope boundaries.

**Risks & Blockers** — What could go wrong, unknowns, dependencies.

**Branch & Commit Strategy** — Branch naming, commit granularity, PR approach (see [git-strategy](./git-strategy.md)).

**Architecture** — Data flow, component interactions, schema/migrations, endpoints with function signatures, component structure. Show patterns, not full code.

**Testing Strategy** — Test types (unit/integration/e2e), file locations, framework, lint/type-check commands.

### Implementation Checklist (Core)

**Phases** (optional): `### Phase N: [Name]` — major milestones.

**Tasks**: `- [ ] **Task N: [Description]**` — one behavior, 1–3 files, completable in one session.

- `  - RED: [Test] in [test file]` — failing test for this task
- `  - GREEN: [Code change] in [source file]` — minimal pass
- `  - CHECK: [Command] — [expected result]` — includes test + type-check/lint

### Tracking (End)

**Tracked Changes** — Significant deviations with rationale. **References** — tickets, brainstorms, similar code.

## Planning Process

### 1. Context Gathering

Research the codebase deeply (see [researching-codebase](./researching-codebase.md)). Read files fully, include `file:line` references, identify patterns.

### 2. Deep-Dive Alignment (90% Confidence Gate)

**Do NOT write planning docs until 90% confidence.**

After each round of questions, report: `Current confidence: X%. [gaps if below 90%]`

Keep asking until you could explain the plan back and the user would say "yes, exactly." Cover requirements, edge cases, technical decisions, scope boundaries, testing strategy.

For complex plans where this lighter gate isn't enough, use `rpi grill` (see [grilling](./grilling.md)) — it walks every decision-tree branch exhaustively.

### 3. Iterative Writing

Don't write the full plan in one shot. Propose structure, get feedback, then fill in the checklist.

## Code Snippets in Architecture

Show structure, not full implementation:

```typescript
async function handleUserCreate(req: Request): Promise<Response> {
  // 1. Validate with zod schema  2. Check auth  3. Create in DB  4. Return
}
```

---

## Plan Template

Body for `rpi write --type plan --topic "..."` (frontmatter/filename handled by the script):

```markdown
# [Feature] Implementation Plan

## Overview
[What and why.]

## Success Criteria
- [ ] [Functional / technical / quality requirement]

## What We're NOT Doing
[Out of scope.]

## Risks & Blockers
[Unknowns, dependencies.]

## Branch & Commit Strategy
[Branch, commits, PR — see git-strategy.md]

## Architecture
[Data flow, components, schema, endpoints.]

## Testing Strategy
**Test Types:** Unit / Integration / E2E · **Framework:** Jest / Vitest · **Quality:** lint, type-check

## Implementation Checklist

### Phase 1: [Name]
- [ ] **Task 1: [Desc]**
  - RED: Write test for [behavior] in `path/to/test`
  - GREEN: Implement [change] in `path/to/source`
  - CHECK: `npm test` — passes; `npm run type-check` — no errors

## Tracked Changes
> Record significant deviations.

## References
- Related brainstorm: [path] · Similar impl: `file:line`
```
