---
name: ytm
description: "Use the `ytm` CLI for YouTube Music: search songs, view playlists, list liked songs, rate songs (like/dislike/unlike), create playlists and add songs. Use when the user asks about YouTube Music, songs, playlists, liked music, or rating tracks. Mutations allowed — never delete anything (no delete commands exist)."
---

# ytm — YouTube Music via CLI

## Setup (one-time auth)

Auth = browser cookie at `~/.config/ytm/browser.json` (`chmod 600`), already
configured on this machine. Full walkthrough (fresh machine, cookie refresh,
OAuth-spare notes): [references/setup.md](references/setup.md).

> OAuth is broken upstream since ~Aug 2025 (ytmusicapi#813) — don't try to
> "fix" auth by re-running the oauth flow; refresh the cookie instead.

## Rules

- **Never delete.** No delete commands exist in this CLI (no `delete_playlist`, `remove_playlist_items`, history removal, or unsubscribes). If asked to delete anything, refuse and point at the YouTube Music app.
- Resolve IDs with search/list first; never guess IDs. The CLI is stateless — search, take the printed `videoId`/`playlistId`, pass it explicitly.
- `--json` on read commands (`doctor`, `search`, `playlists`, `playlist`, `liked`) for machine-readable output; text output is the default.
- `unlike` / `undislike` set the rating to INDIFFERENT — they clear a rating, they do not delete content.

## Invocation

```bash
uv run --project ~/git/ai-hub/cli/ytm ytm ...
```

(If the user has the optional alias: `alias ytm='uv run --project ~/git/ai-hub/cli/ytm ytm'` in `~/.zshrc`.)

## Commands

| Command | What it does |
|---|---|
| `ytm doctor [--json]` | Confirm auth, print account name/handle |
| `ytm search QUERY [--limit N] [--filter songs] [--json]` | Search (default 10 results, IDs printed) |
| `ytm playlists [--json]` | List library playlists |
| `ytm playlist PLAYLIST_ID [--json]` | Show playlist contents/tracks |
| `ytm liked [--json]` | List liked songs |
| `ytm like QUERY\|VIDEO_ID [--id ID]` | Rate a song LIKE (search term resolves to top songs result, or pass `--id`) |
| `ytm dislike QUERY\|VIDEO_ID [--id ID]` | Rate a song DISLIKE |
| `ytm unlike QUERY\|VIDEO_ID [--id ID]` | Clear a LIKE (sets INDIFFERENT) |
| `ytm undislike QUERY\|VIDEO_ID [--id ID]` | Clear a DISLIKE (sets INDIFFERENT) |
| `ytm create-playlist --title T [--description D] [--privacy private\|public\|unlisted]` | Create playlist (default `private`), prints playlistId |
| `ytm add PLAYLIST_ID QUERY...` | Resolve each query to a videoId, add all in one call |

```bash
uv run --project ~/git/ai-hub/cli/ytm ytm search "weird fishes"
uv run --project ~/git/ai-hub/cli/ytm ytm search "radiohead" --filter songs --limit 5
uv run --project ~/git/ai-hub/cli/ytm ytm playlists
uv run --project ~/git/ai-hub/cli/ytm ytm playlist PLabc123
uv run --project ~/git/ai-hub/cli/ytm ytm liked
uv run --project ~/git/ai-hub/cli/ytm ytm like "weird fishes"
uv run --project ~/git/ai-hub/cli/ytm ytm like --id 4oU8HFevxAc
uv run --project ~/git/ai-hub/cli/ytm ytm unlike "weird fishes"
uv run --project ~/git/ai-hub/cli/ytm ytm create-playlist --title "Focus" --privacy private
uv run --project ~/git/ai-hub/cli/ytm ytm add PLabc123 "weird fishes" "reckoner"
```

## Troubleshooting

- Missing credentials → save `~/.config/ytm/browser.json` per Setup above; full steps in `cli/ytm/README.md`.
- Auth suddenly stops working → cookie expired; redo the Setup steps, then `ytm doctor`.
