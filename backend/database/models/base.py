"""
Base configuration for SQLAlchemy ORM models
Provides declarative base and common mixins
"""
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, DateTime, text

# Create declarative base for all models
Base = declarative_base()


class TimestampMixin:
    """
    Mixin to add created_at and updated_at timestamps to models.
    Uses database CURRENT_TIMESTAMP to ensure consistency with database timezone.
    """
    created_at = Column(
        DateTime,
        server_default=text('CURRENT_TIMESTAMP'),
        nullable=False
    )
    updated_at = Column(
        DateTime,
        server_default=text('CURRENT_TIMESTAMP'),
        onupdate=text('CURRENT_TIMESTAMP'),
        nullable=False
    )


class IdMixin:
    """Mixin to add auto-incrementing primary key id"""
    id = Column(Integer, primary_key=True, autoincrement=True)
