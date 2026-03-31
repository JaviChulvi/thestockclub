"""
Database module for FundLord application
Combines all repository classes into a single unified interface
"""
import sys
import os

# Add backend directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import DatabaseConnection
from database.repositories.fund_repository import FundRepository
from database.repositories.user_repository import UserRepository
from database.repositories.chat_repository import ChatRepository
from database.repositories.benchmark_repository import BenchmarkRepository
from database.repositories.category_repository import CategoryRepository
from database.repositories.stock_repository import StockRepository
from database.repositories.data_task_repository import DataTaskRepository
from util import is_production


class FundDatabase(FundRepository, UserRepository, ChatRepository, BenchmarkRepository, CategoryRepository, StockRepository, DataTaskRepository):
    """
    Unified database interface combining all repositories.
    Inherits from all repository classes to provide a single point of access.
    """

    def __init__(self, host: str = 'localhost', user: str = None,
                 password: str = None, database: str = 'fundlord',
                 pool_size: int = 10, max_overflow: int = 20, db_type: str = 'postgresql'):
        """Initialize the FundDatabase with all repository capabilities"""
        # Initialize the base DatabaseConnection class
        DatabaseConnection.__init__(self, host, user, password, database, pool_size, max_overflow, db_type)

    # ==================== INITIALIZATION & MIGRATION ====================
    
    def initialize_database(self) -> bool:
        """Initialize database and create all required tables"""
        if not self.create_database_if_not_exists():
            return False

        if is_production():
            try:
                self.execute_non_query("SET search_path TO public")
                self.execute_non_query("CREATE SCHEMA IF NOT EXISTS public")
                self.execute_non_query("GRANT ALL PRIVILEGES ON SCHEMA public TO :username", {'username': self.user})
                print("PostgreSQL schema configured successfully")
            except Exception as e:
                print(f"Warning: Schema setup may have failed: {e}")
        # Create tables in order of dependencies:
        # 1. Independent tables (benchmarks, categories, users, holdings, managers)
        # 2. Tables with foreign keys (funds, sessions, fund_holdings)
        # 3. Tables with foreign keys to funds (fund_price_history)
        # 4. Chat tables (conversations, messages)
        return (self.create_benchmarks_table() and
                self.create_categories_table() and
                self.create_managers_table() and
                self.create_users_table() and
                self.create_holdings_table() and
                self.create_funds_table() and
                self.create_sessions_table() and
                self.create_fund_holdings_table() and
                self.create_price_history_table() and
                self.create_conversations_table() and
                self.create_messages_table())

    def run_migration(self) -> bool:
        """Run database migration to move data to new structure"""
        print("Starting database migration...")

        # Step 1: Create/update tables (will handle schema changes)
        if not (self.create_holdings_table() and
                self.create_fund_holdings_table() and
                self.create_benchmarks_table()):
            print("Failed to create/update tables")
            return False

        # Step 2: Migrate holdings data
        if not self.migrate_fund_holdings():
            print("Failed to migrate holdings data")
            return False

        # Step 3: Migrate benchmarks data
        if not self.migrate_benchmarks():
            print("Failed to migrate benchmarks data")
            return False

        print("Migration completed successfully!")
        return True


# Global database instance for convenience (PostgreSQL)
db = FundDatabase(db_type='postgresql')


# Export main classes and instance
__all__ = ['FundDatabase', 'db', 'DatabaseConnection']

