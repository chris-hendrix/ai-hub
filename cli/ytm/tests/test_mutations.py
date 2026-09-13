"""Tests for rating mutations: like / dislike / unlike / undislike.

Each command maps to rate_song(videoId, rating); search terms resolve
via search(filter=songs) picking the first result with a videoId.
"""

from __future__ import annotations

import json
from unittest import mock

import pytest

import ytm

RATING_CASES = [
    ("like", "LIKE"),
    ("dislike", "DISLIKE"),
    ("unlike", "INDIFFERENT"),
    ("undislike", "INDIFFERENT"),
]


def _song(title="Song 0", vid="abc123", artist="Artist 0"):
    return {
        "videoId": vid,
        "title": title,
        "artists": [{"name": artist}],
        "album": {"name": "Album 0"},
    }


@pytest.mark.parametrize("cmd,rating", RATING_CASES)
def test_rating_query_resolves_and_rates(cmd, rating, capsys):
    fake = mock.Mock()
    fake.search.return_value = [_song()]
    fake.rate_song.return_value = None
    with mock.patch.object(ytm, "get_client", return_value=fake):
        ytm.main([cmd, "weird fishes"])
    fake.search.assert_called_once()
    _, kwargs = fake.search.call_args
    assert kwargs.get("filter") == "songs"
    fake.rate_song.assert_called_once_with("abc123", rating)
    out = capsys.readouterr().out
    assert "Song 0" in out
    assert "✓" in out


@pytest.mark.parametrize("cmd,rating", RATING_CASES)
def test_rating_id_flag_skips_search(cmd, rating, capsys):
    fake = mock.Mock()
    with mock.patch.object(ytm, "get_client", return_value=fake):
        ytm.main([cmd, "--id", "vid999"])
    fake.search.assert_not_called()
    fake.rate_song.assert_called_once_with("vid999", rating)
    assert "vid999" in capsys.readouterr().out


def test_rating_resolution_skips_results_without_video_id():
    fake = mock.Mock()
    fake.search.return_value = [
        {"title": "No id entry", "artists": []},
        _song(title="Second", vid="good1"),
    ]
    with mock.patch.object(ytm, "get_client", return_value=fake):
        ytm.main(["like", "query"])
    fake.rate_song.assert_called_once_with("good1", "LIKE")


def test_rating_resolution_no_match_exits_with_error(capsys):
    fake = mock.Mock()
    fake.search.return_value = [{"title": "No id"}]
    with mock.patch.object(ytm, "get_client", return_value=fake):
        with pytest.raises(SystemExit):
            ytm.main(["like", "nothing matches"])
    fake.rate_song.assert_not_called()


def test_rating_json_output(capsys):
    fake = mock.Mock()
    fake.search.return_value = [_song()]
    with mock.patch.object(ytm, "get_client", return_value=fake):
        ytm.main(["like", "weird fishes", "--json"])
    data = json.loads(capsys.readouterr().out)
    assert data["videoId"] == "abc123"
    assert data["rating"] == "LIKE"
    assert data["title"] == "Song 0"


def test_rating_requires_query_or_id(capsys):
    fake = mock.Mock()
    with mock.patch.object(ytm, "get_client", return_value=fake):
        with pytest.raises(SystemExit):
            ytm.main(["like"])
    fake.rate_song.assert_not_called()


# --- Playlist mutations: create-playlist / add ---


def test_create_playlist_prints_id(capsys):
    fake = mock.Mock()
    fake.create_playlist.return_value = "PL123"
    with mock.patch.object(ytm, "get_client", return_value=fake):
        ytm.main(["create-playlist", "--title", "T"])
    _, kwargs = fake.create_playlist.call_args
    assert kwargs.get("privacy_status") == "PRIVATE"
    assert "PL123" in capsys.readouterr().out


