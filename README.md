# ai-hub

Shared coding-agent hub. Tracks configuration for both coding agents (**opencode** + **pi**) and custom skills in one repo, with whole-dir symlinks into `$HOME`.

Also available via [skills.sh](https://skills.sh).

## What's here

| Dir | Contents | Install |
|-----|----------|---------|
| `coding-agents/.opencode/` | opencode home: `opencode.json`, `agents/` (deep, fast, orchestrate), `skills/` | `~/.opencode` + `~/.config/opencode` symlinks |
| `coding-agents/.pi/` | pi home: `agent/settings.json`, `agent/skills/` | `~/.pi` symlink |
| `skills/` | Shared custom skills — source of truth for **both** agents (currently `rpi`) | intra-repo symlinks into `coding-agents/.opencode/skills` + `coding-agents/.pi/agent/skills` |
| `.env.example` | Required env vars (`CONTEXT7_API_KEY`, etc.) | copy to `~/.zshrc` or export |

## Agents

| Agent | Model | Purpose |
|-------|-------|---------|
| **deep** | deepseek-v4-pro | Complex tasks: implementation, debugging, architecture, code review |
| **fast** | deepseek-v4-flash | Simple tasks: file search, basic edits, lint fixes, lookups |
| **orchestrate** | deepseek-v4-pro | Central dispatch: plans, delegates, and verifies all work |

Note: `view` was merged/removed — image analysis is handled by `deep`/`fast`.

## Skills

| Skill | Description |
|-------|-------------|
| **rpi** | Brainstorm, Plan, Evaluate, Grill, Implement workflow |

### Install via skills.sh

```bash
# All hub skills
npx skills add chris-hendrix/ai-hub

# Single skill
npx skills add chris-hendrix/ai-hub --skill rpi
```

Hub skills are also available as `skills/rpi` in this repo and symlinked into both agent homes (`coding-agents/.opencode/skills/rpi`, `coding-agents/.pi/agent/skills/rpi`). skills.sh keeps managing `~/.agents/skills` and `~/.claude/skills` untouched.

## Install

### Fresh machine (no existing homes)

```bash
git clone https://github.com/chris-hendrix/ai-hub.git ~/git/ai-hub
cd ~/git/ai-hub
make install            # creates ~/.opencode, ~/.config/opencode, ~/.pi symlinks + skill links
# or: ./install.sh install
```

### Existing machine (homes already on disk)

```bash
# Close running opencode / pi sessions first
make migrate            # backups → move content into repo → flip symlinks
# Backups land at ~/.opencode.bak-*, ~/.config/opencode.bak-*, ~/.pi.bak-*
# Verify with: opencode --version && opencode debug config | head -20
# Delete backups only after verifying. Restore via: make uninstall  (if symlinks still point into repo)
```

### Maintenance

```bash
make repair             # fix intra-repo skill links + rewrite pi skills.sh absolute links + prune circular links
make uninstall          # remove hub symlinks; restore .bak-* if present
make install            # idempotent — safe to re-run
```

Legacy alias: `make opencode` still works (→ `make install`).

## Hazard: `git clean -fdx`

Because whole home dirs are symlinked into the repo, `git clean -fdx` inside `ai-hub` would **delete gitignored secrets/sessions/binary** living under `coding-agents/` (e.g. `auth.json`, `~/.opencode/bin/opencode`).

- Do: `git clean -fd` (without `-x`) to keep ignored files, or `git clean -fdx --dry-run` to preview.
- Backups from `migrate` live at `~/.opencode.bak-*` etc. — keep them until verified.

See `AGENTS.md` for the full symlink topology and "never commit" rules.
