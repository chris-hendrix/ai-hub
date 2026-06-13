#!/bin/bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
AGENTS_SRC="$REPO_DIR/agents"
AGENTS_DST="${HOME}/.config/opencode/agents"
SKILLS_SRC="$REPO_DIR/skills"
SKILLS_DST="${HOME}/.config/opencode/skills"

do_install() {
    local src_dir="$1"
    local dst_dir="$2"
    local type_label="$3"

    mkdir -p "$dst_dir"

    for item in "$src_dir"/*; do
        [ -e "$item" ] || continue
        local name
        name="$(basename "$item")"
        ln -sf "$item" "$dst_dir/$name"
        echo "  $type_label: $name"
    done

    for link in "$dst_dir"/*; do
        [ -L "$link" ] || continue
        local name
        name="$(basename "$link")"

        [ -e "$src_dir/$name" ] && continue

        if [ ! -e "$link" ]; then
            rm "$link"
            echo "  removed broken $type_label: $name"
            continue
        fi

        local resolved
        resolved="$(readlink "$link")"
        if [[ "$resolved" == "$REPO_DIR"* ]]; then
            rm "$link"
            echo "  removed stale $type_label: $name"
        fi
    done
}

do_uninstall() {
    local src_dir="$1"
    local dst_dir="$2"
    local type_label="$3"

    mkdir -p "$dst_dir"
    for link in "$dst_dir"/*; do
        [ -L "$link" ] || continue
        local resolved
        resolved="$(readlink "$link")"
        if [[ "$resolved" == "$REPO_DIR"* ]]; then
            rm "$link"
            echo "  removed $type_label: $(basename "$link")"
        fi
    done
}

case "${1:-install}" in
    install)
        echo "Installing agents..."
        do_install "$AGENTS_SRC" "$AGENTS_DST" "agent"
        echo "Installing skills..."
        do_install "$SKILLS_SRC" "$SKILLS_DST" "skill"
        ;;
    uninstall)
        echo "Removing agents..."
        do_uninstall "$AGENTS_SRC" "$AGENTS_DST" "agent"
        echo "Removing skills..."
        do_uninstall "$SKILLS_SRC" "$SKILLS_DST" "skill"
        ;;
    *)
        echo "Usage: $0 [install|uninstall]" >&2
        exit 1
        ;;
esac
