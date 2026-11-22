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
    monkeypatch.setitem(sys.modules, 'stock_analysis', types.ModuleType('stock_analysis'))
    messages = types.ModuleType('langchain_core.messages')
    messages.HumanMessage = messages.AIMessage = lambda **kwargs: kwargs
    monkeypatch.setitem(sys.modules, 'langchain_core', types.ModuleType('langchain_core'))
    monkeypatch.setitem(sys.modules, 'langchain_core.messages', messages)
    package = types.ModuleType('api')
    package.__path__ = ['backend/api']
    monkeypatch.setitem(sys.modules, 'api', package)
    for name in ('api.utils', 'api.chat'):
        sys.modules.pop(name, None)
    chat = importlib.import_module('api.chat')
    agent = Mock()
    agent.chat.return_value = 'answer'
    db.get_session_by_token.return_value = {'user_id': 1}
    db.get_user_by_id.return_value = {'ai_enabled': True}
    db.create_conversation.return_value = 10
    db.get_conversation_by_id.return_value = {'conversation_id': 10, 'title': 'title'}
    db.get_conversation_messages.return_value = []
    db.add_message.return_value = 1
    return chat, db, agent


@pytest.mark.parametrize('route', ['chat_with_ai', 'chat_with_conversation'])
def test_generation_checks_current_permission(api, route):
    chat, db, agent = api
    def invoke():
        if route == 'chat_with_ai':
            return chat.chat_with_ai(chat.ChatRequest(message='hello'), user_id=1, agent=agent)
        return chat.chat_with_conversation(10, message='hello', user_id=1, agent=agent)

    assert invoke()['success']
    agent.reset_mock()
    db.reset_mock()
    db.get_user_by_id.return_value = {'ai_enabled': False}
    with pytest.raises(HTTPException) as exc:
        invoke()
    assert exc.value.status_code == 403
    agent.chat.assert_not_called()
    db.create_conversation.assert_not_called()
    db.add_message.assert_not_called()
    assert chat.get_conversation(10, user_id=1)['success']
