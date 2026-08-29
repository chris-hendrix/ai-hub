# ai-hub — Coding Agent Hub

This repo is the single source of truth for both coding agents used in daily development: **opencode** and **pi**.
It houses their home dirs under `coding-agents/` and shared custom skills under `skills/`.

## Layout

```
ai-hub/
├── coding-agents/
│   ├── .opencode/          # opencode home — symlinked as ~/.opencode and ~/.config/opencode
│   │   ├── opencode.json   # global opencode config (agents, mcp, permissions)
│   │   ├── agents/         # opencode agent definitions (deep, fast, orchestrate)
│   │   ├── skills/         # rpi → ../../../skills/rpi (tracked)
│   │   └── .gitignore      # bin/, node_modules/, package*.json, bun.lock (runtime)
│   └── .pi/                # pi home — symlinked as ~/.pi
│       ├── .gitignore      # secrets + runtime + skills/* (pi skills are user-managed, not tracked)
│       └── agent/
│           ├── settings.json   # tracked (packages: pi-web-access, defaultProvider)
│           └── skills/         # gitignored — reinstall per-skill via `npx skills add <name> --agent pi`
├── skills/rpi/             # opencode skill source of truth (pi will get its own rpi extension separately)
├── .env.example            # required env vars (CONTEXT7_API_KEY, etc.)
├── install.sh              # migrate | install | uninstall | repair (supports opencode|pi|all)
└── Makefile               # make install / make opencode / make pi / migrate / repair / uninstall
```

## Symlink Topology

After `install.sh install` (or `migrate` on first run):

- `~/.opencode          → ~/git/ai-hub/coding-agents/.opencode`  (preserves `~/.zshrc` PATH entry `~/.opencode/bin`)
- `~/.config/opencode   → ~/git/ai-hub/coding-agents/.opencode`  (XDG bridge — opencode resolves config via `xdgConfig/opencode`)
- `~/.pi                → ~/git/ai-hub/coding-agents/.pi`

Both opencode config paths resolve to the **same physical dir**, so config merging is idempotent.

Shared skills: `skills/rpi` lives once at the repo root; opencode consumes it via a tracked **relative** intra-repo symlink:

- `coding-agents/.opencode/skills/rpi → ../../../skills/rpi`

pi skills are **user-managed** (`npx skills add <name> --agent pi`) and live gitignored in `coding-agents/.pi/agent/skills/` — reinstall per-skill after migration.

`~/.claude/skills` and `~/.agents/skills` are **untouched** — skills.sh keeps managing them.

## Sensitive / Untracked Files (never commit)

This repo houses whole home dirs, so secrets and runtime live **inside** the working tree. They are gitignored — do not `git add -f` them:

| Path (inside repo) | Why ignored | Source |
|--------------------|-------------|--------|
| `coding-agents/.pi/agent/auth.json` | pi API keys / tokens | `chmod 600` |
| `coding-agents/.pi/agent/models-store.json` | pi provider/model store | `chmod 600` |
| `coding-agents/.pi/agent/sessions/` | conversation history | machine-specific |
| `coding-agents/.pi/web-search-cache/` | search cache | ephemeral |
| `coding-agents/.opencode/bin/` | opencode binary (189 MB) + helper tools | regenerated via install |
| `coding-agents/.opencode/node_modules/` | opencode plugin deps (`@opencode-ai/plugin`) | `bun install` |
| `coding-agents/.pi/agent/bin/` | pi helper binaries (`rg`, `fd`) | regenerated |
| `coding-agents/.pi/agent/npm/` | pi extension install dir | regenerated from `settings.json:packages` |
| `*.env`, `*.key`, `*.pem`, `*.token` | generic secrets | — |

Verify before pushing: `git ls-files | grep -E "auth\.json|models-store|\.env"` should be empty. `git check-ignore coding-agents/.pi/agent/auth.json` should match.

## Maintenance

```sh
make install    # idempotent — (re)create the 3 home symlinks + skill links (fresh clone or re-run)
make repair     # fix intra-repo skill links + rewrite pi skills.sh absolute links + prune circular links
make migrate    # one-time: backup homes → move content into repo → flip symlinks (see install.sh)
make uninstall  # remove symlinks, restore .bak-* if present
```

## Hazard: `git clean -fdx`

Because whole home dirs are symlinked into the repo, a `git clean -fdx` inside `ai-hub` would **delete gitignored secrets/sessions/binary** living under `coding-agents/` — including `auth.json` and the `~/.opencode/bin/opencode` binary. Do not run `git clean -fdx` in this repo. Use `git clean -fdx --dry-run` to preview, or `git clean -fd` (without `-x`) to keep ignored files.

Backups from `migrate` are at `~/.opencode.bak-*`, `~/.config/opencode.bak-*`, `~/.pi.bak-*` — delete them only after you have verified the hub works.

## Adding a New Skill

1. Add `skills/<name>/SKILL.md` (per opencode skill spec: `name`, `description` frontmatter).
2. Symlink it into both agents:
   - `ln -s ../../../skills/<name> coding-agents/.opencode/skills/<name>`
   - `ln -s ../../../../skills/<name> coding-agents/.pi/agent/skills/<name>`
3. `make repair` to verify; `git add` the new dir + symlinks.

## Conventions

- Do not commit `bin/`, `node_modules/`, `package*.json`, `bun.lock` under `coding-agents/.opencode/` — they are opencode-managed runtime.
- Do not commit `npm/` or `bin/` under `coding-agents/.pi/agent/` — pi-managed runtime.
- `coding-agents/.opencode/.gitignore` is **committed**; opencode's `ensureGitignore` only writes it when missing, so ours is preserved (and includes the extra `bin/` entry).
