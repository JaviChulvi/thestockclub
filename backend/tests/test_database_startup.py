import asyncio
import importlib.util
import sys
import types
from unittest.mock import Mock

import pytest


@pytest.mark.parametrize('result', [True, False, RuntimeError('database unavailable')])
def test_database_startup_reports_result_without_blocking(monkeypatch, capsys, result):
    db = Mock()
    if isinstance(result, Exception):
        db.initialize_database.side_effect = result
    else:
        db.initialize_database.return_value = result
    monkeypatch.setitem(sys.modules, 'database', types.SimpleNamespace(db=db))
    monkeypatch.setitem(sys.modules, 'agent', types.SimpleNamespace(AiAgent=lambda: object()))
    monkeypatch.setitem(sys.modules, 'api', types.SimpleNamespace(api_routers=[]))
    monkeypatch.setitem(sys.modules, 'util', types.SimpleNamespace(is_production=lambda: False))
    monkeypatch.setitem(sys.modules, 'dotenv', types.SimpleNamespace(load_dotenv=lambda: None))
    spec = importlib.util.spec_from_file_location('startup_under_test', 'backend/main.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    async def run():
        async with module.lifespan(module.app):
            assert module.app.state.agent is not None

    asyncio.run(run())
    output = capsys.readouterr().out
    assert ('Database initialized successfully' in output) == (result is True)
    assert ('Database initialization failed' in output) == (result is not True)
