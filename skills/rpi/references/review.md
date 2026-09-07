# Review

Review a plan (or any artifact) and report findings as a list — each finding: what, where (section/line), severity (blocking / should-fix / nit), and a concrete suggestion. Output stays in-chat; persist with `write` only if the user asks.

Review against these dimensions:

- **Completeness** — covers the goal, requirements, edge cases.
- **Feasibility** — architecture works, matches the codebase as it exists.
- **Clarity** — executable by an agent with no conversation history; no ambiguity.
- **Verifiability** — every task has a CHECK that proves it.
- **Scope** — missing pieces and over-building.
- **Sequencing** — tasks runnable in order; dependencies hold.

Read the relevant code before claiming something doesn't match it.

End with a verdict:

- ✅ **Approved** — no findings beyond nits
- 💡 **Approved with suggestions** — nits and should-fixes; nothing blocking
- 🚫 **Changes requested** — one or more blocking findings

When subagents are available, run the review in one — a reviewer without the author's conversation history judges the plan on its own terms. Otherwise, review from the plan document alone, deliberately ignoring the session's context.

A verdict goes stale the moment the plan changes materially after it — say so and recommend re-review instead of carrying the old approval forward.
