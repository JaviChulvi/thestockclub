"""
Conversation and Message ORM models for chat functionality
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, CheckConstraint, Index, DateTime, text
from sqlalchemy.orm import relationship
from database.models.base import Base, TimestampMixin, IdMixin


class Conversation(Base, IdMixin, TimestampMixin):
    """Conversation model for chat conversations"""
    __tablename__ = 'conversations'
    __table_args__ = (
        Index('idx_user_id', 'user_id'),
        Index('idx_created_at', 'created_at'),
    )

    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(500), nullable=False)

    # Relationships
    user = relationship('User', back_populates='conversations')
    messages = relationship('Message', back_populates='conversation', cascade='all, delete-orphan', order_by='Message.created_at')

    def __repr__(self):
        return f"<Conversation(id={self.id}, user_id={self.user_id}, title='{self.title}')>"


class Message(Base, IdMixin):
    """Message model for chat messages (has created_at but no updated_at)"""
    __tablename__ = 'messages'
    __table_args__ = (
        CheckConstraint("message_type IN ('user', 'ai')", name='check_message_type'),
        Index('idx_conversation_id', 'conversation_id'),
        Index('idx_created_at', 'created_at'),
        Index('idx_conversation_created', 'conversation_id', 'created_at'),
    )

    conversation_id = Column(Integer, ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False)
    content = Column(Text, nullable=False)
    message_type = Column(String(10), nullable=False)  # 'user' or 'ai'
    artifact = Column(Text)  # Optional artifact data for rich UI display
    isin = Column(String(500))  # Optional ISIN or artifact parameters (JSON string for complex artifacts)
    created_at = Column(DateTime, server_default=text('CURRENT_TIMESTAMP'), nullable=False)

    # Relationships
    conversation = relationship('Conversation', back_populates='messages')

    def __repr__(self):
        return f"<Message(id={self.id}, conversation_id={self.conversation_id}, type='{self.message_type}')>"
