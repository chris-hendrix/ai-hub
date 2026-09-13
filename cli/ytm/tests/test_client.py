"""Tests for get_client() credential loading and the doctor subcommand."""

from __future__ import annotations

import json
import os
from pathlib import Path
from unittest import mock

import pytest

import ytm


def _write_client(cfg: Path, cid: str = "file-id", secret: str = "file-secret") -> None:
    cfg.mkdir(parents=True, exist_ok=True)
    (cfg / "client.json").write_text(json.dumps({"client_id": cid, "client_secret": secret}))
    (cfg / "oauth.json").write_text("{}")


def test_missing_creds_exits_with_setup_hint(tmp_path, monkeypatch):
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.delenv("YTM_CLIENT_ID", raising=False)
    monkeypatch.delenv("YTM_CLIENT_SECRET", raising=False)
    with pytest.raises(SystemExit) as exc:
        ytm.get_client()
    assert "client.json" in str(exc.value) or "README" in str(exc.value)


def test_fake_files_construct_client(tmp_path, monkeypatch):
    cfg = tmp_path / ".config" / "ytm"
    _write_client(cfg)
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.delenv("YTM_CLIENT_ID", raising=False)
    monkeypatch.delenv("YTM_CLIENT_SECRET", raising=False)
    with (
        mock.patch.object(ytm, "YTMusic") as m_ytm,
        mock.patch.object(ytm, "OAuthCredentials") as m_creds,
    ):
        ytm.get_client()
    m_creds.assert_called_once_with(client_id="file-id", client_secret="file-secret")
    args, kwargs = m_ytm.call_args
    assert args[0] == str(cfg / "oauth.json")
    assert kwargs["oauth_credentials"] is m_creds.return_value


def test_env_vars_override_file(tmp_path, monkeypatch):
    cfg = tmp_path / ".config" / "ytm"
    _write_client(cfg, cid="file-id", secret="file-secret")
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setenv("YTM_CLIENT_ID", "env-id")
    monkeypatch.setenv("YTM_CLIENT_SECRET", "env-secret")
    with (
        mock.patch.object(ytm, "YTMusic"),
        mock.patch.object(ytm, "OAuthCredentials") as m_creds,
    ):
        ytm.get_client()
    m_creds.assert_called_once_with(client_id="env-id", client_secret="env-secret")


def test_doctor_prints_account(tmp_path, monkeypatch, capsys):
    cfg = tmp_path / ".config" / "ytm"
    _write_client(cfg)
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.delenv("YTM_CLIENT_ID", raising=False)
    monkeypatch.delenv("YTM_CLIENT_SECRET", raising=False)
    fake = mock.Mock()
    fake.get_account_info.return_value = {"accountName": "Test User", "accountHandle": "@test"}
    with mock.patch.object(ytm, "YTMusic", return_value=fake):
        ytm.main(["doctor"])
    out = capsys.readouterr().out
    assert "Test User" in out and "@test" in out


def test_doctor_json(tmp_path, monkeypatch, capsys):
    cfg = tmp_path / ".config" / "ytm"
    _write_client(cfg)
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.delenv("YTM_CLIENT_ID", raising=False)
    monkeypatch.delenv("YTM_CLIENT_SECRET", raising=False)
    fake = mock.Mock()
    fake.get_account_info.return_value = {"accountName": "Test User", "accountHandle": "@test"}
    with mock.patch.object(ytm, "YTMusic", return_value=fake):
        ytm.main(["doctor", "--json"])
    out = capsys.readouterr().out
    assert json.loads(out)["accountName"] == "Test User"
