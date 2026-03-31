from typing import Optional, Dict, Any, List
from datetime import datetime
import sys
import os

# Add backend directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from database.connection import DatabaseConnection
from database.models import User, Session, Base
from sqlalchemy import func
from sqlalchemy.orm import joinedload

class UserRepository(DatabaseConnection):
    """User and session management database operations using SQLAlchemy ORM"""

    # ==================== CREATE TABLES ====================

    def create_users_table(self) -> bool:
        """Create the users table using SQLAlchemy ORM"""
        try:
            Base.metadata.create_all(self.engine, tables=[User.__table__])
            print("Users table created successfully")
            return True
        except Exception as e:
            print(f"Error creating users table: {e}")
            return False

    def create_sessions_table(self) -> bool:
        """Create the sessions table using SQLAlchemy ORM"""
        try:
            Base.metadata.create_all(self.engine, tables=[Session.__table__])
            print("Sessions table created successfully")
            return True
        except Exception as e:
            print(f"Error creating sessions table: {e}")
            return False

    # ==================== USER OPERATIONS ====================

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email address"""
        try:
            with self.get_session() as session:
                user = session.query(User).filter(User.email == email).first()
                if not user:
                    return None
                return {
                    'id': user.id,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'email': user.email,
                    'password_hash': user.password_hash,
                    'is_active': user.is_active,
                    'ai_enabled': user.ai_enabled,
                    'role': user.role.value if user.role else 'USER',
                    'created_at': user.created_at,
                    'updated_at': user.updated_at
                }
        except Exception as e:
            print(f"Error retrieving user by email {email}: {e}")
            return None

    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        try:
            with self.get_session() as session:
                user = session.query(User).filter(User.id == user_id).first()
                if not user:
                    return None
                return {
                    'id': user.id,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'email': user.email,
                    'is_active': user.is_active,
                    'ai_enabled': user.ai_enabled,
                    'role': user.role.value if user.role else 'USER',
                    'created_at': user.created_at,
                    'updated_at': user.updated_at
                }
        except Exception as e:
            print(f"Error retrieving user by ID {user_id}: {e}")
            return None

    def create_user(self, first_name: str, last_name: str, email: str, password_hash: str) -> Optional[int]:
        """Create a new user account"""
        try:
            with self.get_session() as session:
                user = User(
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                    password_hash=password_hash
                )
                session.add(user)
                session.flush()  # Flush to get the ID
                user_id = user.id
                print(f"User created successfully with ID: {user_id}")
                return user_id
        except Exception as e:
            print(f"Error creating user {email}: {e}")
            return None

    # ==================== SESSION OPERATIONS ====================

    def create_session(self, user_id: int, session_token: str, expires_at: datetime,
                      ip_address: str = None, user_agent: str = None) -> Optional[int]:
        """Create a new user session"""
        try:
            with self.get_session() as db_session:
                session_obj = Session(
                    user_id=user_id,
                    session_token=session_token,
                    expires_at=expires_at,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
                db_session.add(session_obj)
                db_session.flush()  # Flush to get the ID
                session_id = session_obj.id
                print(f"Session created successfully with ID: {session_id}")
                return session_id
        except Exception as e:
            print(f"Error creating session for user {user_id}: {e}")
            return None

    def get_session_by_token(self, session_token: str) -> Optional[Dict[str, Any]]:
        """Get session by token with user information"""
        try:
            with self.get_session() as db_session:
                # Use joinedload to eagerly load the user relationship
                session_obj = db_session.query(Session).options(
                    joinedload(Session.user)
                ).filter(
                    Session.session_token == session_token,
                    Session.expires_at > func.now()
                ).first()

                if not session_obj:
                    return None

                # Access all relationship data within the session context
                return {
                    'id': session_obj.id,
                    'user_id': session_obj.user_id,
                    'session_token': session_obj.session_token,
                    'ip_address': session_obj.ip_address,
                    'user_agent': session_obj.user_agent,
                    'expires_at': session_obj.expires_at,
                    'created_at': session_obj.created_at,
                    'updated_at': session_obj.updated_at,
                    'first_name': session_obj.user.first_name,
                    'last_name': session_obj.user.last_name,
                    'email': session_obj.user.email,
                    'is_active': session_obj.user.is_active,
                    'role': session_obj.user.role.value if session_obj.user.role else 'USER'
                }
        except Exception as e:
            print(f"Error retrieving session by token: {e}")
            return None

    def delete_session(self, session_token: str) -> bool:
        """Delete a session (logout)"""
        try:
            with self.get_session() as db_session:
                session_obj = db_session.query(Session).filter(
                    Session.session_token == session_token
                ).first()
                if session_obj:
                    db_session.delete(session_obj)
                print(f"Session deleted successfully")
                return True
        except Exception as e:
            print(f"Error deleting session: {e}")
            return False

    def delete_expired_sessions(self) -> int:
        """Delete all expired sessions"""
        try:
            with self.get_session() as db_session:
                row_count = db_session.query(Session).filter(
                    Session.expires_at <= func.now()
                ).delete()
                print(f"Deleted {row_count} expired sessions")
                return row_count
        except Exception as e:
            print(f"Error deleting expired sessions: {e}")
            return 0

    def delete_user_sessions(self, user_id: int) -> bool:
        """Delete all sessions for a specific user"""
        try:
            with self.get_session() as db_session:
                db_session.query(Session).filter(Session.user_id == user_id).delete()
                print(f"All sessions for user {user_id} deleted successfully")
                return True
        except Exception as e:
            print(f"Error deleting sessions for user {user_id}: {e}")
            return False

    # ==================== ADMIN OPERATIONS ====================

    def get_all_users(self) -> List[Dict[str, Any]]:
        """Get all users (ADMIN only)"""
        try:
            with self.get_session() as session:
                users = session.query(User).all()
                return [{
                    'id': user.id,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'email': user.email,
                    'is_active': user.is_active,
                    'ai_enabled': user.ai_enabled,
                    'role': user.role.value if user.role else 'USER',
                    'created_at': user.created_at,
                    'updated_at': user.updated_at
                } for user in users]
        except Exception as e:
            print(f"Error retrieving all users: {e}")
            return []

    def update_user_ai_enabled(self, user_id: int, ai_enabled: bool) -> bool:
        """Update user's AI enabled status (ADMIN only)"""
        try:
            with self.get_session() as session:
                user = session.query(User).filter(User.id == user_id).first()
                if not user:
                    return False
                user.ai_enabled = ai_enabled
                session.flush()
                print(f"User {user_id} AI enabled set to {ai_enabled}")
                return True
        except Exception as e:
            print(f"Error updating AI enabled for user {user_id}: {e}")
            return False

    def update_user(self, user_id: int, first_name: Optional[str] = None,
                   last_name: Optional[str] = None, email: Optional[str] = None,
                   is_active: Optional[bool] = None, role: Optional[str] = None) -> bool:
        """
        Update user information (ADMIN only)
        Only updates provided fields (None values are ignored)
        """
        try:
            with self.get_session() as session:
                user = session.query(User).filter(User.id == user_id).first()
                if not user:
                    print(f"User {user_id} not found")
                    return False

                # Update only provided fields
                if first_name is not None:
                    user.first_name = first_name
                if last_name is not None:
                    user.last_name = last_name
                if email is not None:
                    # Check if email is already taken by another user
                    existing_user = session.query(User).filter(
                        User.email == email,
                        User.id != user_id
                    ).first()
                    if existing_user:
                        print(f"Email {email} is already taken by another user")
                        return False
                    user.email = email
                if is_active is not None:
                    user.is_active = is_active
                if role is not None:
                    from database.models.user import UserRole
                    user.role = UserRole[role]

                session.flush()
                print(f"User {user_id} updated successfully")
                return True
        except Exception as e:
            print(f"Error updating user {user_id}: {e}")
            return False

    def delete_user(self, user_id: int) -> bool:
        """
        Delete a user and all associated data (ADMIN only)
        Cascading deletes will handle sessions, conversations, and messages
        """
        try:
            with self.get_session() as session:
                user = session.query(User).filter(User.id == user_id).first()
                if not user:
                    print(f"User {user_id} not found")
                    return False

                # Delete the user (cascading will handle related data)
                session.delete(user)
                session.flush()
                print(f"User {user_id} deleted successfully")
                return True
        except Exception as e:
            print(f"Error deleting user {user_id}: {e}")
            return False

