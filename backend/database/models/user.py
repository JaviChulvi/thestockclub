"""
User and Session ORM models
"""
import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from database.models.base import Base, TimestampMixin, IdMixin
from sqlalchemy import Enum as SAEnum

class UserRole(enum.Enum):
    USER = 'USER'
    ADMIN = 'ADMIN'

class User(Base, IdMixin, TimestampMixin):
    """User model for authentication and user management"""
    __tablename__ = 'users'

    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    ai_enabled = Column(Boolean, default=False, nullable=False)
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.USER)

    # Relationships
    sessions = relationship('Session', back_populates='user', cascade='all, delete-orphan')
    conversations = relationship('Conversation', back_populates='user', cascade='all, delete-orphan')

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', name='{self.first_name} {self.last_name}')>"


class Session(Base, IdMixin, TimestampMixin):
    """Session model for user session management"""
    __tablename__ = 'sessions'

    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    session_token = Column(String(255), unique=True, nullable=False, index=True)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    expires_at = Column(DateTime, nullable=False, index=True)

    # Relationships
    user = relationship('User', back_populates='sessions')

    def __repr__(self):
        return f"<Session(id={self.id}, user_id={self.user_id}, expires_at={self.expires_at})>"
