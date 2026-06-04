# Writing Documentation

Create markdown documents in the `.thoughts/` folder.

Nothing is saved automatically. Run `/rpi write` when ready to persist the current output.

**For implementation plans**: See [planning](./planning.md).

## Naming Convention

Files follow this pattern:
```
yyyy-mm-dd-[ticket-or-issue-id-]short-description.md
```

Examples:
- `2025-01-15-api-rate-limiting-research.md`
- `2025-01-15-auth-refactor-plan.md`

## Organization

Documents can be organized into subdirectories. Common examples:

| Subdir | Content |
|--------|---------|
| `plans/` | Implementation plans, roadmaps |
| `research/` | Investigations, analysis |
| `brainstorms/` | Design explorations |
| `implementations/` | Post-implementation summaries |

## `/rpi write` Auto-Detection

When the user runs `/rpi write`, determine the correct subdirectory based on what was just produced:

| Workflow completed | Subdirectory |
|-------------------|-------------|
| brainstorm | `.thoughts/brainstorms/` |
| plan | `.thoughts/plans/` |
| evaluate | `.thoughts/evaluations/` |
| implement | `.thoughts/implementations/` |

Use the existing output content to auto-detect the type if unclear. Fall back to asking the user.

## Document Requirements

- Filename starts with today's date (`YYYY-MM-DD-`)
- Short description uses kebab-case
- Include YAML frontmatter with `date` and `topic` fields
- Let content structure emerge from user's needs rather than over-templating

## Getting Today's Date

Always get the current date dynamically - never rely on internal knowledge which may be stale:

```bash
date +%Y-%m-%d
```

Use the output for both the filename prefix and the frontmatter `date` field.

## Frontmatter

| Field | Description |
|-------|-------------|
| `date` | Creation date (YYYY-MM-DD) |
| `topic` | Human-readable title/subject |
