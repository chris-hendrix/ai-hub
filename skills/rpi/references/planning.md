# Writing Implementation Plans

Create detailed, actionable implementation plans with enough specificity for an LLM to implement.

**Location**: Plans are optionally saved to `.thoughts/plans/` — run `/rpi write` after creating the plan to persist it.

## Purpose

Plans are for **diving into the solution**. They bridge the gap between a validated design (from brainstorming) and actual implementation.

**Critical: Plans are designed for multi-session implementation.** The entire implementation is too large for a single LLM context window. The plan serves as the persistent source of truth that allows work to be resumed across multiple sessions.

A good plan has:

1. **Architecture specification** - Self-contained context: all technical details needed to implement without conversation history
2. **Implementation checklist** - Granular breakdown into tasks with inline verification for tight feedback loops
3. **Living document** - Checkboxes show progress; any session can pick up where the last one left off

## Philosophy

- **Self-contained context**: Architecture section must include all details needed to implement without prior conversation history
- **Task-level verification**: Each task is independently verifiable with inline checks for tight feedback loops
- **TDD core loop**: Each task is a vertical slice — RED (write failing test), GREEN (minimal code to pass), CHECK (verify). One behavior per task.
- **Refactor after GREEN**: After each task goes green, pause. Extract duplication, deepen modules, clean up. Run tests after each refactor step. Never refactor while RED.
- **Enough detail for LLM implementation**: Include code structure and patterns, not full code
- **Actionable and granular**: Break work down to specific actions an LLM can execute
- **Living document**: Checkboxes track progress; the plan is the source of truth across sessions

## Plan Structure

### Specification Sections (Beginning)

**Overview** - What we're building and why

**Success Criteria** - Requirements that must pass for implementation to be successful. Checkboxes for acceptance criteria (functional, technical, and documentation). These define "done" for the entire implementation, verified at the end.

**What We're NOT Doing** - Explicit scope boundaries

**Risks & Blockers** - What could go wrong, what we don't know yet, dependencies

**Branch & Commit Strategy** - Branch naming, commit granularity, PR approach (see [git-strategy](./git-strategy.md))

**Architecture** - Technical design with enough detail but not full code:
- Database/Storage (if applicable) - Schema changes, migrations with key snippets
- API/Backend (if applicable) - Endpoints, services with function signatures
- Frontend/UI (if applicable) - Components, state management with component structure
- Data flow and integration - How parts connect

**Testing Strategy** - Define the testing approach:
- What types of tests: unit, integration, e2e
- Test file locations and naming conventions
- Testing framework/tools
- Linting and code quality checks

### Implementation Checklist (Core)

Breaks work into **Phases → Tasks** with task-level verification.

**Phases** (optional):
- Use `### Phase N: [Name]` headings to group related tasks
- Each phase represents a major milestone or logical grouping

**Tasks**:
- Format: `- [ ] **Task N: [Description]**`
- Small, verifiable chunk of work that adds one behavior; usually touches 1-3 related files
- Atomic unit completable in one focused work session

**RED** (nested under tasks):
- Format: `  - RED: [Test to write] in [test file path]`
- Write a failing test that specifies the behavior for this task

**GREEN** (nested under tasks):
- Format: `  - GREEN: [Code change] in [source file path]`
- Minimal implementation to make the test pass

**CHECK** (nested under tasks):
- Format: `  - CHECK: [Command/verification] - [expected result]`
- Verification that proves the task is complete
- Include test execution and code quality checks (type-check, lint)

### Tracking Sections (End)

**Tracked Changes** - Record significant deviations during implementation with rationale

**References** - Links to tickets, brainstorms, similar implementations

## Planning Process

### 1. Context Gathering

Research the codebase deeply (see [researching-codebase](./researching-codebase.md)). Read files fully, include `file:line` references, identify patterns to follow.

### 2. Deep-Dive Alignment (90% Confidence Gate)

**Do NOT write any planning documents until you reach 90% confidence.**

After each round of questions, report confidence level:
> "Current confidence: X%. [Reason for gaps if below 90%]"

