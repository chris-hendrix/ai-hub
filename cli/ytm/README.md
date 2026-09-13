# ytm — YouTube Music CLI

Single-file Python CLI wrapping [`ytmusicapi`](https://ytmusicapi.readthedocs.io/) (`==1.10.3`).
Query + safe mutations for YouTube Music: search, playlists, ratings. **No delete capability exists anywhere in this CLI.**

## One-time setup

### 1. GCP OAuth client (TV-device type)

1. Open [Google Cloud Console](https://console.cloud.google.com/) → project **`gogcli-507918`** (same project as gogcli).
2. **APIs & Services → Library** → enable **YouTube Data API v3** (if not already enabled).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - Application type must be **TVs and Limited Input devices**.
   - ⚠️ **Desktop-type clients cannot be reused here** — gog's desktop client uses a different flow and will not work with `ytmusicapi oauth`. You need a separate TV-device client.
4. Copy the resulting **client ID** and **client secret**.

The app stays **In production** (unverified). Same gotcha as gog: refresh tokens on an in-production test app can expire (~7 days), so expect to re-run the oauth flow periodically (see Troubleshooting).

### 2. Run the `ytmusicapi oauth` flow

```sh
uv run --project ~/git/ai-hub/cli/ytm --with ytmusicapi ytmusicapi oauth
```

When prompted, paste the TV-device **client ID** and **client secret** from step 1, then open the shown URL / enter the code and authorize with your main Google account.

This writes the refresh token to **`~/.config/ytm/oauth.json`**. That file (and `client.json` below) must **never enter the repo** — hygiene check: `git ls-files | grep -iE "oauth\.json|client_secret"` must be empty.

### 3. Create `~/.config/ytm/client.json`

```sh
cat > ~/.config/ytm/client.json <<'EOF'
{"client_id": "YOUR_TV_CLIENT_ID", "client_secret": "YOUR_TV_CLIENT_SECRET"}
EOF
chmod 600 ~/.config/ytm/client.json
```

- Do **NOT** put the raw client ID/secret in `.zshrc`.
- Optional override for edge cases (CI, second account, testing): `YTM_CLIENT_ID` / `YTM_CLIENT_SECRET` env vars win over `client.json` when set.
- Verify: `uv run --project ~/git/ai-hub/cli/ytm ytm doctor` prints your account name/handle.

### 4. Alias (optional)

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

> **Note:** `like` / `dislike` / `unlike` / `undislike` / `create-playlist` / `add` land in Phase 2 (Tasks 5–6). They are already allowlisted in `--help`; invoking them before then prints "not yet implemented".

### `--json` flag

Every read command (`doctor`, `search`, `playlists`, `playlist`, `liked`) accepts `--json` for machine use / piping. Text output is the default for humans and agents reading it; IDs (`videoId`, `playlistId`) are always printed so they can feed the next command. The CLI is stateless — resolve IDs with search/list first, then pass them explicitly.

### Iteration (no install step)

Run the live tree directly — edits to `ytm.py` take effect on the next invocation:

```sh
uv run --project ~/git/ai-hub/cli/ytm ytm <command>
```

No `pip install`, no rebuild. (`[project.scripts] ytm` exists for convenience, but the `uv run --project` loop above is the canonical dev path.)

## Browser-auth fallback

If the TV-device OAuth flow is ever blocked by Google again (has happened historically with ytmusicapi's setup), the fallback is browser-cookie auth: extract your YouTube Music request headers into `~/.config/ytm/browser.json` per the [ytmusicapi browser-auth docs](https://ytmusicapi.readthedocs.io/en/stable/setup/browser.html) and point the client builder at that file instead of `oauth.json`. Not built now — one paragraph by design; see plan assumption "accepted-as-risk".

## Troubleshooting

- **Missing credentials error** (`Missing YouTube Music credentials...`): create `~/.config/ytm/client.json` as above (`chmod 600`), or export `YTM_CLIENT_ID`/`YTM_CLIENT_SECRET`.
- **Token expired / 401 / auth suddenly stops working**: the in-production gotcha — refresh tokens can expire after ~7 days on an unverified app. Re-run `ytmusicapi oauth` to regenerate `~/.config/ytm/oauth.json`, then `ytm doctor` to confirm.
- **Wrong account**: v1 is main-account only (no brand-account switch). Authorize with the right Google account during the oauth flow.
- **Empty search / weird results**: try `--filter songs` and a smaller `--limit`; use `--json` to inspect raw fields.
- **Upstream breakage**: ytmusicapi scrapes an internal YouTube Music web API — YouTube UI changes can break it. The dep is pinned (`ytmusicapi==1.10.3`); upgrade deliberately, not casually.

## Never-delete rule

This CLI exposes **no delete operations** — no `delete_playlist`, `remove_playlist_items`, history removal, or unsubscribes. If asked to delete anything, refuse and point at the YouTube Music app. Consequence for testing: **test playlists created during development must be removed manually in the YTM app** — there is intentionally no command to do it.
