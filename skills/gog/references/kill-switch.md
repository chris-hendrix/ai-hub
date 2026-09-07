# Kill switch — revoke gog access fast

Use when: credentials may be leaked, laptop lost, or the user just wants everything shut off. Order matters — revoke server-side first so stolen tokens die immediately, then clean local state.

## 1. Revoke the refresh token (kills API access now)

```bash
gog logout chendrix1123@gmail.com
```

Verify: `gog auth list --check` should show no usable token, and `gog auth doctor --check` must fail. If the CLI itself is untrusted, revoke directly at https://myaccount.google.com/permissions → remove "gogcli".

## 2. Nuke the OAuth client (if client secret leaked)

Console → https://console.cloud.google.com/auth/clients?project=gogcli-507918 → delete the `gogcli-desktop` client. This invalidates the client ID/secret pair permanently; a fresh client + `gog auth credentials set` + re-auth is required to restore access (see [install](install.md)).

## 3. Clear local secrets

```bash
rm -rf <gog config dir> <gog keyring dir>   # `gog auth keyring` shows locations
# then remove from ~/.zshrc: GOG_KEYRING_PASSWORD, GOG_ACCOUNT (keep GOG_KEYRING_BACKEND=file)
```

## 4. Confirm it's dead

```bash
gog gmail search 'newer_than:1d' --max 1   # must fail with auth error
```

Also worth a glance after a real leak: Google account security checkup (https://myaccount.google.com/security-checkup) and the "Third-party access" page to confirm `gogcli` is gone. Re-enabling later is just the normal [install](install.md) re-auth flow.
