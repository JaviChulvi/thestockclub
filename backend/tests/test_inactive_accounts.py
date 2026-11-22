import importlib
import sys
import types
from unittest.mock import Mock

import pytest
from fastapi import HTTPException


@pytest.fixture
def api(monkeypatch):
    db = Mock()
    monkeypatch.setitem(sys.modules, 'database', types.SimpleNamespace(db=db))
    package = types.ModuleType('api')
    package.__path__ = ['backend/api']
    monkeypatch.setitem(sys.modules, 'api', package)
    for name in ('api.utils', 'api.auth'):
        sys.modules.pop(name, None)
    auth = importlib.import_module('api.auth')
    monkeypatch.setattr(auth.bcrypt, 'checkpw', lambda *_: True)
    return auth, sys.modules['api.utils'], db


def test_inactive_session_is_rejected_immediately(api):
    _, utils, db = api
    session = {'user_id': 1, 'is_active': True}
    db.get_session_by_token.return_value = session
    assert utils.get_user_from_session('Bearer token') == 1
    session['is_active'] = False
    assert utils.get_user_from_session('Bearer token') is None


def test_inactive_login_does_not_create_session(api):
    auth, _, db = api
    user = {'id': 1, 'email': 'user@example.com', 'password_hash': 'hash',
            'first_name': 'A', 'last_name': 'B', 'ai_enabled': False, 'is_active': True}
    db.get_user_by_email.return_value = user
    db.create_session.return_value = 1
    request = auth.LoginRequest(email=user['email'], password='password')
    assert auth.login(request)['success']
    db.create_session.reset_mock()
    user['is_active'] = False
    with pytest.raises(HTTPException) as exc:
        auth.login(request)
    assert exc.value.status_code == 401
    db.create_session.assert_not_called()
