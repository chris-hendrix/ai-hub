# Writing Documentation

Documents in `.thoughts/` are written via `skills/rpi/scripts/rpi` — don't hand-write YAML or filenames.

```bash
printf '%s' "$BODY" | skills/rpi/scripts/rpi write --type <type> [--topic "..."] [--ticket N]
```

The script picks the date, subdir, filename, and frontmatter. `--topic` is optional — without it the filename is a timestamp. See `rpi --help` for `--status`/`--artifact` overrides. For workflow-specific structures, see:
- [planning](./planning.md) · [evaluating](./evaluating.md) · [handoff](./handoff.md)

## Subdirectories

| `write --type` | Subdir |
|----------------|--------|
| `plan` | `.thoughts/plans/` |
| `review` | `.thoughts/reviews/` |
| `implement` | `.thoughts/implementations/` |
| `handoff` | `.thoughts/handoffs/` |
