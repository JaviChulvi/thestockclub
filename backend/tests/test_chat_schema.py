import importlib.util
import sys
import types

from sqlalchemy import Column, Integer, Table, create_engine, inspect


def test_conversations_and_messages_can_be_created_together(monkeypatch):
    base_spec = importlib.util.spec_from_file_location('test_chat_base', 'backend/database/models/base.py')
    base = importlib.util.module_from_spec(base_spec)
    base_spec.loader.exec_module(base)
    monkeypatch.setitem(sys.modules, 'database', types.ModuleType('database'))
    monkeypatch.setitem(sys.modules, 'database.models', types.ModuleType('database.models'))
    monkeypatch.setitem(sys.modules, 'database.models.base', base)
    chat_spec = importlib.util.spec_from_file_location('test_chat_models', 'backend/database/models/chat.py')
    chat = importlib.util.module_from_spec(chat_spec)
    chat_spec.loader.exec_module(chat)
    Table('users', base.Base.metadata, Column('id', Integer, primary_key=True))
    engine = create_engine('sqlite:///:memory:')
    base.Base.metadata.create_all(engine)
    base.Base.metadata.create_all(engine)
    assert set(inspect(engine).get_table_names()) == {'users', 'conversations', 'messages'}
    engine.dispose()
