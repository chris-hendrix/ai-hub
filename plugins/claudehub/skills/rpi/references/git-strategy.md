# Git & Branch Strategy

Situational guidance for structuring git workflow during implementation. Use judgment to determine what's appropriate for the scope and risk of the task.

## Questions to Consider

- How many tasks are in this plan? (1 task = simpler strategy, 10+ tasks = need discipline)
- Are there any irreversible operations? (migrations, deploys → more careful strategy)
- Is this a solo or team effort? (solo can be looser, team needs convention)
- What's the branch protection policy of the target repo?

## Common Approaches

### Single Feature Branch (most common)

```
feat/short-description
```

- Create one branch from `main`
- Commit after each GREEN cycle (or after each task)
- Squash merge back to `main` with a clean PR description
- Good for: most features, solo work, small-medium plans

### Per-Phase Branches

```
feat/short-description/phase-1-auth
feat/short-description/phase-2-ui
```

- One branch per phase
- Merge each sequentially into a parent feature branch
- Good for: large multi-phase plans, team work, long-running features

### Trunk-Based (no branch)

- Commit directly to `main` (or short-lived feature branch)
- Frequent tiny commits after each green cycle
- Requires passing CI and team agreement
- Good for: very small changes, tight CI/CD with good test coverage

## Commit Granularity

| Granularity | When | Commit message |
|-------------|------|----------------|
| Per green cycle | After each GREEN passes | `feat: add user login validation` |
| Per task | After each task completes and checks pass | `feat: implement auth flow` |
| Per phase | After full phase and refactor done | `feat: phase 1 - auth` |

Default recommendation: **commit after each GREEN cycle**. Creates a clean audit trail and makes reverts precise.

## PR Description Template

When creating a PR, include:
1. Summary of changes
2. Link to plan document
3. Verification steps / test results
