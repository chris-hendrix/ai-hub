"""Tests for read commands: search / playlists / playlist / liked.

Pure formatting helpers are tested with fixture dicts (no network).
Command wiring is tested by mocking ytm.get_client.
"""

from __future__ import annotations

import json
from unittest import mock

import ytm


def _song(i, vid=None):
    return {
        "videoId": vid or f"vid{i:02d}",
        "title": f"Song {i}",
        "artists": [{"name": f"Artist {i}"}],
        "album": {"name": f"Album {i}"},
    }


def test_format_search_results_numbered_default_limit():
    results = [_song(i) for i in range(15)]
    text = ytm.format_search_results(results)
    lines = text.strip().splitlines()
    assert len(lines) == 10  # default top-10
    assert lines[0].startswith("1. Song 0")
    assert "Album 0" in lines[0] and "Artist 0" in lines[0]
    assert "[videoId: vid00]" in lines[0]
    assert lines[9].startswith("10.")


def test_format_search_results_respects_limit():
    results = [_song(i) for i in range(5)]
    text = ytm.format_search_results(results, limit=3)
    assert len(text.strip().splitlines()) == 3


def test_format_search_results_missing_fields():
    text = ytm.format_search_results([{"title": "Only Title"}])
    assert "Only Title" in text
    assert "videoId" in text  # ID slot always present even if unknown


def test_search_json_passthrough(capsys):
    results = [_song(0, vid="abc123")]
    fake = mock.Mock()
    fake.search.return_value = results
    with mock.patch.object(ytm, "get_client", return_value=fake):
        ytm.main(["search", "weird fishes", "--json"])
    out = capsys.readouterr().out
    data = json.loads(out)
    assert data[0]["videoId"] == "abc123"
    assert data[0]["title"] == "Song 0"
    assert data[0]["artists"][0]["name"] == "Artist 0"


def test_search_text_output(capsys):
    fake = mock.Mock()
    fake.search.return_value = [_song(0, vid="abc123"), _song(1, vid="def456")]
    with mock.patch.object(ytm, "get_client", return_value=fake):
        ytm.main(["search", "weird fishes"])
    out = capsys.readouterr().out
    assert "1." in out and "Song 0" in out and "[videoId: abc123]" in out
    assert "2." in out and "[videoId: def456]" in out


def test_search_filter_songs_maps_to_api_filter():
    fake = mock.Mock()
    fake.search.return_value = []
    with mock.patch.object(ytm, "get_client", return_value=fake):
        ytm.main(["search", "radiohead", "--filter", "songs"])
    _, kwargs = fake.search.call_args
    assert kwargs.get("filter") == "songs"


def test_search_limit_passed_through():
    fake = mock.Mock()
    fake.search.return_value = [_song(i) for i in range(20)]
    with mock.patch.object(ytm, "get_client", return_value=fake):
        ytm.main(["search", "x", "--limit", "2"])
    _, kwargs = fake.search.call_args
    assert kwargs.get("limit") == 2


def test_format_playlists_lists_ids():
    pls = [
        {"playlistId": "PL1", "title": "Mix A", "count": "5"},
        {"playlistId": "PL2", "title": "Mix B", "count": "7"},
    ]
    text = ytm.format_playlists(pls)
    assert "Mix A" in text and "[playlistId: PL1]" in text
    assert "Mix B" in text and "[playlistId: PL2]" in text


def test_playlists_text_and_json(capsys):
    pls = [{"playlistId": "PL1", "title": "Mix A", "count": "5"}]
    fake = mock.Mock()
    fake.get_library_playlists.return_value = pls
    with mock.patch.object(ytm, "get_client", return_value=fake):
        ytm.main(["playlists"])
    assert "PL1" in capsys.readouterr().out
    with mock.patch.object(ytm, "get_client", return_value=fake):
        ytm.main(["playlists", "--json"])
    assert json.loads(capsys.readouterr().out)[0]["playlistId"] == "PL1"


def test_playlist_detail_text_and_json(capsys):
    detail = {"title": "Mix A", "tracks": [_song(0, vid="aa"), _song(1, vid="bb")]}
    fake = mock.Mock()
    fake.get_playlist.return_value = detail
    with mock.patch.object(ytm, "get_client", return_value=fake):
        ytm.main(["playlist", "PL1"])
    out = capsys.readouterr().out
    assert "Mix A" in out and "[videoId: aa]" in out and "[videoId: bb]" in out
    with mock.patch.object(ytm, "get_client", return_value=fake):
        ytm.main(["playlist", "PL1", "--json"])
    assert json.loads(capsys.readouterr().out)["title"] == "Mix A"


def test_liked_text_and_json(capsys):
    liked = {"tracks": [_song(0, vid="zz")]}
    fake = mock.Mock()
    fake.get_liked_songs.return_value = liked
    with mock.patch.object(ytm, "get_client", return_value=fake):
        ytm.main(["liked"])
    assert "[videoId: zz]" in capsys.readouterr().out
    with mock.patch.object(ytm, "get_client", return_value=fake):
        ytm.main(["liked", "--json"])
    assert json.loads(capsys.readouterr().out)["tracks"][0]["videoId"] == "zz"
