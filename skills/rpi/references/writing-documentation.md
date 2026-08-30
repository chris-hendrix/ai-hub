# Writing Documentation

Documents in `.thoughts/` are written via `skills/rpi/scripts/rpi` — don't hand-write YAML or filenames.

```bash
printf '%s' "$BODY" | skills/rpi/scripts/rpi write --type <type> --topic "..." [--ticket N]
```

The script picks the date, subdir, filename, and frontmatter. See `rpi --help` for `--status`/`--artifact` overrides. For workflow-specific structures, see:
- [brainstorming](./brainstorming.md) · [planning](./planning.md) · [evaluating](./evaluating.md) · [handoff](./handoff.md)

## Subdirectories

| `write --type` | Subdir |
|----------------|--------|
| `brainstorm` | `.thoughts/brainstorms/` |
| `plan` | `.thoughts/plans/` |
| `evaluate` | `.thoughts/evaluations/` |
| `implement` | `.thoughts/implementations/` |
| `handoff` | `.thoughts/handoffs/` |
