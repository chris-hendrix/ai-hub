# ytm setup reference

One-time auth setup. Skill normally never needs this — it's here for fresh
machines, re-auth, and the curious.

## Auth mode: browser cookie (working path)

`get_client()` prefers `~/.config/ytm/browser.json` when present. Cookie
auth is the only path that works today — see "Why not OAuth" below.

### Create / refresh the cookie

1. Open `music.youtube.com` signed in as the main account
   (chendrix1123@gmail.com).
2. F12 → Network tab → filter box: `browse` → reload the page.
3. Click any `browse` POST request → Headers tab → next to
   "Request Headers" click **view source** → copy the entire block.
   It must include `cookie:` and `x-goog-authuser:` lines (that's the
   signed-in check).
4. Run, paste the block at the prompt, then Enter + Ctrl-D:

```sh
uv run --project ~/git/ai-hub/cli/ytm ytmusicapi browser --file ~/.config/ytm/browser.json
chmod 600 ~/.config/ytm/browser.json
```

5. Verify: `ytm doctor` prints the account name/handle.

### Cookie expiry

Cookies die on YouTube sign-out, password change, or periodic rotation.
Symptom: `doctor` fails or library commands return empty/stale data while
search still works. Fix: redo steps 1–5 above.

## Why not OAuth (kept as spare)

YouTube broke OAuth tokens for the internal youtubei API around Aug 2025:
every call returns `400 INVALID_ARGUMENT` even though the token validates
perfectly on the official Data API v3. Upstream
[ytmusicapi#813](https://github.com/sigma67/ytmusicapi/issues/813) is open
with no fix; the maintainer recommends browser auth. `get_client()` falls
back to OAuth automatically when `browser.json` is absent, so if YouTube
un-breaks it, no code change is needed.

The spare files (all `~/.config/ytm/`, never in the repo):

- `client.json` (`chmod 600`) — TV-device client id/secret from GCP project
  `gogcli-507918` (client name `ytm-tv`, created 2026-09-13). Desktop-type
  clients cannot be reused for this flow.
- `oauth.json` — refresh token from `ytmusicapi oauth` (TV device flow,
  completed 2026-09-13).

To regenerate the OAuth spare (if ever needed):

```sh
uv run --project ~/git/ai-hub/cli/ytm ytmusicapi oauth
# paste client_id + client_secret, complete device flow at google.com/device
```

## Hygiene

- `git ls-files | grep -iE "oauth\.json|client_secret|browser\.json"` must
  be empty — checked on every commit.
- Nothing raw in `.zshrc`; `YTM_CLIENT_ID`/`YTM_CLIENT_SECRET` env vars
  override `client.json` for edge cases.
- Never paste cookies/tokens into chat or commit them; the cURL trick from
  DevTools ("Copy as cURL") is the reliable capture method.

## Testing consequence

The CLI has no delete commands (rule: never delete). Test playlists created
during development must be removed manually in the YTM app.
