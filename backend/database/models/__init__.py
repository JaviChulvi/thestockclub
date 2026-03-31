"""
SQLAlchemy ORM models for FundLord database
Exports all models and the declarative base
"""
from database.models.base import Base, TimestampMixin, IdMixin
from database.models.user import User, Session
from database.models.benchmark import Benchmark, Manager, Holding, FundHolding
from database.models.category import Category
from database.models.fund import Fund, FundPriceHistory
from database.models.stock import Stock, StockPriceHistory
from database.models.chat import Conversation, Message
from database.models.data_task import DataTask, TaskStatus, TaskType

__all__ = [
    # Base
    'Base',
    'TimestampMixin',
    'IdMixin',

    # User models
    'User',
    'Session',

    # Benchmark models
    'Benchmark',
    'Manager',
    'Holding',
    'FundHolding',

    # Category model
    'Category',

    # Fund models
    'Fund',
    'FundPriceHistory',

    # Stock models
    'Stock',
    'StockPriceHistory',

    # Chat models
    'Conversation',
    'Message',

    # Data Task models
    'DataTask',
    'TaskStatus',
    'TaskType',
]
