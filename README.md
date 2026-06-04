# Skills

Agent skills installable via [skills.sh](https://skills.sh).

## Install

```bash
# All skills
npx skills add chris-hendrix/skills

# Individual skills
npx skills add chris-hendrix/skills --skill rpi
npx skills add chris-hendrix/skills --skill grill-me
```

## Skills

### rpi — Brainstorm, Plan, Evaluate, Implement

Consolidated workflow for structured development. [Reference](skills/rpi/SKILL.md)

| Keyword | Description |
|---------|-------------|
| `brainstorm` | Explore approaches and decide on a direction |
| `plan` | Create a TDD-structured implementation plan |
| `evaluate` | Assess artifacts across quality dimensions with upgrade paths |
| `handoff` | Summarize the session into a handoff doc for another agent |
| `pickup` | Resume work from a handoff document |
| `implement all` | Execute all phases of a plan |
| `implement phase N` | Execute a specific phase |
| `write` | Save output to `.thoughts/` |

### grill-me — Stress-Test Plans & Designs

Relentlessly interviews about a plan or design until every decision is resolved. [Reference](skills/grill-me/SKILL.md)

Triggers when asking for feedback, a review, or saying "grill me", "challenge my thinking", "what am I missing", etc.
