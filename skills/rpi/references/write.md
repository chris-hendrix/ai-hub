# Write

Persist via `skills/rpi/scripts/rpi write --type <type> --topic "<title>"` — body on stdin. If the last message is already the artifact, pass it through unchanged — don't regenerate.

The script owns everything mechanical: filename (`timestamp[-ticket-]title`), frontmatter (type, date, topic, status, sessions), and subdirs:

| `--type` | Subdir |
|----------|--------|
| `plan` | `.rpi/plans/` |
| `review` | `.rpi/reviews/` |
| `implement` | `.rpi/implementations/` |
| `handoff` | `.rpi/handoffs/` — writes immediately; chain of past session ids is maintained automatically |
