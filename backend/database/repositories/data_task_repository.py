"""
DataTask repository for managing background data synchronization tasks
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from database.connection import DatabaseConnection
from database.models import DataTask, TaskStatus, TaskType, Base
from sqlalchemy import func


class DataTaskRepository(DatabaseConnection):
    """DataTask-specific database operations"""

    def create_data_tasks_table(self) -> bool:
        """Create the data_tasks table using SQLAlchemy ORM"""
        try:
            Base.metadata.create_all(self.engine, tables=[DataTask.__table__])
            print("DataTasks table created successfully")
            return True
        except Exception as e:
            print(f"Error creating data_tasks table: {e}")
            return False

    def create_task(
        self,
        task_type: TaskType,
        started_by: int
    ) -> Optional[int]:
        """Create a new data task"""
        try:
            with self.get_session() as session:
                task = DataTask(
                    task_type=task_type,
                    status=TaskStatus.PENDING,
                    started_by=started_by
                )
                session.add(task)
                session.flush()
                task_id = task.id
                return task_id
        except Exception as e:
            print(f"Error creating task: {e}")
            return None

    def update_task_status(
        self,
        task_id: int,
        status: TaskStatus,
        process_id: Optional[int] = None,
        error_message: Optional[str] = None,
        output_log: Optional[str] = None
    ) -> bool:
        """Update task status and related fields"""
        try:
            with self.get_session() as session:
                task = session.query(DataTask).filter(DataTask.id == task_id).first()

                if not task:
                    return False

                task.status = status

                if status == TaskStatus.RUNNING and not task.started_at:
                    task.started_at = datetime.utcnow()

                if status in [TaskStatus.COMPLETED, TaskStatus.FAILED]:
                    task.completed_at = datetime.utcnow()

                if process_id is not None:
                    task.process_id = process_id

                if error_message is not None:
                    task.error_message = error_message

                if output_log is not None:
                    task.output_log = output_log

                session.flush()
                return True
        except Exception as e:
            print(f"Error updating task status: {e}")
            return False

    def get_task_by_id(self, task_id: int) -> Optional[Dict[str, Any]]:
        """Get task by ID"""
        try:
            with self.get_session() as session:
                task = session.query(DataTask).filter(DataTask.id == task_id).first()

                if not task:
                    return None

                return self._task_to_dict(task)
        except Exception as e:
            print(f"Error retrieving task: {e}")
            return None

    def get_all_tasks(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get all tasks ordered by creation date (most recent first)"""
        try:
            with self.get_session() as session:
                tasks = session.query(DataTask).order_by(
                    DataTask.created_at.desc()
                ).limit(limit).all()

                return [self._task_to_dict(task) for task in tasks]
        except Exception as e:
            print(f"Error retrieving tasks: {e}")
            return []

    def get_running_tasks(self) -> List[Dict[str, Any]]:
        """Get all currently running tasks"""
        try:
            with self.get_session() as session:
                tasks = session.query(DataTask).filter(
                    DataTask.status == TaskStatus.RUNNING
                ).all()

                return [self._task_to_dict(task) for task in tasks]
        except Exception as e:
            print(f"Error retrieving running tasks: {e}")
            return []

    def _task_to_dict(self, task: DataTask) -> Dict[str, Any]:
        """Convert DataTask ORM object to dictionary"""
        return {
            'id': task.id,
            'task_type': task.task_type.value,
            'status': task.status.value,
            'started_by': task.started_by,
            'started_at': task.started_at.isoformat() if task.started_at else None,
            'completed_at': task.completed_at.isoformat() if task.completed_at else None,
            'output_log': task.output_log,
            'error_message': task.error_message,
            'process_id': task.process_id,
            'created_at': task.created_at.isoformat() if task.created_at else None,
            'updated_at': task.updated_at.isoformat() if task.updated_at else None
        }
