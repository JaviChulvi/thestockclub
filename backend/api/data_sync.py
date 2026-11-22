"""
Data Sync API endpoints
Handles triggering and monitoring background data synchronization tasks
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from database import db
from database.models import TaskStatus, TaskType
from api.admin import require_admin
from api.utils import handle_errors, success_response, error_response, get_resource_or_404

import subprocess
import os
import sys
import signal
import threading
import time
from datetime import datetime, timedelta

# Create router
router = APIRouter()

# Get the path to the data scripts
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
PYTHON_EXECUTABLE = sys.executable

# Timeout settings (in seconds)
TASK_TIMEOUT = 200 * 60  # 30 minutes max per task


def monitor_process(task_id: int, process: subprocess.Popen, timeout: int = TASK_TIMEOUT):
    """
    Monitor a subprocess with timeout and capture output
    Runs in a background thread
    """
    start_time = datetime.now()
    output_lines = []
    max_log_lines = 10000  # Limit log size

    def read_stream(stream, prefix=""):
        """Read from a stream and collect output"""
        try:
            for line in iter(stream.readline, b''):
                if line:
                    decoded_line = line.decode('utf-8', errors='replace').rstrip()
                    output_lines.append(f"{prefix}{decoded_line}")
                    # Keep only last max_log_lines to prevent memory issues
                    if len(output_lines) > max_log_lines:
                        output_lines.pop(0)
        except Exception as e:
            output_lines.append(f"Error reading stream: {e}")

    # Start threads to read stdout and stderr
    stdout_thread = threading.Thread(target=read_stream, args=(process.stdout, ""))
    stderr_thread = threading.Thread(target=read_stream, args=(process.stderr, "[ERROR] "))
    stdout_thread.daemon = True
    stderr_thread.daemon = True
    stdout_thread.start()
    stderr_thread.start()

    # Monitor the process
    while True:
        # Check if process has finished
        exit_code = process.poll()
        if exit_code is not None:
            # Wait for output threads to finish reading
            stdout_thread.join(timeout=2)
            stderr_thread.join(timeout=2)

            # Update task status based on exit code
            output_log = "\n".join(output_lines) if output_lines else "No output captured"

            if exit_code == 0:
                db.update_task_status(
                    task_id=task_id,
                    status=TaskStatus.COMPLETED,
                    output_log=output_log
                )
            else:
                db.update_task_status(
                    task_id=task_id,
                    status=TaskStatus.FAILED,
                    error_message=f"Process exited with code {exit_code}",
                    output_log=output_log
                )
            break

        # Check for timeout
        elapsed = (datetime.now() - start_time).total_seconds()
        if elapsed > timeout:
            # Kill the process
            try:
                process.kill()
                output_lines.append(f"\n[TIMEOUT] Task exceeded maximum duration of {timeout/60:.1f} minutes and was terminated")
                db.update_task_status(
                    task_id=task_id,
                    status=TaskStatus.FAILED,
                    error_message=f"Task timed out after {timeout/60:.1f} minutes",
                    output_log="\n".join(output_lines)
                )
            except Exception as e:
                output_lines.append(f"[ERROR] Failed to kill timed-out process: {e}")
            break

        # Update log in database periodically (every 5 seconds) for real-time viewing
        if int(elapsed) % 5 == 0:
            db.update_task_status(
                task_id=task_id,
                status=TaskStatus.RUNNING,
                output_log="\n".join(output_lines)
            )

        time.sleep(1)


class StartTaskResponse(BaseModel):
    success: bool
    task_id: int
    message: str


class TaskStatusResponse(BaseModel):
    success: bool
    task: dict


class TaskListResponse(BaseModel):
    success: bool
    tasks: List[dict]


@router.post('/start/{task_type}', response_model=StartTaskResponse)
@handle_errors
def start_data_sync_task(
    task_type: str,
    admin_user_id: str = Depends(require_admin)
):
    """
    Start a background data synchronization task (ADMIN only)

    task_type can be: 'update_funds' or 'load_stocks'
    """
    # Validate task type
    if task_type == 'update_funds':
        task_enum = TaskType.UPDATE_FUNDS
        script_path = os.path.join(DATA_DIR, 'update_data.py')
    elif task_type == 'load_stocks':
        task_enum = TaskType.LOAD_STOCKS
        script_path = os.path.join(DATA_DIR, 'load_stocks_from_holdings.py')
    else:
        raise error_response(
            400,
            f'Invalid task type. Must be "update_funds" or "load_stocks"'
        )

    # Check if script exists
    if not os.path.exists(script_path):
        raise error_response(500, f'Script not found: {script_path}')

    # Check if there's already a running task of this type
    running_tasks = db.get_running_tasks()
    for task in running_tasks:
        if task['task_type'] == task_type:
            raise error_response(
                409,
                f'A {task_type} task is already running (Task ID: {task["id"]})'
            )

    # Create task record in database
    task_id = db.create_task(
        task_type=task_enum,
        started_by=int(admin_user_id)
    )

    if not task_id:
        raise error_response(500, 'Failed to create task record')

    # Start the background process
    try:
        # Run the script in the background
        process = subprocess.Popen(
            [PYTHON_EXECUTABLE, script_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=DATA_DIR,
            start_new_session=True  # Detach from parent process
        )

        # Update task status to RUNNING with process ID
        db.update_task_status(
            task_id=task_id,
            status=TaskStatus.RUNNING,
            process_id=process.pid
        )

        # Start monitoring thread
        monitor_thread = threading.Thread(
            target=monitor_process,
            args=(task_id, process),
            daemon=True
        )
        monitor_thread.start()

        return StartTaskResponse(
            success=True,
            task_id=task_id,
            message=f'{task_type} task started successfully (PID: {process.pid})'
        )

    except Exception as e:
        # Mark task as failed if process couldn't start
        db.update_task_status(
            task_id=task_id,
            status=TaskStatus.FAILED,
            error_message=f'Failed to start process: {str(e)}'
        )
        raise error_response(
            500,
            f'Failed to start background process: {str(e)}'
        )


@router.get('/tasks', response_model=TaskListResponse)
@handle_errors
def get_all_tasks(
    limit: int = 50,
    admin_user_id: str = Depends(require_admin)
):
    """
    Get all data synchronization tasks (ADMIN only)
    Returns tasks ordered by creation date (most recent first)
    """
    tasks = db.get_all_tasks(limit=limit)

    return TaskListResponse(
        success=True,
        tasks=tasks
    )


@router.get('/tasks/{task_id}', response_model=TaskStatusResponse)
@handle_errors
def get_task_status(
    task_id: int,
    admin_user_id: str = Depends(require_admin)
):
    """
    Get status of a specific data synchronization task (ADMIN only)
    """
    task = get_resource_or_404(db.get_task_by_id, task_id, "Task")

    # Check if process is still running (for RUNNING status)
    if task['status'] == 'running' and task['process_id']:
        try:
            # Check if process exists
            os.kill(task['process_id'], 0)  # Signal 0 doesn't kill, just checks
        except ProcessLookupError:
            # The monitor may already have recorded a terminal result. Never
            # write an inferred result over it; report an unknown outcome only
            # while the persisted record still says running.
            task = get_resource_or_404(db.get_task_by_id, task_id, "Task")
            if task['status'] == 'running':
                task = dict(task, status='failed', error_message='Process not found; exit status unknown')

    return TaskStatusResponse(
        success=True,
        task=task
    )


@router.get('/running', response_model=TaskListResponse)
@handle_errors
def get_running_tasks(admin_user_id: str = Depends(require_admin)):
    """
    Get all currently running tasks (ADMIN only)
    """
    tasks = db.get_running_tasks()

    return TaskListResponse(
        success=True,
        tasks=tasks
    )


class StopTaskResponse(BaseModel):
    success: bool
    message: str


@router.post('/stop/{task_id}', response_model=StopTaskResponse)
@handle_errors
def stop_task(
    task_id: int,
    admin_user_id: str = Depends(require_admin)
):
    """
    Stop a running data synchronization task (ADMIN only)
    Kills the background process and marks the task as cancelled
    """
    # Get the task
    task = get_resource_or_404(db.get_task_by_id, task_id, "Task")

    # Check if task is running
    if task['status'] != 'running':
        raise error_response(
            400,
            f'Task is not running (current status: {task["status"]})'
        )

    # Check if we have a process ID
    if not task['process_id']:
        raise error_response(400, 'Task has no process ID, cannot stop')

    # Try to kill the process
    try:
        # Send SIGTERM first (graceful shutdown)
        os.kill(task['process_id'], signal.SIGTERM)

        # Update task status to cancelled
        db.update_task_status(
            task_id=task_id,
            status=TaskStatus.FAILED,
            error_message='Task stopped by administrator'
        )

        return StopTaskResponse(
            success=True,
            message=f'Task #{task_id} stopped successfully (PID: {task["process_id"]})'
        )

    except ProcessLookupError:
        raise error_response(
            404,
            'Process not found; exit status unknown'
        )
    except PermissionError:
        raise error_response(403, 'Permission denied to kill process')
    except Exception as e:
        raise error_response(500, f'Error killing process: {str(e)}')
