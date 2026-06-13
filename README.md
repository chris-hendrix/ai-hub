# ai-hub

Agent definitions and installable skills for [opencode](https://opencode.ai).

Also available via [skills.sh](https://skills.sh).

## What's here

| Dir | Contents | Install |
|-----|----------|---------|
| `agents/` | opencode agent persona definitions (deep, fast, orchestrate) | `make opencode` |
| `skills/` | Trigger-based skill extensions (rpi, grill-me) | `npx skills add chris-hendrix/ai-hub` |

## Agents

| Agent | Model | Purpose |
|-------|-------|---------|
| **deep** | deepseek-v4-pro | Complex tasks: implementation, debugging, architecture, code review |
| **fast** | deepseek-v4-flash | Simple tasks: file search, basic edits, lint fixes, lookups |
| **orchestrate** | deepseek-v4-pro | Central dispatch: plans, delegates, and verifies all work |

### Install

```bash
make opencode              # symlink agents/ → ~/.config/opencode/agents/
make opencode uninstall    # remove symlinks
```

Handles adding, updating, and cleaning up stale symlinks when agents are added or removed from the repo.

## Skills

| Skill | Description |
|-------|-------------|
| **rpi** | Brainstorm, Plan, Evaluate, Implement workflow |
| **grill-me** | Stress-test plans and designs through relentless interviewing |

### Install

```bash
# All skills
npx skills add chris-hendrix/ai-hub

# Individual skills
npx skills add chris-hendrix/ai-hub --skill rpi
npx skills add chris-hendrix/ai-hub --skill grill-me
```
