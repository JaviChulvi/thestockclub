import importlib
import io
import sys
import types
from enum import Enum
from unittest.mock import Mock

import pytest
from fastapi import HTTPException


@pytest.fixture
def api(monkeypatch):
    db = Mock()
    class Status(Enum):
        COMPLETED = 'completed'
        FAILED = 'failed'
        RUNNING = 'running'
    monkeypatch.setitem(sys.modules, 'database', types.SimpleNamespace(db=db))
    monkeypatch.setitem(sys.modules, 'database.models', types.SimpleNamespace(TaskStatus=Status, TaskType=object))
    package = types.ModuleType('api')
    package.__path__ = ['backend/api']
    monkeypatch.setitem(sys.modules, 'api', package)
    monkeypatch.setitem(sys.modules, 'api.admin', types.SimpleNamespace(require_admin=lambda: 1))
    for name in ('api.utils', 'api.data_sync'):
        sys.modules.pop(name, None)
    sync = importlib.import_module('api.data_sync')
    monkeypatch.setattr(sync.os, 'kill', Mock(side_effect=ProcessLookupError()))
    return sync, db, Status


def test_lost_process_is_not_success_and_never_overwrites_terminal_state(api):
    sync, db, _ = api
    running = {'status': 'running', 'process_id': 42}
    db.get_task_by_id.return_value = running
    result = sync.get_task_status(1, admin_user_id=1).task
    assert result['status'] == 'failed'
    assert result['error_message']
    db.update_task_status.assert_not_called()
    db.get_task_by_id.side_effect = [running, {'status': 'completed', 'process_id': 42}]
    assert sync.get_task_status(1, admin_user_id=1).task['status'] == 'completed'
    db.update_task_status.assert_not_called()


def test_monitor_zero_exit_records_success(api):
    sync, db, status = api
    process = types.SimpleNamespace(stdout=io.BytesIO(), stderr=io.BytesIO(), poll=lambda: 0)
    sync.monitor_process(1, process)
    assert db.update_task_status.call_args.kwargs['status'] == status.COMPLETED


def test_stop_missing_process_does_not_infer_success(api):
    sync, db, _ = api
    db.get_task_by_id.return_value = {'status': 'running', 'process_id': 42}
    with pytest.raises(HTTPException) as exc:
        sync.stop_task(1, admin_user_id=1)
    assert exc.value.status_code == 404
    db.update_task_status.assert_not_called()
