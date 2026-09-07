---
name: gog
description: "Use the `gog` CLI for the user's Google account (chendrix1123@gmail.com): Gmail search/read, Calendar create/edit, Contacts edit/create, Tasks create/edit. Use when the user asks about email, inbox, calendar events, meetings, contacts, or tasks. Scope is intentionally light: queries and edits only — never delete anything."
---

# gog — user's Google workspace via CLI

## Rules

- **Never delete** (mail, events, contacts, tasks, files). If a change looks destructive, stop and ask.
- Never `gmail send` unless explicitly asked.
- Account is always `chendrix1123@gmail.com` — already default via `GOG_ACCOUNT` in `.zshrc`; don't pass `--account`.
- Resolve IDs with a search/list first; never guess IDs.
- User timezone: America/New_York — use explicit offsets in times (`-04:00` / `-05:00`).

## Gmail

```bash
gog gmail search 'is:unread newer_than:7d' --max 10   # full Gmail query syntax works
gog gmail get <messageId> --sanitize-content --json
```

## Calendar

```bash
gog calendar events --today              # also --tomorrow --week --from D --to D
gog calendar create --summary "T" --from "2026-09-09T10:00:00-04:00" --to "2026-09-09T10:30:00-04:00" \
  [--description] [--location] [--attendees "a@x.com,b@y.com"]
gog calendar update <eventId> --summary "..." --from "..." --to "..."
```

## Contacts

```bash
gog contacts search "name|email|phone"
gog contacts get people/cXXXX
# create/update: check `gog contacts --help` for exact flags before writing
```

## Tasks

```bash
gog tasks lists                                # get tasklistId
gog tasks add <tasklistId> --title "..." [--notes] [--due 2026-09-10]
gog tasks update <tasklistId> <taskId> --title/--due/--notes
gog tasks done <tasklistId> <taskId>           # complete (not delete); undo exists
```

## Troubleshooting

- Keyring error → env not loaded; see [install](references/install.md).
- Auth/consent error → token expired or client broken; see [install](references/install.md).
- Suspected credential leak, lost device, or user wants access shut off → follow [kill-switch](references/kill-switch.md) (revoke first, clean up second).
- `--json` on any command for machine-readable output.
