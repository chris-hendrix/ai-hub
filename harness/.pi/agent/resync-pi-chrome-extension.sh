#!/usr/bin/env bash
# Sync the pi-chrome companion extension from the installed npm package into the
# folder Chrome actually loads it from. Run after any pi-chrome update, then click
# Reload on "Pi Chrome Connector" at chrome://extensions.
#
# Why this matters: the extension polls the local bridge and stamps every /next
# reply with pi-chrome's version. If the loaded copy is older, the extension
# self-reloads on every poll and returns before reading the response body -- so
# every command Pi sends is silently discarded and chrome_* tools time out.
set -euo pipefail
PKG=/home/chend/.pi/agent/npm/node_modules/pi-chrome
SRC="$PKG/extensions/chrome-profile-bridge/browser-extension"
DST=/mnt/c/Users/chend/pi-chrome-extension
ver() { sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$1" | head -1; }
mkdir -p "$DST"
cp -f "$SRC/manifest.json" "$SRC/service_worker.js" "$SRC/snapshot_injected.js" "$DST/"
echo "synced -> $DST"
echo "  extension : $(ver "$DST/manifest.json")"
echo "  pi-chrome : $(ver "$PKG/package.json")"
if [ "$(ver "$DST/manifest.json")" = "$(ver "$PKG/package.json")" ]; then
  echo "  OK: versions match"
else
  echo "  WARN: versions still differ"
fi
