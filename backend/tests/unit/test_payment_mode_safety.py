import pytest

from app.core.config import settings
from app.services.payment_service import _assert_mock_payments_allowed


def test_mock_payments_are_rejected_in_production(monkeypatch):
    monkeypatch.setattr(settings, "app_env", "production")
    monkeypatch.setattr(settings, "allow_mock_payments", True)
    with pytest.raises(ValueError, match="Mock payments are disabled"):
        _assert_mock_payments_allowed()


def test_mock_payments_require_explicit_opt_in(monkeypatch):
    monkeypatch.setattr(settings, "app_env", "development")
    monkeypatch.setattr(settings, "allow_mock_payments", False)
    with pytest.raises(ValueError, match="Mock payments are disabled"):
        _assert_mock_payments_allowed()


def test_mock_payments_are_allowed_only_when_explicitly_enabled_for_development(monkeypatch):
    monkeypatch.setattr(settings, "app_env", "development")
    monkeypatch.setattr(settings, "allow_mock_payments", True)
    _assert_mock_payments_allowed()
