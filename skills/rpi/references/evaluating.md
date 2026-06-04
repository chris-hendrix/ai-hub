# Evaluating

Assess artifacts across contextually relevant quality dimensions, with concrete upgrade paths to 10/10.

## Purpose

Evaluation assesses the quality of outputs (code, documentation, designs, plans) across multiple dimensions to identify gaps and provide actionable paths to excellence.

## Principles

- **Context-driven dimensions** - Select 5-7 dimensions based on the artifact type and purpose. No fixed rubric.
- **Target excellence** - 10/10 is the standard. Anything below 9 requires specific, actionable upgrades.
- **Parallel evaluation** - Assess each dimension independently to avoid bias bleeding between scores.
- **Surgical revision** - When upgrading, preserve voice and structure. Only fix what's weak.

## Dimension Selection

Propose dimensions based on what matters for *this specific artifact*. Consider:
- Artifact type (code, documentation, design, communication)
- Intended audience
- Success criteria
- Common failure modes

Get user confirmation before evaluating. They may have context on what matters most.

## Evaluation Format

For each dimension:

### [Dimension Name] — X/10
**Why this dimension**: 1-2 sentences on relevance
**What's working**: Specific strengths observed
**What's missing**: Specific gaps identified
**Upgrade to 10/10**: Concrete actions to close gaps

## Revision Guidelines

When creating a 10/10 version:
- Preserve original structure, voice, and core content
- Only upgrade what's necessary for weak dimensions
- Default to surgical edits, not rewrites
- Show changes clearly so the user can learn

---

## Evaluation Template

If saving, use `.thoughts/evaluations/YYYY-MM-DD-<topic>.md` with this structure:

```markdown
---
date: YYYY-MM-DD
topic: Brief topic description
artifact: Type of artifact evaluated
---

# [Topic Title]

## Overview

[Brief description of what was evaluated...]

## Dimensions

### [Dimension 1] — X/10
**Why this dimension**: ...
**What's working**: ...
**What's missing**: ...
**Upgrade to 10/10**: ...

### [Dimension 2] — X/10
...

## Summary

[Overall assessment and key recommendations...]
```
