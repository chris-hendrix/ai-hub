# Implementing

Execute implementation from plans, tickets or issues, or descriptions with mandatory review checkpoints.

**Multi-session implementation**: Large implementations span multiple sessions. The plan file is the source of truth - checkboxes show progress, and any session can resume where the previous one left off.

## Philosophy

- **Critical Review Before Starting**: Read plans skeptically. Assess confidence and raise concerns before executing.
- **TDD Execution**: Each task starts with RED (write failing test), then GREEN (minimal implementation). See [TDD methodology in planning](./planning.md).
- **Commit After GREEN**: Commit after each passing green cycle to keep a clean audit trail. See [git-strategy](./git-strategy.md).
- **Refactor After GREEN**: Pause after each task goes green. Extract duplication, deepen modules. Run tests after each refactor step. Never refactor while RED.
- **Phase-by-Phase Execution**: Complete one phase fully before moving to the next.
- **Mandatory Review Checkpoints**: Run success criteria after each phase, get user sign-off.
- **Fail Fast**: Stop on blockers rather than proceeding speculatively.

## Phase Confirmation & Resuming Work

After reviewing the plan, present phases and get user confirmation before starting. If resuming work from a previous session, identify where to start based on checkboxes in the plan file.

## Execution Model

**CRITICAL: Update the plan file continuously as you work.** The plan is a living document - check off items, record changes, update status. This enables resuming work across sessions.

### Phase Processing

Execute phases sequentially:

1. **Load phase**: Review the phase tasks
2. **Implement task by task**: For each task, execute RED → GREEN → CHECK → commit. Update the plan file as you go.
3. **Refactor after phase**: After all tasks in a phase pass, look for extraction and deepening opportunities. Run tests after each refactor step.
4. **Verify phase**: Run checks, get user sign-off
5. **Move to next phase**: Load the next phase

### Stop Conditions

Halt execution immediately when encountering:
- Missing dependencies or prerequisites
- Test failures that indicate broken assumptions
- Unclear or contradictory instructions

## Handling Deviations

When tasks cannot proceed as planned or a better approach is discovered, present options to the user and get approval before deviating. Update the plan file's Tracked Changes section with significant deviations.

## Phase Verification & Completion

After completing each phase, run phase-level checks (automated tests, manual verification) and get user sign-off before proceeding. When all phases complete, see the Completion & Summary Document section below.

---

## Implementing from a Plan

Treat the plan as a living document that tracks both progress and deviations during implementation.

**CRITICAL: You must actively update the plan file as you work.**

### What to Update in the Plan File

**Check off completed items** — replace `- [ ]` with `- [x]` as you complete them:
- **RED** - Check after writing the failing test
- **GREEN** - Check after implementing and test passes
- **CHECK** - Check after running verification commands and they pass
- **Tasks** - Check when all RED, GREEN, and CHECK items in the task are complete

**Update frontmatter status** (if the plan file has a `status` field):
- `status: planned` → `status: in-progress` (when starting first task)
- `status: in-progress` → `status: completed` (when all tasks done)

**Update Tracked Changes section** for significant deviations.

### Handling Deviations

When deviations occur:
1. Present the proposed change and reasoning to the user
2. Get approval
3. Update the affected sections in the plan file
4. Add entry to the "Tracked Changes" section

```markdown
## Tracked Changes

**2026-01-15** - Changed authentication approach from JWT to session-based auth. Original approach had issues with token refresh complexity. Updated Architecture and Phase 2 sections.
```

Record significant changes (architectural shifts, added/removed phases, major scope changes). Don't record minor refactors or variable renames.

### Resuming Work Across Sessions

When opening a plan file to continue work:

1. **Read the plan** - Architecture section provides all context needed
2. **Check progress** - Unchecked items show what remains
3. **Find starting point** - First unchecked task
4. **Continue implementation** - No prior session context needed

### Task Verification

Each task follows RED → GREEN → CHECK:
1. **RED**: Write the test. Verify it fails before proceeding.
2. **GREEN**: Write minimal implementation. Verify the test passes.
3. **CHECK**: Run all verification commands. All must pass before marking complete.
4. If checks fail: debug, fix, re-run until they pass.
5. **Commit** after GREEN passes.

**Natural Stopping Points**: If context is getting large, recommend stopping and resuming in a fresh session pointing at the plan file.

### Completion & Summary Document

When all tasks complete:

1. Run full verification suite
2. Present remaining manual verification steps to user
3. Ask: **"Save an implementation summary to .thoughts/implementations/?"**

If yes, write to `.thoughts/implementations/YYYY-MM-DD-<topic>.md`. Follow [writing-documentation](./writing-documentation.md) for naming and frontmatter. Include:
- What was implemented
- Files created/modified
- Key design decisions
- Deviations from original plan
- Verification results
- Link to original plan file
