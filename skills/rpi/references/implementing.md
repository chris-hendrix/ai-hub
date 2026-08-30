# Implementing

Execute from plans with mandatory review checkpoints. The plan file is the source of truth — checkboxes show progress, any session can resume where the last left off.

## Philosophy

- **Critical review before starting**: Read plans skeptically; raise concerns before executing.
- **TDD**: Each task RED (failing test) → GREEN (minimal pass). See [planning](./planning.md).
- **Commit after GREEN**: Clean audit trail (see [git-strategy](./git-strategy.md)).
- **Refactor after GREEN**: Pause, dedupe, deepen. Run tests after each step. Never refactor while RED.
- **Phase-by-phase**: Complete one phase fully before the next. Get sign-off at phase boundaries.
- **Fail fast**: Stop on blockers; don't proceed speculatively.

## Phase Processing

1. **Load phase** — review tasks.
2. **Task by task** — RED → GREEN → CHECK → commit. Update the plan file as you go.
3. **Refactor after phase** — look for extraction opportunities.
4. **Verify phase** — run checks, get sign-off.
5. **Next phase**.

Halt on missing dependencies, failing assumptions, or unclear instructions.

## Implementing from a Plan

**Continuously update the plan file.** Checkboxes and status enable cross-session resume.

### What to update

- **Checkboxes** — replace `- [ ]` with `- [x]` as you complete RED/GREEN/CHECK and whole tasks.
- **Status** — `scripts/rpi status <plan> in-progress` when starting, `scripts/rpi status <plan> completed` when done (don't hand-edit frontmatter).
- **Resume point** — `scripts/rpi next <plan>` prints the first unchecked task.
- **Tracked Changes** — record significant deviations (architecture shifts, added/removed phases). Don't log minor refactors.

Example:

```markdown
## Tracked Changes

**2026-01-15** — Switched auth from JWT to sessions (token-refresh complexity). Updated Phase 2.
```

### Task Verification

Each task: RED → GREEN → CHECK → commit.

1. **RED**: Write the test, verify it fails.
2. **GREEN**: Minimal implementation, verify it passes.
3. **CHECK**: All verification commands pass. Debug until they do.
4. **Commit** after GREEN.

If context grows large, suggest stopping and resuming via `rpi pickup` in a fresh session.

### Completion

When all tasks complete: run full verification, present remaining manual steps, suggest a [handoff](./handoff.md) if follow-up work remains, and ask: **"Save an implementation summary to .thoughts/implementations/?"** If yes, write via `scripts/rpi write --type implement --topic "..."` with files changed, decisions, deviations, verification results, and a link to the plan.
