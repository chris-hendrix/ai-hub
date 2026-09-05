# Write

Persist via `skills/rpi/scripts/rpi write <subdir> --topic "<title>"` — body on stdin (first arg is the subdir: `plans|reviews|implementations|handoffs`). If the last message is already the artifact, pass it through unchanged — don't regenerate.

The script owns everything mechanical: filename (`timestamp[-ticket-]title`), frontmatter, and subdirs. Frontmatter varies by type — `status` only for plans (`planned`) and handoffs (`handed-off`); `sessions` chain only for handoffs. Flags: `--ticket`, `--status`.

| `--type` | Subdir |
|----------|--------|
| `plan` | `.rpi/plans/` |
| `review` | `.rpi/reviews/` |
| `implement` | `.rpi/implementations/` |
| `handoff` | `.rpi/handoffs/` — writes immediately; chain of past session ids is maintained automatically |
