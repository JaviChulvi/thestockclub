import importlib
import sys
import types
from unittest.mock import Mock

import pytest


@pytest.fixture
def api(monkeypatch):
    db = Mock()
    monkeypatch.setitem(sys.modules, 'database', types.SimpleNamespace(db=db))
    monkeypatch.setitem(sys.modules, 'stock_analysis', types.ModuleType('stock_analysis'))
    package = types.ModuleType('api')
    package.__path__ = ['backend/api']
    monkeypatch.setitem(sys.modules, 'api', package)
    messages = types.ModuleType('langchain_core.messages')
    class Message:
        def __init__(self, content):
            self.content = content
    messages.HumanMessage = messages.AIMessage = Message
    monkeypatch.setitem(sys.modules, 'langchain_core', types.ModuleType('langchain_core'))
    monkeypatch.setitem(sys.modules, 'langchain_core.messages', messages)
    for name in ('api.utils', 'api.chat'):
        sys.modules.pop(name, None)
    return importlib.import_module('api.chat'), db


def test_existing_turn_is_persisted_once_and_excluded_from_bounded_history(api):
    chat, db = api
    stored = [{'message_type': 'user', 'content': f'prior {i}'} for i in range(25)]
    db.get_conversation_by_id.return_value = {'conversation_id': 10}
    db.get_conversation_messages.side_effect = lambda _: list(stored)
    def add_message(cid, content, kind, *args):
        stored.append({'message_type': kind, 'content': content})
        return len(stored)
    db.add_message.side_effect = add_message
    agent = Mock()
    agent.chat.return_value = 'answer'
    assert chat._handle_chat_logic('current', 1, agent, 10)['success']
    message, history = agent.chat.call_args.args
    assert message == 'current'
    assert [item.content for item in history] == [f'prior {i}' for i in range(5, 25)]
    assert [item['content'] for item in stored[-2:]] == ['current', 'answer']


def test_new_conversation_has_empty_history(api):
    chat, db = api
    db.create_conversation.return_value = 10
    db.add_message.return_value = 2
    agent = Mock()
    agent.chat.return_value = 'answer'
    chat._handle_chat_logic('first', 1, agent)
    db.create_conversation.assert_called_once_with(1, 'first', 'first')
    agent.chat.assert_called_once_with('first', [])
