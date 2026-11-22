import importlib
import importlib.util
import sys
import types

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, text


def test_delete_conversation_with_sqlalchemy_and_ownership(monkeypatch):
    engine = create_engine('sqlite://')
    with engine.begin() as conn:
        conn.execute(text('PRAGMA foreign_keys=ON'))
        conn.execute(text('CREATE TABLE conversations (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL)'))
        conn.execute(text('CREATE TABLE messages (id INTEGER PRIMARY KEY, conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE)'))
        conn.execute(text('INSERT INTO conversations VALUES (10, 1), (20, 2)'))
        conn.execute(text('INSERT INTO messages VALUES (1, 10), (2, 20)'))

    monkeypatch.setitem(sys.modules, 'util', types.SimpleNamespace(is_production=lambda: False))
    spec = importlib.util.spec_from_file_location('connection_under_test', 'backend/database/connection.py')
    connection = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(connection)
    db = connection.DatabaseConnection.__new__(connection.DatabaseConnection)
    db.engine = engine
    def get_conversation(cid, uid):
        with engine.connect() as conn:
            row = conn.execute(text('SELECT id FROM conversations WHERE id=:id AND user_id=:uid'), {'id': cid, 'uid': uid}).first()
            return {'conversation_id': row.id} if row else None
    db.get_conversation_by_id = get_conversation
    monkeypatch.setitem(sys.modules, 'database', types.SimpleNamespace(db=db))
    monkeypatch.setitem(sys.modules, 'stock_analysis', types.ModuleType('stock_analysis'))
    package = types.ModuleType('api')
    package.__path__ = ['backend/api']
    monkeypatch.setitem(sys.modules, 'api', package)
    messages = types.ModuleType('langchain_core.messages')
    messages.HumanMessage = messages.AIMessage = object
    monkeypatch.setitem(sys.modules, 'langchain_core', types.ModuleType('langchain_core'))
    monkeypatch.setitem(sys.modules, 'langchain_core.messages', messages)
    for name in ('api.utils', 'api.chat'):
        sys.modules.pop(name, None)
    chat = importlib.import_module('api.chat')
    with pytest.raises(HTTPException) as exc:
        chat.delete_conversation(20, user_id=1)
    assert exc.value.status_code == 404
    assert chat.delete_conversation(10, user_id=1)['success']
    with engine.connect() as conn:
        assert conn.execute(text('SELECT id FROM conversations')).scalars().all() == [20]
        assert conn.execute(text('SELECT id FROM messages')).scalars().all() == [2]
