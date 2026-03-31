#!/usr/bin/env python3
"""
Database migration helper script for FundLord.
Makes it easy to create and apply migrations.

Usage:
    python migrate.py create "Add user role column"  # Create a new migration
    python migrate.py upgrade                         # Apply all pending migrations
    python migrate.py downgrade                       # Rollback last migration
    python migrate.py current                         # Show current revision
    python migrate.py history                         # Show migration history
"""

import sys
import os
import subprocess

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def run_alembic_command(command):
    """Run an alembic command in the backend directory"""
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    result = subprocess.run(
        command,
        cwd=backend_dir,
        shell=True,
        capture_output=True,
        text=True
    )
    
    print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    
    return result.returncode

def create_migration(message):
    """Create a new migration with autogenerate"""
    print(f"🔍 Detecting model changes...")
    print(f"📝 Creating migration: {message}")
    return run_alembic_command(f'alembic revision --autogenerate -m "{message}"')

def upgrade_database(revision="head"):
    """Apply migrations up to a specific revision (default: latest)"""
    print(f"⬆️  Upgrading database to {revision}...")
    return run_alembic_command(f"alembic upgrade {revision}")

def downgrade_database(revision="-1"):
    """Rollback migrations to a specific revision (default: previous)"""
    print(f"⬇️  Downgrading database to {revision}...")
    return run_alembic_command(f"alembic downgrade {revision}")

def show_current():
    """Show current database revision"""
    print("📍 Current database revision:")
    return run_alembic_command("alembic current")

def show_history():
    """Show migration history"""
    print("📚 Migration history:")
    return run_alembic_command("alembic history")

def show_pending():
    """Show pending migrations"""
    print("⏳ Pending migrations:")
    # Show the difference between current and head
    return run_alembic_command("alembic current && alembic heads")

def main():
    if len(sys.argv) < 2:
        print("❌ Error: Missing command")
        print("\nUsage:")
        print('  python migrate.py create "description"  - Create new migration')
        print('  python migrate.py upgrade               - Apply all pending migrations')
        print('  python migrate.py downgrade             - Rollback last migration')
        print('  python migrate.py current               - Show current revision')
        print('  python migrate.py history               - Show migration history')
        print('  python migrate.py pending               - Show pending migrations')
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    try:
        if command == "create":
            if len(sys.argv) < 3:
                print("❌ Error: Migration message required")
                print('Usage: python migrate.py create "Add user role column"')
                sys.exit(1)
            message = sys.argv[2]
            exit_code = create_migration(message)
            if exit_code == 0:
                print("✅ Migration created successfully!")
                print("\n💡 Next steps:")
                print("   1. Review the migration file in backend/alembic/versions/")
                print("   2. Run: python migrate.py upgrade")
        
        elif command == "upgrade":
            revision = sys.argv[2] if len(sys.argv) > 2 else "head"
            exit_code = upgrade_database(revision)
            if exit_code == 0:
                print("✅ Database upgraded successfully!")
        
        elif command == "downgrade":
            revision = sys.argv[2] if len(sys.argv) > 2 else "-1"
            exit_code = downgrade_database(revision)
            if exit_code == 0:
                print("✅ Database downgraded successfully!")
        
        elif command == "current":
            exit_code = show_current()
        
        elif command == "history":
            exit_code = show_history()
        
        elif command == "pending":
            exit_code = show_pending()
        
        else:
            print(f"❌ Error: Unknown command '{command}'")
            print("\nAvailable commands: create, upgrade, downgrade, current, history, pending")
            sys.exit(1)
        
        sys.exit(exit_code)
    
    except KeyboardInterrupt:
        print("\n\n⚠️  Migration interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()