from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api.dependencies import require_admin


def test_admin_user_is_allowed():
    admin = SimpleNamespace(role="admin")

    assert require_admin(admin) is admin


def test_regular_user_is_forbidden():
    user = SimpleNamespace(role="user")

    with pytest.raises(HTTPException) as exc:
        require_admin(user)

    assert exc.value.status_code == 403
    assert exc.value.detail == "Administrator access required"


def test_user_without_role_is_forbidden():
    user = SimpleNamespace()

    with pytest.raises(HTTPException) as exc:
        require_admin(user)

    assert exc.value.status_code == 403
