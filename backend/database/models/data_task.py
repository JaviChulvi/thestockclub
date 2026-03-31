"""
DataTask ORM model for tracking background data synchronization tasks
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum as SQLEnum
from database.models.base import Base, TimestampMixin, IdMixin
from datetime import datetime
import enum

class TaskStatus(enum.Enum):
    """Task status enumeration"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class TaskType(enum.Enum):
    """Task type enumeration"""
    UPDATE_FUNDS = "update_funds"
    LOAD_STOCKS = "load_stocks"

class DataTask(Base, IdMixin, TimestampMixin):
    """DataTask model for background data synchronization jobs"""
    __tablename__ = 'data_tasks'

    task_type = Column(SQLEnum(TaskType), nullable=False)
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.PENDING, nullable=False)
    started_by = Column(Integer, nullable=False)  # User ID who started the task
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    output_log = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    process_id = Column(Integer, nullable=True)  # OS process ID

    def __repr__(self):
        return f"<DataTask(id={self.id}, type='{self.task_type.value}', status='{self.status.value}')>"
