# Scratch

Persist via `rpi scratch [--topic "<topic>"]` — no stdin, no body. Never use the file write tool for `.rpi/` docs — always this CLI.

The script owns everything mechanical: filename (`timestamp[-kebab-topic]`), frontmatter, and the `.rpi/scratch/` dir. `--topic` is optional:

| `--topic` | Frontmatter `topic:` | Filename |
|-----------|----------------------|----------|
| given | the topic, verbatim | lowercase kebab-case slug appended, capped at 50 chars |
| omitted | `-` | timestamp only |

Result is frontmatter-only (`type: scratch`, `date`, `topic`) with no body — a placeholder for the user to fill in themselves.
