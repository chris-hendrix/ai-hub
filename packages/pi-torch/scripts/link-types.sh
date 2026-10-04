#!/usr/bin/env bash
# Dev-only: link locally installed pi types into packages/pi-torch/node_modules
# without npm/network. Idempotent. Fails loudly if a target is missing.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENT_SRC="/home/chend/.nvm/versions/node/v22.21.1/lib/node_modules/@earendil-works/pi-coding-agent"
TUI_SRC="/home/chend/.nvm/versions/node/v22.21.1/lib/node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-tui"

if [ ! -d "$AGENT_SRC" ]; then
  echo "ERROR: pi-coding-agent not found at $AGENT_SRC" >&2
  exit 1
fi
if [ ! -d "$TUI_SRC" ]; then
  echo "ERROR: pi-tui not found at $TUI_SRC" >&2
  exit 1
fi

mkdir -p "$HERE/node_modules/@earendil-works"
ln -sfn "$AGENT_SRC" "$HERE/node_modules/@earendil-works/pi-coding-agent"
ln -sfn "$TUI_SRC" "$HERE/node_modules/@earendil-works/pi-tui"

echo "linked pi types into $HERE/node_modules/@earendil-works/"