Keep asking until you could explain the plan back and the user would say "yes, exactly." Cover:
- Requirements clarity and edge cases
- Technical decisions and integration points
- Scope boundaries (what's in, what's out)
- Testing and verification strategy

Confidence levels:
- 30% - "I understand the high-level goal but not the edge cases or technical approach"
- 50% - "Requirements are clearer, but I'm unsure about integration points and testing strategy"
- 70% - "Technical approach is solid, still need clarity on [specific gaps]"
- 90% - "Ready to write planning docs. Remaining 10% will be discovered during implementation."

For complex plans where the lighter confidence gate isn't enough, use `rpi grill` (see [grilling](./grilling.md)). Grilling walks every branch of the decision tree exhaustively — use it when alignment is critical and misunderstanding would waste significant implementation effort.

### 3. Iterative Writing

Don't write the full plan in one shot. Propose structure first, get feedback, then fill in details. Wait for user confirmation before diving into detailed checklist.

## Code Snippets in Architecture

Include code structure to show patterns, not full implementation:

```typescript
async function handleUserCreate(req: Request): Promise<Response> {
  // 1. Validate input with zod schema
  // 2. Check authorization
  // 3. Create user in DB
  // 4. Return user object
}
```

---

## Plan Template

If saving, use `.thoughts/plans/YYYY-MM-DD-[ticket-or-issue-id-]<topic>.md`:

```markdown
---
date: YYYY-MM-DD
ticket: [ticket/issue number if applicable]
topic: Brief topic description
status: planned
---

# [Feature/Task Name] Implementation Plan

## Overview

[Brief description of what we're implementing and why.]

## Success Criteria

- [ ] [Functional requirement]
- [ ] [Technical requirement - e.g., "All existing tests pass"]
- [ ] [Quality requirement - e.g., "No linting errors"]
- [ ] [Documentation requirement]

## What We're NOT Doing

[Explicitly list out-of-scope items]

## Risks & Blockers

[What could go wrong, what we don't know yet, external dependencies needed before starting.]

## Branch & Commit Strategy

[Branch name, commit granularity, PR approach — see git-strategy.md]

## Architecture

[Technical design: data flow, component interactions, database changes if applicable. How parts connect.]

## Testing Strategy

**Test Types:** Unit / Integration / E2E
**Testing Framework:** [Jest / Vitest / etc.]
**Code Quality:** lint, type-check commands

## Implementation Checklist

### Phase 1: [Name]

- [ ] **Task 1: [Description]**
  - RED: Write test for [behavior] in `path/to/test.file`
  - GREEN: Implement [code change] in `path/to/source.file`
  - CHECK: `npm test` — test passes
  - CHECK: `npm run type-check` — no errors

- [ ] **Task 2: [Description]**
  - RED: Write test for [behavior] in `path/to/test.file`
  - GREEN: Implement [code change] in `path/to/source.file`
  - CHECK: `npm test` — test passes

---

## Tracked Changes

> Record significant deviations from the plan during implementation.

## References

- Related brainstorm: [path]
- Similar implementation: `file:line`
```

---

## Deep-Dive Questioning

Reference for confidence-building before writing any planning documents.

### Why This Matters

Every layer of translation loses fidelity:
- 100% alignment on the plan → ~80% alignment in code
- 90% alignment on the plan → ~60% alignment in code
- 80% alignment on the plan → code that misses the mark

### Question Categories

**Requirements Clarity:**
- What exactly does [ambiguous term] mean?
- What happens when [edge case]?
- What are the success/failure states?

**Technical Decisions:**
- Should this use [pattern A] or [pattern B]?
- Where should [component] live in the codebase?
- What existing code should this integrate with?

**Scope Boundaries:**
- Is [feature] in or out of scope?
- What's the MVP vs nice-to-have?
- What can be deferred to a follow-up?

**Testing & Verification (TDD Mindset):**
- For each requirement, what test would prove it works?
- What are the unit test boundaries for this feature?
- What manual verification is needed that can't be automated?
