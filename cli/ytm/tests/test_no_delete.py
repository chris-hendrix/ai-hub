"""Never-delete guard: no destructive capability may exist in the CLI surface."""

from __future__ import annotations

from pathlib import Path

import ytm

FORBIDDEN_SYMBOLS = [
    "delete_playlist",
    "remove_playlist_items",
    "remove_history_items",
    "unsubscribe_artists",
    "delete_upload_entity",
]

ALLOWLISTED = {
    "doctor",
    "search",
    "playlists",
    "playlist",
    "liked",
    "like",
    "dislike",
    "unlike",
    "undislike",
    "create-playlist",
    "add",
}


def test_source_contains_no_delete_capability():
    src = Path(ytm.__file__).read_text()
    for sym in FORBIDDEN_SYMBOLS:
        assert sym not in src, f"forbidden symbol present: {sym}"


def test_help_lists_only_allowlisted_subcommands(capsys):
    parser = ytm.build_parser()
    actions = parser._subparsers._group_actions  # type: ignore[attr-defined]
    names = set()
    for action in actions:
        names.update(getattr(action, "choices", {}).keys())
    assert names == ALLOWLISTED
    # --help renders the same allowlisted surface for users.
    try:
        ytm.main(["--help"])
    except SystemExit as exc:
        assert exc.code == 0
    out = capsys.readouterr().out
    for name in ALLOWLISTED:
        assert name in out
    for sym in FORBIDDEN_SYMBOLS:
        assert sym not in out
