# gog install / repair reference

Reference only — the skill normally never needs this.

## Layout

- Binary: `~/.local/bin/gog` (single Go binary, https://github.com/openclaw/gogcli)
- OAuth client: Desktop app in Google Cloud project `gogcli-507918` (account chendrix1123@gmail.com)
- Credentials: stored via `gog auth credentials set <client_secret.json>` into gog's local config (see `gog auth keyring` / [Paths and State](https://github.com/openclaw/gogcli/blob/main/docs/paths.md) for exact locations)
- Tokens: platform keyring by default; this machine uses the encrypted file backend (see Environment below)

## Environment (`.zshrc` only — user is zsh)

```zsh
export GOG_KEYRING_BACKEND=file
export GOG_KEYRING_PASSWORD='...'   # generated at install; keep identical if ever regenerated
export GOG_ACCOUNT=chendrix1123@gmail.com
```

WSL has no Secret Service, hence the file keyring. If keyring errors appear, the shell didn't load `.zshrc` — export the three vars manually.

## Upgrade

```bash
curl -sL https://github.com/openclaw/gogcli/releases/latest/download/gogcli_<ver>_linux_amd64.tar.gz \
  | tar xz -C ~/.local/bin gog
gog --version
```

## Re-auth (token expired / revoked)

```bash
gog auth add chendrix1123@gmail.com --services gmail,calendar,contacts,tasks --manual
# open printed URL in Chrome → Advanced → Go to gogcli → Allow
# paste the http://127.0.0.1:.../oauth2/callback?code=... URL back into the prompt
gog auth doctor --check
```

WSL has no local browser — `--manual` is required. In a pinch, `--remote --step 1` prints the URL and `--remote --step 2 --auth-url <callback-url>` exchanges the code (good for agent-driven flows).

## Health check

```bash
gog auth doctor --check     # status must be "ok"
gog auth list --check
```

## Google Cloud console gotchas

- App must stay **In production** (console → Google Auth Platform → Audience) or refresh tokens expire every 7 days. Publishing required: home page + privacy policy = `https://chris-hendrix.com/`, authorized domain `chris-hendrix.com`.
- APIs enabled: Gmail, Calendar, People (contacts), Tasks.
- Consent screen: app name `gogcli`, External.
