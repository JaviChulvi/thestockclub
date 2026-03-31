from typing import Optional, Dict, Any, List
import sys
import os

# Add backend directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from database.connection import DatabaseConnection
from database.models import Conversation, Message, User, Base
from sqlalchemy import func

class ChatRepository(DatabaseConnection):
    """Chat conversation and message database operations using SQLAlchemy ORM"""

    # ==================== CREATE TABLES ====================

    def create_conversations_table(self) -> bool:
        """Create the conversations table using SQLAlchemy ORM"""
        try:
            Base.metadata.create_all(self.engine, tables=[Conversation.__table__])
            print("Conversations table created successfully")
            return True
        except Exception as e:
            print(f"Error creating conversations table: {e}")
            return False

    def create_messages_table(self) -> bool:
        """Create the messages table using SQLAlchemy ORM"""
        try:
            Base.metadata.create_all(self.engine, tables=[Message.__table__])
            print("Messages table created successfully")
            return True
        except Exception as e:
            print(f"Error creating messages table: {e}")
            return False

    # ==================== CONVERSATION OPERATIONS ====================

    def create_conversation(self, user_id: int, title: str, first_message_content: str) -> Optional[int]:
        """Create a new conversation with the first message"""
        try:
            with self.get_session() as session:
                # Create conversation
                conversation = Conversation(
                    user_id=user_id,
                    title=title
                )
                session.add(conversation)
                session.flush()  # Flush to get the ID

                # Add first message
                first_message = Message(
                    conversation_id=conversation.id,
                    content=first_message_content,
                    message_type='user'
                )
                session.add(first_message)

                conversation_id = conversation.id
                print(f"Conversation created successfully with ID: {conversation_id}")
                return conversation_id

        except Exception as e:
            print(f"Error creating conversation for user {user_id}: {e}")
            import traceback
            traceback.print_exc()
            return None

    def add_message(self, conversation_id: int, content: str, message_type: str = 'user', artifact: str = None, isin: str = None) -> Optional[int]:
        """Add a message to an existing conversation"""
        try:
            with self.get_session() as session:
                # Insert message
                message = Message(
                    conversation_id=conversation_id,
                    content=content,
                    message_type=message_type,
                    artifact=artifact,
                    isin=isin
                )
                session.add(message)
                session.flush()  # Flush to get the ID
                message_id = message.id

                # Update conversation's updated_at timestamp using database function
                conversation = session.query(Conversation).filter(
                    Conversation.id == conversation_id
                ).first()
                if conversation:
                    # Trigger the onupdate by modifying the object
                    # SQLAlchemy will use CURRENT_TIMESTAMP via the onupdate defined in the model
                    session.query(Conversation).filter(
                        Conversation.id == conversation_id
                    ).update({Conversation.updated_at: func.now()}, synchronize_session='fetch')

                print(f"Message added to conversation {conversation_id}")
                return message_id
        except Exception as e:
            print(f"Error adding message to conversation {conversation_id}: {e}")
            import traceback
            traceback.print_exc()
            return None

    def get_conversation_messages(self, conversation_id: int) -> List[Dict[str, Any]]:
        """Get all messages for a conversation in chronological order"""
        try:
            with self.get_session() as session:
                messages = session.query(Message).filter(
                    Message.conversation_id == conversation_id
                ).order_by(Message.created_at.asc()).all()

                return [{
                    'message_id': msg.id,
                    'content': msg.content,
                    'message_type': msg.message_type,
                    'artifact': msg.artifact,
                    'isin': msg.isin,
                    'created_at': msg.created_at
                } for msg in messages]
        except Exception as e:
            print(f"Error retrieving messages for conversation {conversation_id}: {e}")
            return []

    def get_user_conversations(self, user_id: int, limit: int = None) -> List[Dict[str, Any]]:
        """Get all conversations for a user, ordered by most recent update"""
        try:
            with self.get_session() as session:
                query = session.query(
                    Conversation.id.label('conversation_id'),
                    Conversation.title,
                    Conversation.created_at,
                    Conversation.updated_at,
                    func.count(Message.id).label('message_count')
                ).outerjoin(Message).filter(
                    Conversation.user_id == user_id
                ).group_by(
                    Conversation.id,
                    Conversation.title,
                    Conversation.created_at,
                    Conversation.updated_at
                ).order_by(Conversation.updated_at.desc())

                if limit and self._validate_limit(limit):
                    query = query.limit(limit)

                results = query.all()
                return [{
                    'conversation_id': row.conversation_id,
                    'title': row.title,
                    'created_at': row.created_at,
                    'updated_at': row.updated_at,
                    'message_count': row.message_count
                } for row in results]
        except Exception as e:
            print(f"Error retrieving conversations for user {user_id}: {e}")
            return []

    def get_conversation_by_id(self, conversation_id: int, user_id: int = None) -> Optional[Dict[str, Any]]:
        """Get a specific conversation by ID, optionally verifying ownership"""
        try:
            with self.get_session() as session:
                query = session.query(Conversation).filter(
                    Conversation.id == conversation_id
                )

                if user_id:
                    query = query.filter(Conversation.user_id == user_id)

                conversation = query.first()
                if not conversation:
                    return None

                return {
                    'conversation_id': conversation.id,
                    'user_id': conversation.user_id,
                    'title': conversation.title,
                    'created_at': conversation.created_at,
                    'updated_at': conversation.updated_at
                }
        except Exception as e:
            print(f"Error retrieving conversation {conversation_id}: {e}")
            return None

