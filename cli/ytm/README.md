# ytm — YouTube Music CLI

Single-file Python CLI wrapping [`ytmusicapi`](https://ytmusicapi.readthedocs.io/) (`==1.12.2`).
Query + safe mutations for YouTube Music: search, playlists, ratings. **No delete capability exists anywhere in this CLI.**

## One-time setup

Auth is via browser cookie (`~/.config/ytm/browser.json`) — it takes precedence
when present. OAuth files are kept as a spare (see "OAuth (currently broken)"
below). All three files must **never enter the repo** — hygiene check:
`git ls-files | grep -iE "oauth\.json|client_secret|browser\.json"` must be empty.

### 1. Browser-cookie auth (working path)

1. Open `music.youtube.com` signed in as the main account → F12 → Network →
   filter `browse` → reload → click a `browse` POST request → Headers →
   **view source** next to "Request Headers" → copy the whole block
   (must include `cookie:` and `x-goog-authuser:`).
2. Run and paste at the prompt, then Enter + Ctrl-D:

```sh
cd ~/.config/ytm && uv run --project ~/git/ai-hub/cli/ytm ytmusicapi browser --file ~/.config/ytm/browser.json && chmod 600 ~/.config/ytm/browser.json
```

3. Verify: `uv run --project ~/git/ai-hub/cli/ytm ytm doctor` prints your
   account name/handle.

Cookies expire (site sign-out, password change) — symptom is `doctor` failing
or empty library results; just redo steps 1–2.

### 2. OAuth (currently broken — kept as spare)

> Since ~Aug 2025 YouTube rejects OAuth tokens on the internal youtubei API
> (`400 INVALID_ARGUMENT` on every call, even with a token that validates on
> the official Data API v3). Upstream
> [ytmusicapi#813](https://github.com/sigma67/ytmusicapi/issues/813) has no
> fix; browser-cookie auth above is the only working path. The steps below
> are preserved so OAuth can be revived if YouTube un-breaks it.

1. GCP OAuth client (TV-device type) in project **`gogcli-507918`**:
   **APIs & Services → Library** → enable **YouTube Data API v3**; then
   **Credentials → Create Credentials → OAuth client ID** of type
   **TVs and Limited Input devices** (desktop-type clients cannot be reused).
2. `uv run --project ~/git/ai-hub/cli/ytm --with ytmusicapi ytmusicapi oauth`
   (paste client ID/secret) → writes `~/.config/ytm/oauth.json`.
3. Save `~/.config/ytm/client.json` (`{"client_id": ..., "client_secret": ...}`,
   `chmod 600`, never in `.zshrc`; `YTM_CLIENT_ID`/`YTM_CLIENT_SECRET` env
   override wins when set).

### 3. Alias (optional)

Add to `~/.zshrc` yourself (never committed):

```sh
alias ytm='uv run --project ~/git/ai-hub/cli/ytm ytm'
```

## Usage

| Command | What it does | Example |
|---|---|---|
| `ytm doctor [--json]` | Confirm auth, print account name/handle | `ytm doctor` |
| `ytm search QUERY [--limit N] [--filter songs] [--json]` | Search (default 10 results, IDs printed) | `ytm search "weird fishes"` / `ytm search "radiohead" --filter songs --limit 5` |
| `ytm playlists [--json]` | List your library playlists | `ytm playlists` |
| `ytm playlist PLAYLIST_ID [--json]` | Show playlist contents/tracks | `ytm playlist PLabc123` |
| `ytm liked [--json]` | List liked songs | `ytm liked` |
| `ytm like QUERY\|VIDEO_ID` | Rate a song LIKE (search term resolves to top songs result, or pass `--id`) | `ytm like "weird fishes"` / `ytm like --id 4oU8HFevxAc` |
| `ytm dislike QUERY\|VIDEO_ID` | Rate a song DISLIKE | `ytm dislike "song name"` |
| `ytm unlike QUERY\|VIDEO_ID` / `ytm undislike QUERY\|VIDEO_ID` | Clear a rating (sets INDIFFERENT — modifies the rating, does not delete content) | `ytm unlike "weird fishes"` |
| `ytm create-playlist --title T [--description D] [--privacy private\|public\|unlisted]` | Create playlist (default `private`), prints playlistId | `ytm create-playlist --title "Focus" --privacy private` |
| `ytm add PLAYLIST_ID QUERY...` | Resolve each query to a videoId, add all in one call | `ytm add PLabc123 "weird fishes" "reckoner"` |

### `--json` flag

Every read command (`doctor`, `search`, `playlists`, `playlist`, `liked`) accepts `--json` for machine use / piping. Text output is the default for humans and agents reading it; IDs (`videoId`, `playlistId`) are always printed so they can feed the next command. The CLI is stateless — resolve IDs with search/list first, then pass them explicitly.

### Iteration (no install step)

Run the live tree directly — edits to `ytm.py` take effect on the next invocation:

```sh
uv run --project ~/git/ai-hub/cli/ytm ytm <command>
```

No `pip install`, no rebuild. (`[project.scripts] ytm` exists for convenience, but the `uv run --project` loop above is the canonical dev path.)

## Auth modes

Browser-cookie auth is the working path (see Setup §1). OAuth broke in
~Aug 2025 (see Setup §2) — `get_client()` still falls back to it when no
`browser.json` exists, so it revives automatically if YouTube un-breaks it.

## Troubleshooting

- **Missing credentials error** (`Missing YouTube Music credentials...`): save `~/.config/ytm/browser.json` as in Setup §1 (`chmod 600`).
- **Auth suddenly stops working / empty library**: the cookie expired (sign-out, password change). Redo Setup §1; then `ytm doctor` to confirm.
- **Wrong account**: v1 is main-account only (no brand-account switch). Use the main account's cookie.
- **Empty search / weird results**: try `--filter songs` and a smaller `--limit`; use `--json` to inspect raw fields.
- **Upstream breakage**: ytmusicapi scrapes an internal YouTube Music web API — YouTube UI changes can break it. The dep is pinned (`ytmusicapi==1.12.2`); upgrade deliberately, not casually.

## Never-delete rule

This CLI exposes **no delete operations** — no `delete_playlist`, `remove_playlist_items`, history removal, or unsubscribes. If asked to delete anything, refuse and point at the YouTube Music app. Consequence for testing: **test playlists created during development must be removed manually in the YTM app** — there is intentionally no command to do it.