def test_create_playlist_options_and_json(capsys):
    fake = mock.Mock()
    fake.create_playlist.return_value = "PL9"
    with mock.patch.object(ytm, "get_client", return_value=fake):
        ytm.main(
            [
                "create-playlist",
                "--title", "T",
                "--description", "D",
                "--privacy", "unlisted",
                "--json",
            ]
        )
    args, kwargs = fake.create_playlist.call_args
    title = args[0] if args else kwargs.get("title")
    assert title == "T"
    desc = args[1] if len(args) > 1 else kwargs.get("description")
    assert desc == "D"
    assert kwargs.get("privacy_status") == "UNLISTED"
    data = json.loads(capsys.readouterr().out)
    assert data["playlistId"] == "PL9"


@pytest.mark.parametrize(
    "flag,expected",
    [("private", "PRIVATE"), ("public", "PUBLIC"), ("unlisted", "UNLISTED")],
)
def test_create_playlist_privacy_mapping(flag, expected):
    fake = mock.Mock()
    fake.create_playlist.return_value = "PL1"
    with mock.patch.object(ytm, "get_client", return_value=fake):
        ytm.main(["create-playlist", "--title", "T", "--privacy", flag])
    assert fake.create_playlist.call_args[1].get("privacy_status") == expected


def test_create_playlist_requires_title():
    fake = mock.Mock()
    with mock.patch.object(ytm, "get_client", return_value=fake):
        with pytest.raises(SystemExit):
            ytm.main(["create-playlist"])
    fake.create_playlist.assert_not_called()


def test_add_resolves_each_query_single_call(capsys):
    fake = mock.Mock()
    fake.search.side_effect = [
        [_song(title="Song A", vid="vidA", artist="Art A")],
        [_song(title="Song B", vid="vidB", artist="Art B")],
    ]
    fake.add_playlist_items.return_value = {}
    with mock.patch.object(ytm, "get_client", return_value=fake):
        ytm.main(["add", "PL123", "song a", "song b"])
    assert fake.search.call_count == 2
    for _, kwargs in fake.search.call_args_list:
        assert kwargs.get("filter") == "songs"
    fake.add_playlist_items.assert_called_once()
    args, _ = fake.add_playlist_items.call_args
    assert args[0] == "PL123"
    assert args[1] == ["vidA", "vidB"]
    out = capsys.readouterr().out
    assert "Song A" in out and "Song B" in out


def test_add_dedupes_video_ids_preserving_order():
    fake = mock.Mock()
    fake.search.side_effect = [
        [_song(title="Song A", vid="vidA")],
        [_song(title="Song A again", vid="vidA")],
        [_song(title="Song B", vid="vidB")],
    ]
    fake.add_playlist_items.return_value = {}
    with mock.patch.object(ytm, "get_client", return_value=fake):
        ytm.main(["add", "PL123", "a", "a2", "b"])
    args, _ = fake.add_playlist_items.call_args
    assert args[1] == ["vidA", "vidB"]
    fake.add_playlist_items.assert_called_once()


def test_add_json_output(capsys):
    fake = mock.Mock()
    fake.search.return_value = [_song(title="Song A", vid="vidA")]
    fake.add_playlist_items.return_value = {}
    with mock.patch.object(ytm, "get_client", return_value=fake):
        ytm.main(["add", "PL123", "song a", "--json"])
    data = json.loads(capsys.readouterr().out)
    assert data["playlistId"] == "PL123"
    assert data["videoIds"] == ["vidA"]


def test_add_unresolvable_query_aborts_without_mutating():
    fake = mock.Mock()
    fake.search.return_value = [{"title": "No id"}]
    with mock.patch.object(ytm, "get_client", return_value=fake):
        with pytest.raises(SystemExit):
            ytm.main(["add", "PL123", "nothing matches"])
    fake.add_playlist_items.assert_not_called()


def test_edit_song_library_status_not_exposed():
    parser = ytm.build_parser()
    actions = parser._subparsers._group_actions  # type: ignore[attr-defined]
    names = set()
    for action in actions:
        names.update(getattr(action, "choices", {}).keys())
    assert "edit-song-library-status" not in names
    with pytest.raises(SystemExit):
        ytm.main(["edit-song-library-status"])
