# Brainstorming Ideas Into Designs

Turn rough ideas into fully formed designs through natural collaborative dialogue.

**Optional.** For simple or well-understood changes, skip straight to plan.

## Purpose

Explore alternatives and make an informed decision — not detailed implementation steps. Outputs:

- Understanding of what currently exists (codebase/dependencies)
- 2–3 approaches with trade-offs
- A chosen approach with rationale

Detailed architecture and tasks belong in the plan (created with `rpi plan`).

## Research

Research both codebase and web when the task spans existing code + new tech.

- **Codebase** ([researching-codebase](./researching-codebase.md)): when modifying existing features — understand patterns, reusable components.
- **Web** ([researching-web](./researching-web.md)): when evaluating new libraries — check current best practices, latest docs, maintenance status. Always verify; LLM knowledge may be outdated.

## Principles

- **One question at a time** — each answer informs the next.
- **Multiple choice preferred** — bounded options accelerate decisions.
- **Research before recommending** — verify via web search, don't rely on dated knowledge.
- **YAGNI ruthlessly** — challenge every feature.
- **Minimal code** — 5–10 line snippets only when needed; focus on trade-offs.
- **Explore alternatives** — 2–3 approaches before settling (1–2 for simple problems).
- **Incremental validation** — present in sections (~200–300 words), validate each.

## Understanding the Objective

Before exploring alternatives, get explicit confirmation on:

1. **Objective** — What are we trying to achieve?
2. **Success Criteria** — What does success look like?

Present your understanding, then ask: "Does this accurately capture what we're trying to achieve?"

## Questioning

Prefer multiple choice — easier to answer, keeps momentum. Reserve open-ended for truly exploratory topics. Ask sequentially, not in batches.

## Exploring Approaches

Present 2–3 approaches with trade-offs. Lead with the recommended option.

Common patterns: **Minimal** (smallest viable, low risk) · **Balanced** (pragmatic middle) · **Comprehensive** (full-featured, long-term).

When dependencies are involved, research current best practices before presenting options.

## Presenting Designs

Break into digestible sections (~200–300 words), validate after each. Cover architecture, components, data flow, error handling, testing as relevant.

---

## Brainstorm Document Structure

Body for `rpi write --type brainstorm --topic "..."` (frontmatter/filename handled by the script):

```markdown
# [Topic]

## Context
[Why — business motivation, constraints.]

## Objective
[What we're trying to achieve.]

## Success Criteria
- Criterion 1

## What Exists

**Relevant Files:** `path/to/file.ts:123` — description
**Current Patterns:** [architectural patterns]
**External Dependencies:** *(if any)* Library — [docs](url) — purpose

## Approaches Considered

### Approach 1: [Name] (Recommended)
**Description:** [what it does]
**Pros:** …
**Cons:** …
**Trade-offs:** [why these matter]

### Approach 2: [Name]
[Similar]

## Decision
**Selected Approach:** [name] — **Rationale:** [why]

## Risks & Unknowns
- [risk/unknown — feeds the plan phase]
```
