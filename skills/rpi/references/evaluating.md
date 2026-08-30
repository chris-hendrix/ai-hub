# Evaluating

Assess artifacts across contextually relevant quality dimensions, with concrete upgrade paths to 10/10.

## Principles

- **Context-driven dimensions** — Select 5–7 based on artifact type, audience, success criteria, and failure modes. No fixed rubric.
- **Target excellence** — 10/10 is the standard. Anything below 9 needs specific upgrades.
- **Parallel evaluation** — Assess each dimension independently to avoid bias.
- **Surgical revision** — Preserve voice and structure; only fix what's weak.

## Dimension Selection

Propose dimensions based on what matters for *this* artifact. Get user confirmation before evaluating.

## Evaluation Format

For each dimension:

### [Dimension Name] — X/10
**Why this dimension**: 1–2 sentences on relevance
**What's working**: Specific strengths
**What's missing**: Specific gaps
**Upgrade to 10/10**: Concrete actions

## Revision Guidelines

Preserve structure, voice, and core content. Only upgrade weak dimensions. Default to surgical edits, not rewrites. Show changes clearly.

---

## Evaluation Template

Body for `rpi write --type evaluate --topic "..." --artifact <path>` (frontmatter handled by the script):

```markdown
# [Topic Title]

## Overview
[What was evaluated...]

## Dimensions

### [Dimension 1] — X/10
**Why this dimension**: ...
**What's working**: ...
**What's missing**: ...
**Upgrade to 10/10**: ...

## Summary
[Overall assessment and recommendations...]
```
