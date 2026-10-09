# ai-hub — Coding Agent Hub

This repo is the single source of truth for both coding agents used in daily development: **opencode** and **pi**.
It houses their home dirs under `harness/` and shared custom skills under `skills/`.

## Layout

```
ai-hub/
├── harness/
│   ├── .opencode/          # opencode home — symlinked as ~/.opencode and ~/.config/opencode
│   │   ├── opencode.json   # global opencode config (agents, mcp, permissions)
│   │   ├── agents/         # opencode agent definitions (deep, fast, orchestrate)
│   │   ├── skills/         # rpi → ../../../skills/rpi (tracked)
│   │   └── .gitignore      # bin/, node_modules/, package*.json, bun.lock (runtime)
│   └── .pi/                # pi home — symlinked as ~/.pi
│       ├── .gitignore      # secrets + runtime + skills/* (pi skills are user-managed, not tracked)
│       └── agent/
│           ├── settings.json   # tracked (modes, agentOverrides, defaultProvider)
│           ├── agents/         # tracked tier agents: deep/mid/fast/view (*.md = single source)
│           ├── extensions/     # tracked (modes.ts = tier modes; subagent-status.ts = footer status)
│           └── skills/         # gitignored — reinstall per-skill via `npx skills add <name> --agent pi`
├── skills/rpi/             # opencode skill source of truth (pi will get its own rpi extension separately)
├── packages/pi-torch/      # publishable pi package: /handoff + /pickup (sessions are the only storage)
├── .env.example            # required env vars (CONTEXT7_API_KEY, etc.)
├── install.sh              # migrate | install | uninstall | repair (supports opencode|pi|all)
└── Makefile               # make install / make opencode / make pi / migrate / repair / uninstall
```

## Symlink Topology

After `install.sh install` (or `migrate` on first run):

- `~/.opencode          → ~/git/ai-hub/harness/.opencode`  (preserves `~/.zshrc` PATH entry `~/.opencode/bin`)
- `~/.config/opencode   → ~/git/ai-hub/harness/.opencode`  (XDG bridge — opencode resolves config via `xdgConfig/opencode`)
- `~/.pi                → ~/git/ai-hub/harness/.pi`

Both opencode config paths resolve to the **same physical dir**, so config merging is idempotent.

Shared skills: `skills/rpi` lives once at the repo root; opencode consumes it via a tracked **relative** intra-repo symlink:

- `harness/.opencode/skills/rpi → ../../../skills/rpi`

pi skills are **user-managed** (`npx skills add <name> --agent pi`) and live gitignored in `harness/.pi/agent/skills/` — reinstall per-skill after migration.

`~/.claude/skills` and `~/.agents/skills` are **untouched** — skills.sh keeps managing them.

## Sensitive / Untracked Files (never commit)

This repo houses whole home dirs, so secrets and runtime live **inside** the working tree. They are gitignored — do not `git add -f` them:

| Path (inside repo) | Why ignored | Source |
|--------------------|-------------|--------|
| `harness/.pi/agent/auth.json` | pi API keys / tokens | `chmod 600` |
| `harness/.pi/agent/models-store.json` | pi provider/model store | `chmod 600` |
| `harness/.pi/agent/sessions/` | conversation history | machine-specific |
| `harness/.pi/web-search-cache/` | search cache | ephemeral |
| `harness/.opencode/bin/` | opencode binary (189 MB) + helper tools | regenerated via install |
| `harness/.opencode/node_modules/` | opencode plugin deps (`@opencode-ai/plugin`) | `bun install` |
| `harness/.pi/agent/bin/` | pi helper binaries (`rg`, `fd`) | regenerated |
| `harness/.pi/agent/npm/` | pi extension install dir | regenerated from `settings.json:packages` |
| `harness/.pi/agent/install/` | pi self-update runtime (`releases/`, `staging/`) | regenerated on `pi update` |
| `harness/.pi/agent/mode-state.json` | last-used pi tier mode (session resume) | written by `extensions/modes.ts` |
| `*.env`, `*.key`, `*.pem`, `*.token` | generic secrets | — |

Verify before pushing: `git ls-files | grep -E "auth\.json|models-store|\.env"` should be empty. `git check-ignore harness/.pi/agent/auth.json` should match.

## Pi packages

`packages/pi-torch/` is a publishable pi package (`keywords: ["pi-package"]`), not a loose extension — `harness/.pi/agent/extensions/` no longer holds `handoff.ts`. It is loaded from `harness/.pi/agent/settings.json`:

```json
"packages": ["../../git/ai-hub/packages/pi-torch"]
```

**Gotcha:** pi resolves a relative local package path from the settings file *as the process sees it* — through the `~/.pi` symlink, not the repo's real path. From `~/.pi/agent/`, two levels up is `~`. A path that is correct from the repo's real path (`../../../packages/pi-torch`) resolves to `/home/packages/pi-torch` and **fails silently** (the entry appears in `pi list` with no resolved path).

Develop with:

```sh
cd packages/pi-torch && bash scripts/link-types.sh   # dev-only type links
cd packages/pi-torch && node --test && npx tsc --noEmit
```

`scripts/link-types.sh` contains machine-absolute paths and is deliberately excluded from the published tarball (`files` is a narrow allowlist).

## Maintenance

```sh
make install    # idempotent — (re)create the 3 home symlinks + skill links (fresh clone or re-run)
make repair     # fix intra-repo skill links + rewrite pi skills.sh absolute links + prune circular links
make migrate    # one-time: backup homes → move content into repo → flip symlinks (see install.sh)
make uninstall  # remove symlinks, restore .bak-* if present
```

## Hazard: `git clean -fdx`

Because whole home dirs are symlinked into the repo, a `git clean -fdx` inside `ai-hub` would **delete gitignored secrets/sessions/binary** living under `harness/` — including `auth.json` and the `~/.opencode/bin/opencode` binary. Do not run `git clean -fdx` in this repo. Use `git clean -fdx --dry-run` to preview, or `git clean -fd` (without `-x`) to keep ignored files.

Backups from `migrate` are at `~/.opencode.bak-*`, `~/.config/opencode.bak-*`, `~/.pi.bak-*` — delete them only after you have verified the hub works.

## Adding a New Skill

1. Add `skills/<name>/SKILL.md` (per opencode skill spec: `name`, `description` frontmatter).
2. Symlink it into both agents:
   - `ln -s ../../../skills/<name> harness/.opencode/skills/<name>`
   - `ln -s ../../../../skills/<name> harness/.pi/agent/skills/<name>`
3. `make repair` to verify; `git add` the new dir + symlinks.

## Conventions

- Do not commit `bin/`, `node_modules/`, `package*.json`, `bun.lock` under `harness/.opencode/` — they are opencode-managed runtime.
- Do not commit `npm/` or `bin/` under `harness/.pi/agent/` — pi-managed runtime.
- `harness/.pi/agent/settings.json`, `harness/.pi/agent/agents/*.md`, and `harness/.pi/agent/extensions/*.ts` are living config — editing tiers (agentOverrides doubles as the mode list; `hiddenModes` keeps a tier for subagents but out of the mode cycle), tier models, status `color`s, or instructions is a normal part of a change. Commit them together with the feature that prompted them; don't treat them as off-limits or ask before committing. (Only the gitignored secrets/runtime listed above are never committed.)
  - `agentOverrides.<tier>.model` may also change at runtime when a mode's model is switched (`/model` while in a mode) — such diffs are expected and safe to commit.
