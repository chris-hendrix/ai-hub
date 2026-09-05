# Pickup

Resume work from a handoff. Invoked via `rpi pickup [path]`.

Resolve the handoff with `scripts/rpi pickup [path]` — with a path it echoes it; without, it prints the most recent `.thoughts/handoffs/*.md` (pass `--list` for all, newest first; confirm with the user if ambiguous).

Then read the handoff, summarize it, and ask what to do next.
