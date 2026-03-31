from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.pool import QueuePool
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional, Dict, Any, List
from contextlib import contextmanager
import re
import sys
import os

# Add backend directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from util import is_production

class DatabaseConnection:
    """Database connection manager for FundLord application (PostgreSQL)"""

    def __init__(self, host: str = 'localhost', user: str = None,
                 password: str = None, database: str = 'fundlord',
                 pool_size: int = 10, max_overflow: int = 20, db_type: str = 'postgresql'):
        self.host = os.getenv('DB_HOST') or host
        self.user = os.getenv('DB_USER') or ('root' if is_production() else user)
        self.password = os.getenv('DB_PASSWORD') or password
        self.database = os.getenv('DB_NAME') or database
        self.db_type = db_type

        # Create SQLAlchemy engine with connection pooling for PostgreSQL
        if db_type == 'postgresql':
            connection_string = f"postgresql+psycopg2://{self.user}:{self.password}@{self.host}/{self.database}"
        else:  # mysql
            connection_string = f"mysql+pymysql://{self.user}:{self.password}@{self.host}/{self.database}"

        self.engine = create_engine(
            connection_string,
            poolclass=QueuePool,
            pool_size=pool_size,
            max_overflow=max_overflow,
            pool_timeout=30,
            pool_recycle=3600,  # Recycle connections after 1 hour
            echo=False  # Set to True for debugging
        )

        # Create session factory for ORM operations
        self.SessionFactory = sessionmaker(bind=self.engine, expire_on_commit=False)
        self.ScopedSession = scoped_session(self.SessionFactory)

        # Test the connection
        try:
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print(f"Database connection established successfully ({db_type})")
        except Exception as e:
            print(f"Error connecting to database: {e}")

    @contextmanager
    def get_session(self):
        """
        Context manager for database sessions.
        Automatically handles commit/rollback and session cleanup.

        Usage:
            with self.get_session() as session:
                user = session.query(User).filter_by(email='test@example.com').first()
        """
        session = self.SessionFactory()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            raise
        finally:
            session.close()

    def get_scoped_session(self):
        """
        Get a thread-local scoped session.
        Should be removed after use with remove_scoped_session()

        Usage:
            session = self.get_scoped_session()
            try:
                user = session.query(User).filter_by(email='test@example.com').first()
                session.commit()
            except:
                session.rollback()
            finally:
                self.remove_scoped_session()
        """
        return self.ScopedSession()

    def remove_scoped_session(self):
        """Remove the current scoped session"""
        self.ScopedSession.remove()

    def _validate_sql_identifier(self, identifier: str) -> bool:
        """Validate that an identifier is safe for use in SQL queries"""
        if not identifier or not isinstance(identifier, str):
            return False
        # Allow only alphanumeric characters, underscores, and hyphens
        # Must start with a letter or underscore
        pattern = r'^[a-zA-Z_][a-zA-Z0-9_-]*$'
        return bool(re.match(pattern, identifier))

    def _sanitize_pattern(self, pattern: str) -> str:
        """Sanitize search patterns to prevent SQL injection"""
        if not pattern or not isinstance(pattern, str):
            return ""
        # Remove potentially dangerous characters but allow wildcards
        # This is a basic sanitization - the parameterized query will handle the rest
        sanitized = re.sub(r'[;\'"\\]', '', pattern)
        return sanitized

    def _validate_limit(self, limit: int) -> bool:
        """Validate that a limit value is a positive integer"""
        return isinstance(limit, int) and limit > 0 and limit <= 1000

    def create_database_if_not_exists(self) -> bool:
        """Create the database if it doesn't exist"""
        try:
            if self.db_type == 'postgresql':
                # For PostgreSQL, we need to connect to 'postgres' database first
                temp_engine = create_engine(
                    f"postgresql+psycopg2://{self.user}:{self.password}@{self.host}/postgres",
                    poolclass=QueuePool,
                    pool_size=1,
                    isolation_level="AUTOCOMMIT"
                )
            else:
                # Connect without specifying database for MySQL
                temp_engine = create_engine(
                    f"mysql+pymysql://{self.user}:{self.password}@{self.host}",
                    poolclass=QueuePool,
                    pool_size=1
                )
            
            with temp_engine.connect() as conn:
                # Check if database exists
                if self.db_type == 'postgresql':
                    result = conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname = '{self.database}'"))
                    if not result.fetchone():
                        conn.execute(text(f"CREATE DATABASE {self.database}"))
                else:
                    conn.execute(text(f"CREATE DATABASE IF NOT EXISTS {self.database}"))
                    conn.commit()
            
            temp_engine.dispose()
            print(f"Database '{self.database}' created or already exists")
            return True
        except SQLAlchemyError as e:
            print(f"Error creating database: {e}")
            return False

    def disconnect(self):
        """Close all connections in the pool"""
        if self.engine:
            self.engine.dispose()
            print("Database connection pool closed")

    def execute_query(self, query: str, params = None) -> List[Dict[str, Any]]:
        """Execute a SELECT query and return results"""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text(query), params or {})
                # Convert result to list of dictionaries
                columns = result.keys()
                return [dict(zip(columns, row)) for row in result.fetchall()]
        except SQLAlchemyError as e:
            print(f"Error executing query: {e}")
            raise

    def execute_non_query(self, query: str, params = None) -> tuple:
        """Execute an INSERT, UPDATE, or DELETE query"""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text(query), params or {})
                conn.commit()
                
                # Get last row id for INSERT operations
                if hasattr(result, 'lastrowid') and result.lastrowid:
                    last_row_id = result.lastrowid
                else:
                    last_row_id = None
                    
                # Get row count for other operations
                if hasattr(result, 'rowcount'):
                    row_count = result.rowcount
                else:
                    row_count = 0
                    
                return row_count, last_row_id
        except SQLAlchemyError as e:
            print(f"Error executing query: {e}")
            raise

