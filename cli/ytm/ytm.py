"""ytm — YouTube Music CLI wrapper."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from ytmusicapi import OAuthCredentials, YTMusic

SETUP_HINT = (
    "Missing YouTube Music credentials. Create ~/.config/ytm/client.json "
    'with {"client_id": ..., "client_secret": ...} (chmod 600) '
    "or set YTM_CLIENT_ID/YTM_CLIENT_SECRET. "
    "See cli/ytm/README.md for one-time setup."
)


def get_client() -> YTMusic:
    cfg_dir = Path("~/.config/ytm").expanduser()
    creds_file = cfg_dir / "client.json"
    oauth_file = cfg_dir / "oauth.json"
    env_id = os.environ.get("YTM_CLIENT_ID")
    env_secret = os.environ.get("YTM_CLIENT_SECRET")

    client_id = env_id
    client_secret = env_secret
    if client_id is None or client_secret is None:
        try:
            data = json.loads(creds_file.read_text())
            client_id = client_id or data["client_id"]
            client_secret = client_secret or data["client_secret"]
        except (FileNotFoundError, KeyError, ValueError, json.JSONDecodeError):
            raise SystemExit(f"error: {SETUP_HINT}")
    return YTMusic(
        str(oauth_file),
        oauth_credentials=OAuthCredentials(
            client_id=client_id, client_secret=client_secret
        ),
    )


def cmd_doctor(args: argparse.Namespace) -> None:
    client = get_client()
    info = client.get_account_info()
    if getattr(args, "json", False):
        print(json.dumps(info, indent=2))
    else:
        name = info.get("accountName", "?")
        handle = info.get("accountHandle", "?")
        print(f"{name} ({handle})")


# --- Read-command output helpers (pure; no network) ---

def _artists_str(entry: dict) -> str:
    artists = entry.get("artists") or []
    names = [a.get("name", "?") for a in artists if isinstance(a, dict)]
    return ", ".join(names) if names else "?"


def _album_str(entry: dict) -> str:
    album = entry.get("album")
    if isinstance(album, dict):
        return str(album.get("name", "?"))
    if isinstance(album, str):
        return album
    return "?"


def _video_id(entry: dict) -> str:
    return str(entry.get("videoId", "?"))


def format_track_line(track: dict) -> str:
    title = str(track.get("title", "?"))
    return (
        f"{title} — {_album_str(track)} — {_artists_str(track)} "
        f"[videoId: {_video_id(track)}]"
    )


def format_search_results(results: list, limit: int = 10) -> str:
    lines = []
    for i, r in enumerate(results[:limit], start=1):
        lines.append(f"{i}. {format_track_line(r)}")
    return "\n".join(lines)


def format_playlists(playlists: list) -> str:
    lines = []
    for i, pl in enumerate(playlists, start=1):
        title = str(pl.get("title", "?"))
        pid = str(pl.get("playlistId", "?"))
        count = pl.get("count")
        suffix = f" ({count} tracks)" if count is not None else ""
        lines.append(f"{i}. {title}{suffix} [playlistId: {pid}]")
    return "\n".join(lines)


def format_playlist_detail(detail: dict) -> str:
    title = str(detail.get("title", "?"))
    tracks = detail.get("tracks") or []
    lines = [f"{title}"]
    for i, t in enumerate(tracks, start=1):
        lines.append(f"{i}. {format_track_line(t)}")
    return "\n".join(lines)


def format_liked(liked: dict | list) -> str:
    tracks = liked.get("tracks") if isinstance(liked, dict) else liked
    tracks = tracks or []
    lines = []
    for i, t in enumerate(tracks, start=1):
        lines.append(f"{i}. {format_track_line(t)}")
    return "\n".join(lines)


def cmd_search(args: argparse.Namespace) -> None:
    client = get_client()
    kwargs: dict = {"limit": args.limit}
    if getattr(args, "filter", None):
        kwargs["filter"] = args.filter
    results = client.search(args.query, **kwargs)
    if getattr(args, "json", False):
        print(json.dumps(results[: args.limit], indent=2))
    else:
        print(format_search_results(results, limit=args.limit))


def cmd_playlists(args: argparse.Namespace) -> None:
    client = get_client()
    playlists = client.get_library_playlists()
    if getattr(args, "json", False):
        print(json.dumps(playlists, indent=2))
    else:
        print(format_playlists(playlists or []))


def cmd_playlist(args: argparse.Namespace) -> None:
    client = get_client()
    detail = client.get_playlist(args.playlist_id)
    if getattr(args, "json", False):
        print(json.dumps(detail, indent=2))
    else:
        print(format_playlist_detail(detail))


def cmd_liked(args: argparse.Namespace) -> None:
    client = get_client()
    liked = client.get_liked_songs()
    if getattr(args, "json", False):
        print(json.dumps(liked, indent=2))
    else:
        print(format_liked(liked))


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="ytm", description="YouTube Music CLI wrapper")
    sub = p.add_subparsers(dest="command")
    d = sub.add_parser("doctor", help="check auth and show account info")
    d.add_argument("--json", dest="json", action="store_true", help="machine-readable output")
    s = sub.add_parser("search", help="search YouTube Music")
    s.add_argument("query", help="search query")
    s.add_argument("--limit", type=int, default=10, help="max results (default 10)")
    s.add_argument("--filter", default=None, choices=["songs"], help="restrict to songs")
    s.add_argument("--json", dest="json", action="store_true", help="machine-readable output")

    pls = sub.add_parser("playlists", help="list library playlists")
    pls.add_argument("--json", dest="json", action="store_true", help="machine-readable output")

    pl = sub.add_parser("playlist", help="show playlist contents")
    pl.add_argument("playlist_id", help="playlist ID")
    pl.add_argument("--json", dest="json", action="store_true", help="machine-readable output")

    lk = sub.add_parser("liked", help="list liked songs")
    lk.add_argument("--json", dest="json", action="store_true", help="machine-readable output")

    # Mutation stubs (Tasks 5-6) so --help lists the allowlisted surface early.
    for name in ("like", "dislike", "unlike", "undislike", "create-playlist", "add"):
        sub.add_parser(name, help=f"{name} (not yet implemented)")
    return p


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command is None:
        parser.print_help()
        return
    if args.command == "doctor":
        cmd_doctor(args)
        return
    if args.command == "search":
        cmd_search(args)
        return
    if args.command == "playlists":
        cmd_playlists(args)
        return
    if args.command == "playlist":
        cmd_playlist(args)
        return
    if args.command == "liked":
        cmd_liked(args)
        return
    parser.error(f"command '{args.command}' not yet implemented")


if __name__ == "__main__":
    main()
