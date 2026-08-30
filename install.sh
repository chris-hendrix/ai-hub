#!/bin/bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
OPENCODE_HOME="$REPO_DIR/harness/.opencode"
PI_HOME="$REPO_DIR/harness/.pi"
AGENTS_SKILLS_SRC="${HOME}/.agents/skills"

# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

clean_self_symlinks() {
    local src_dir="$1"
    local type_label="$2"
    for item in "$src_dir"/*; do
        [ -d "$item" ] || continue
        for link in "$item"/*; do
            [ -L "$link" ] || continue
            local resolved
            resolved="$(readlink "$link")"
            if [[ "$resolved" == "$item"* ]]; then
                rm "$link"
                echo "  removed self-referential $type_label link: $(basename "$item")/$(basename "$link")"
            fi
        done
    done
}

# Ensure a home path is a symlink to target.
# Returns 0 if already correct, 1 if created/replaced, 2 if blocked (real dir/file exists — caller should migrate).
ensure_home_symlink() {
    local link_path="$1"
    local target="$2"
    local label="$3"

    if [ -L "$link_path" ]; then
        local cur
        cur="$(readlink "$link_path")"
        if [[ "$cur" == "$target" ]]; then
            echo "  $label: already linked"
            return 0
        fi
        # symlink elsewhere — replace if it pointed into repo before, otherwise warn
        if [[ "$cur" == "$REPO_DIR"* ]]; then
            ln -sfn "$target" "$link_path"
            echo "  $label: updated (was $cur)"
            return 1
        fi
        ln -sfn "$target" "$link_path"
        echo "  $label: replaced (was $cur)"
        return 1
    fi

    if [ -e "$link_path" ]; then
        echo "  $label: exists as real dir/file at $link_path — run '$0 migrate' to back up and flip" >&2
        return 2
    fi

    mkdir -p "$(dirname "$link_path")"
    ln -sfn "$target" "$link_path"
    echo "  $label: linked"
    return 1
}

ensure_intra_repo_skills() {
    # rpi is an opencode skill only (pi may get its own extension later).
    # Keep a single tracked relative symlink for opencode.
    mkdir -p "$OPENCODE_HOME/skills"
    if [ ! -L "$OPENCODE_HOME/skills/rpi" ]; then
        ln -sfn "../../../skills/rpi" "$OPENCODE_HOME/skills/rpi"
        echo "  intra-repo: .opencode/skills/rpi"
    fi
    # ensure pi skills dir exists but leave it empty — pi skills are
    # installed per-agent via `npx skills add ... --agent pi` on demand
    mkdir -p "$PI_HOME/agent/skills"
    # circular guard: skill loaders recreate skills/rpi/rpi
    clean_self_symlinks "$REPO_DIR/skills" "skill"
    clean_self_symlinks "$OPENCODE_HOME/skills" "opencode-skill" 2>/dev/null || true
    clean_self_symlinks "$PI_HOME/agent/skills" "pi-skill" 2>/dev/null || true
}

# Kept for backwards-compat migration: rewrites old relative
# ../../../.agents/skills/* links that break after ~/.pi becomes a symlink.
# No longer called on fresh installs — pi skills are now user-managed.
repair_pi_skills_sh_links() {
    # Rewrite every ~/.agents/skills/* entry as an absolute symlink inside pi.
    # The old relative links (../../../.agents/skills/...) break after ~/.pi becomes a symlink.
    if [ ! -d "$AGENTS_SKILLS_SRC" ]; then
        return 0
    fi
    mkdir -p "$PI_HOME/agent/skills"
    for src in "$AGENTS_SKILLS_SRC"/*; do
        [ -e "$src" ] || continue
        local name
        name="$(basename "$src")"
        local dst="$PI_HOME/agent/skills/$name"
        # keep the rpi intra-repo link as-is (it's relative and correct)
        if [[ "$name" == "rpi" ]]; then
            continue
        fi
        # skip if dst is already a correct absolute symlink
        if [ -L "$dst" ]; then
            local cur
            cur="$(readlink "$dst")"
            if [[ "$cur" == "$src" ]]; then
                continue
            fi
            # old relative link like ../../../.agents/skills/<name>
            if [[ "$cur" == *"agents/skills/$name"* ]]; then
                rm "$dst"
            elif [[ "$cur" == "$REPO_DIR"* ]]; then
                # stale link into repo under old layout
                rm "$dst"
            else
                # symlink elsewhere — leave it
                continue
            fi
        elif [ -e "$dst" ]; then
            # real dir/file at dst (shouldn't happen) — skip
            continue
        fi
        ln -sfn "$src" "$dst"
        echo "  pi skill: $name -> $src"
    done

    # prune stale pi skill links that no longer exist in ~/.agents/skills
    for link in "$PI_HOME/agent/skills"/*; do
        [ -L "$link" ] || continue
        local name
        name="$(basename "$link")"
        [[ "$name" == "rpi" ]] && continue
        local cur
        cur="$(readlink "$link")"
        # only consider links that look like skills.sh-derived absolute links
        if [[ "$cur" == *".agents/skills/"* ]]; then
            if [ ! -e "$AGENTS_SKILLS_SRC/$name" ]; then
                rm "$link"
                echo "  removed stale pi skill: $name"
            elif [ ! -e "$link" ]; then
                rm "$link"
                echo "  removed broken pi skill: $name"
            fi
        elif [ ! -e "$link" ]; then
            rm "$link"
            echo "  removed broken link: $name"
        fi
    done
}

# ---------------------------------------------------------------------------
# commands
# ---------------------------------------------------------------------------

do_install() {
    local target="${1:-all}"
    # flock: only one install at a time
    exec 9>/tmp/ai-hub-install.lock
    if ! flock -n 9; then
        echo "Another install is running (lock /tmp/ai-hub-install.lock)" >&2
        return 1
    fi
    echo "Installing home symlinks ($target)..."
    local failed=0
    if [[ "$target" == "all" || "$target" == "opencode" ]]; then
        ensure_home_symlink "${HOME}/.opencode" "$OPENCODE_HOME" "opencode home" || failed=$?
        ensure_home_symlink "${HOME}/.config/opencode" "$OPENCODE_HOME" "opencode config (XDG bridge)" || true
    fi
    if [[ "$target" == "all" || "$target" == "pi" ]]; then
        ensure_home_symlink "${HOME}/.pi" "$PI_HOME" "pi home" || true
    fi
    if [[ $failed -eq 2 ]]; then
        echo ""
        echo "One or more homes exist as real directories. Run '$0 migrate [opencode|pi|all]' to back up and flip them."
        return 1
    fi
    echo "Ensuring intra-repo skill links..."
    ensure_intra_repo_skills
    # pi skills.sh links are no longer auto-created — user runs `npx skills add ... --agent pi` per-skill
    echo "Done."
}

do_repair() {
    local target="${1:-all}"
    exec 9>/tmp/ai-hub-install.lock
    if ! flock -n 9; then
        echo "Another install is running (lock /tmp/ai-hub-install.lock)" >&2
        return 1
    fi
    echo "Repairing intra-repo skill links..."
    ensure_intra_repo_skills
    # also ensure home symlinks if missing (fresh clone after manual delete)
    echo "Checking home symlinks..."
    if [[ "$target" == "all" || "$target" == "opencode" ]]; then
        ensure_home_symlink "${HOME}/.opencode" "$OPENCODE_HOME" "opencode home" || true
        ensure_home_symlink "${HOME}/.config/opencode" "$OPENCODE_HOME" "opencode config (XDG bridge)" || true
    fi
    if [[ "$target" == "all" || "$target" == "pi" ]]; then
        ensure_home_symlink "${HOME}/.pi" "$PI_HOME" "pi home" || true
    fi
    echo "Done."
}

do_migrate() {
    local target="${1:-all}"
    exec 9>/tmp/ai-hub-install.lock
    if ! flock -n 9; then
        echo "Another install is running (lock /tmp/ai-hub-install.lock)" >&2
        return 1
    fi
    # Pre-flight: warn if agents are running (only check selected target)
    # When running migration from inside an opencode session, pgrep will always match;
    # treat as warning — user should close other sessions, but don't block the hub's own migration.
    if [[ "$target" == "all" || "$target" == "opencode" ]] && pgrep -x opencode >/dev/null 2>&1; then
        echo "Warning: opencode process detected (may be this session). Continuing..." >&2
    fi
    if [[ "$target" == "all" || "$target" == "pi" ]] && pgrep -x pi >/dev/null 2>&1; then
        echo "Warning: pi process detected. Continuing..." >&2
    fi

    # Already migrated? check only requested homes
    local already=0 needed=0
    if [[ "$target" == "all" || "$target" == "opencode" ]]; then
        needed=$((needed + 2))
        for pair in "${HOME}/.opencode:$OPENCODE_HOME" "${HOME}/.config/opencode:$OPENCODE_HOME"; do
            IFS=: read -r link tgt <<< "$pair"
            if [ -L "$link" ] && [[ "$(readlink "$link")" == "$tgt" ]]; then already=$((already + 1)); fi
        done
    fi
    if [[ "$target" == "all" || "$target" == "pi" ]]; then
        needed=$((needed + 1))
        if [ -L "${HOME}/.pi" ] && [[ "$(readlink "${HOME}/.pi")" == "$PI_HOME" ]]; then already=$((already + 1)); fi
    fi
    if [[ $already -eq $needed && $needed -gt 0 ]]; then
        echo "Already migrated ($target). Running repair..."
        do_repair "$target"
        return 0
    fi

    local ts
    ts="$(date +%Y%m%d-%H%M%S)"
    echo "Migrating homes (timestamp $ts)..."

    # Backup any real dirs (not symlinks already pointing into repo) — respect target
    local dirs=()
    if [[ "$target" == "all" || "$target" == "opencode" ]]; then dirs+=("${HOME}/.opencode" "${HOME}/.config/opencode"); fi
    if [[ "$target" == "all" || "$target" == "pi" ]]; then dirs+=("${HOME}/.pi"); fi
    for dir in "${dirs[@]}"; do
        if [ -L "$dir" ]; then
            local cur
            cur="$(readlink "$dir")"
            if [[ "$cur" == "$REPO_DIR"* ]]; then
                echo "  skip backup: $dir already points into repo ($cur)"
                continue
            fi
            # symlink elsewhere — back up the symlink target's dir? just move the symlink aside
            mv "$dir" "$dir.bak-$ts"
            echo "  backup symlink: $dir -> $dir.bak-$ts"
            continue
        fi
        if [ -e "$dir" ]; then
            mv "$dir" "$dir.bak-$ts"
            echo "  backup: $dir -> $dir.bak-$ts"
        else
            echo "  skip (not present): $dir"
        fi
    done

    mkdir -p "$OPENCODE_HOME" "$PI_HOME/agent/skills"
    mkdir -p "${HOME}/.config"

    # Helper: merge a backup dir's contents into a repo target, skipping
    # symlinks that pointed into the repo (stale install.sh links) and
    # not overwriting already-tracked files (e.g. opencode.json, agents).
    merge_backup_into_repo() {
        local backup="$1"
        local dest="$2"
        local label="$3"
        [ -d "$backup" ] || return 0
        echo "  merging $label: $backup -> $dest"
        # Use find to handle dotfiles correctly; -mindepth 1 -maxdepth 1 for top-level entries
        for item in "$backup"/* "$backup"/.*; do
            [ -e "$item" ] || continue
            local base
            base="$(basename "$item")"
            [[ "$base" == "." || "$base" == ".." ]] && continue
            # skip stale symlinks that pointed into the repo (old per-item links)
            if [ -L "$item" ]; then
                local tgt
                tgt="$(readlink "$item")"
                if [[ "$tgt" == "$REPO_DIR"* ]]; then
                    echo "    skip stale symlink: $base -> $tgt"
                    continue
                fi
            fi
            local dst="$dest/$base"
            if [ -e "$dst" ] || [ -L "$dst" ]; then
                # already in repo (tracked file, .gitignore, or rpi symlink) — keep repo version
                # but for runtime dirs like bin/ or node_modules that are gitignored and not in repo,
                # dst won't exist, so we move them. For package.json that IS gitignored and not tracked,
                # dst won't exist either — move it. In the one case where dst exists as a tracked file
                # (e.g. opencode.json after git mv), skip.
                # Exception: if dst is a gitignored runtime file that we already have as tracked .gitignore,
                # don't treat .gitignore as "already exists" conflict for the backup's .gitignore.
                if [[ "$base" == ".gitignore" && -f "$dst" ]]; then
                    echo "    skip .gitignore (repo version preserved)"
                    continue
                fi
                echo "    skip $base (already in repo)"
                continue
            fi
            mv "$item" "$dst"
            echo "    moved $base"
        done
    }

    # Merge backups into repo (only those matching target)
    if [[ "$target" == "all" || "$target" == "opencode" ]]; then
        if [ -d "${HOME}/.opencode.bak-$ts" ]; then
            merge_backup_into_repo "${HOME}/.opencode.bak-$ts" "$OPENCODE_HOME" "~/.opencode"
        fi
        if [ -d "${HOME}/.config/opencode.bak-$ts" ]; then
            merge_backup_into_repo "${HOME}/.config/opencode.bak-$ts" "$OPENCODE_HOME" "~/.config/opencode"
        fi
    fi
    if [[ "$target" == "all" || "$target" == "pi" ]] && [ -d "${HOME}/.pi.bak-$ts" ]; then
        # .pi backup contains agent/ + web-search-cache/ at top level
        for item in "${HOME}/.pi.bak-$ts"/* "${HOME}/.pi.bak-$ts"/.*; do
            [ -e "$item" ] || continue
            local base
            base="$(basename "$item")"
            [[ "$base" == "." || "$base" == ".." ]] && continue
            local dst="$PI_HOME/../$base"
            # PI_HOME is .../harness/.pi, so PI_HOME/.. is harness/
            # but .pi's top-level items belong IN .pi (agent/, web-search-cache/)
            dst="$PI_HOME/$base"
            if [ -e "$dst" ] || [ -L "$dst" ]; then
                if [[ "$base" == ".gitignore" ]]; then
                    echo "    skip .gitignore (repo version preserved)"
                    continue
                fi
                # for agent/ dir, merge its contents instead of skipping whole dir
                if [[ "$base" == "agent" && -d "$item" && -d "$dst" ]]; then
                    echo "    merging agent/ contents..."
                    for sub in "$item"/* "$item"/.*; do
                        [ -e "$sub" ] || continue
                        local sbase
                        sbase="$(basename "$sub")"
                        [[ "$sbase" == "." || "$sbase" == ".." ]] && continue
                        if [ -L "$sub" ]; then
                            local tgt
                            tgt="$(readlink "$sub")"
                            if [[ "$tgt" == "$REPO_DIR"* ]]; then
                                echo "      skip stale symlink: $sbase -> $tgt"
                                continue
                            fi
                        fi
                        local sdst="$dst/$sbase"
                        if [ -e "$sdst" ] || [ -L "$sdst" ]; then
                            if [[ "$sbase" == ".gitignore" ]]; then
                                continue
                            fi
                            # rpi symlink already exists as correct relative link — keep it
                            if [[ "$sbase" == "skills" && -d "$sub" && -d "$sdst" ]]; then
                                echo "      merging skills/ ..."
                                for sk in "$sub"/* "$sub"/.*; do
                                    [ -e "$sk" ] || continue
                                    local skbase
                                    skbase="$(basename "$sk")"
                                    [[ "$skbase" == "." || "$skbase" == ".." ]] && continue
                                    if [ -L "$sk" ]; then
                                        local sktgt
                                        sktgt="$(readlink "$sk")"
                                        if [[ "$sktgt" == "$REPO_DIR"* ]]; then
                                            echo "        skip stale: $skbase"
                                            continue
                                        fi
                                    fi
                                    if [ -e "$sdst/$skbase" ] || [ -L "$sdst/$skbase" ]; then
                                        # rpi already there as relative link; skills.sh links will be repaired after
                                        continue
                                    fi
                                    mv "$sk" "$sdst/"
                                    echo "        moved skill $skbase"
                                done
                                continue
                            fi
                            echo "      skip $sbase (already in repo)"
                            continue
                        fi
                        mv "$sub" "$sdst"
                        echo "      moved $sbase"
                    done
                    continue
                fi
                echo "    skip $base (already in repo)"
                continue
            fi
            mv "$item" "$dst"
            echo "    moved $base"
        done
    fi

    echo "Flipping home symlinks ($target)..."
    if [[ "$target" == "all" || "$target" == "opencode" ]]; then
        ln -sfn "$OPENCODE_HOME" "${HOME}/.opencode"
        echo "  ~/.opencode -> $OPENCODE_HOME"
        ln -sfn "$OPENCODE_HOME" "${HOME}/.config/opencode"
        echo "  ~/.config/opencode -> $OPENCODE_HOME"
    fi
    if [[ "$target" == "all" || "$target" == "pi" ]]; then
        ln -sfn "$PI_HOME" "${HOME}/.pi"
        echo "  ~/.pi -> $PI_HOME"
    fi

    echo "Ensuring intra-repo skill links..."
    ensure_intra_repo_skills

    echo ""
    echo "Migration complete. Backups:"
    ls -d "${HOME}/.opencode.bak-$ts" "${HOME}/.config/opencode.bak-$ts" "${HOME}/.pi.bak-$ts" 2>/dev/null || true
    echo "Verify with: opencode --version && opencode debug config | head -20"
    echo "Delete backups only after verifying: rm -rf ~/.opencode.bak-$ts ~/.config/opencode.bak-$ts ~/.pi.bak-$ts"
}

do_uninstall() {
    local target="${1:-all}"
    exec 9>/tmp/ai-hub-install.lock
    if ! flock -n 9; then
        echo "Another install is running (lock /tmp/ai-hub-install.lock)" >&2
        return 1
    fi
    echo "Removing home symlinks ($target, only those pointing into this repo)..."
    local pairs=()
    if [[ "$target" == "all" || "$target" == "opencode" ]]; then pairs+=("${HOME}/.opencode:$OPENCODE_HOME" "${HOME}/.config/opencode:$OPENCODE_HOME"); fi
    if [[ "$target" == "all" || "$target" == "pi" ]]; then pairs+=("${HOME}/.pi:$PI_HOME"); fi
    for pair in "${pairs[@]}"; do
        IFS=: read -r link target <<< "$pair"
        if [ -L "$link" ]; then
            local cur
            cur="$(readlink "$link")"
            if [[ "$cur" == "$target" ]]; then
                rm "$link"
                echo "  removed $link"
            elif [[ "$cur" == "$REPO_DIR"* ]]; then
                rm "$link"
                echo "  removed stale $link -> $cur"
            else
                echo "  skip $link (points elsewhere: $cur)"
            fi
        else
            echo "  skip $link (not a symlink)"
        fi
    done

    # Restore latest backups if present (respect target)
    local restore_dirs=()
    if [[ "$target" == "all" || "$target" == "opencode" ]]; then restore_dirs+=("${HOME}/.opencode" "${HOME}/.config/opencode"); fi
    if [[ "$target" == "all" || "$target" == "pi" ]]; then restore_dirs+=("${HOME}/.pi"); fi
    local restored=0
    for dir in "${restore_dirs[@]}"; do
        # find latest .bak-* for this dir
        local latest
        latest="$(ls -d "$dir".bak-* 2>/dev/null | sort -V | tail -1)"
        if [ -n "$latest" ] && [ -e "$latest" ] && [ ! -e "$dir" ]; then
            mv "$latest" "$dir"
            echo "  restored $dir from $latest"
            restored=$((restored + 1))
        fi
    done
    if [[ $restored -eq 0 ]]; then
        echo "  (no backups to restore — homes left absent; recreate manually if needed)"
    fi
}

case "${1:-install}" in
    install)
        do_install "${2:-all}"
        ;;
    repair)
        do_repair "${2:-all}"
        ;;
    migrate)
        do_migrate "${2:-all}"
        ;;
    uninstall)
        do_uninstall "${2:-all}"
        ;;
    *)
        echo "Usage: $0 [install|repair|migrate|uninstall] [opencode|pi|all]" >&2
        exit 1
        ;;
esac
