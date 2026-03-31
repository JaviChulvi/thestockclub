from typing import Optional, Dict, Any, List
import json
import sys
import os

# Add backend directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from database.connection import DatabaseConnection
from database.models import Category, Base, Fund
from sqlalchemy import text, func

class CategoryRepository(DatabaseConnection):
    """Category-specific database operations using SQLAlchemy ORM"""

    # ==================== CREATE TABLES ====================

    def create_categories_table(self) -> bool:
        """Create the categories table with pgvector support using SQLAlchemy ORM"""
        try:
            # Enable pgvector extension
            with self.engine.connect() as conn:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                conn.commit()

            # Create table using ORM
            Base.metadata.create_all(self.engine, tables=[Category.__table__])

            # Create view
            with self.engine.connect() as conn:
                conn.execute(text("""
                    CREATE OR REPLACE VIEW categories_view AS
                    SELECT id, name, description, active_type, region, currency, sub_category, hedged_currency, embedding
                    FROM categories
                """))
                conn.commit()

            print("Categories table created successfully")
            return True
        except Exception as e:
            print(f"Error creating categories table: {e}")
            return False


    # ==================== INSERT OPERATIONS ====================

    def insert_category(self, name: str, fullname: str = None, description: str = None,
                       active_type: str = None, region: str = None, currency: str = None,
                       sub_category: str = None, hedged_currency: str = None,
                       embedding: List[float] = None) -> Optional[int]:
        """Insert or update a category"""
        try:
            with self.get_session() as session:
                category = Category(
                    name=name,
                    fullname=fullname,
                    description=description,
                    active_type=active_type,
                    region=region,
                    currency=currency,
                    sub_category=sub_category,
                    hedged_currency=hedged_currency,
                    embedding=embedding
                )
                session.merge(category)  # Merge handles INSERT or UPDATE
                session.flush()
                return category.id
        except Exception as e:
            print(f"Error inserting category {name}: {e}")
            return None

    def get_or_create_category(self, name: str, fullname: str = None) -> Optional[int]:
        """Get category ID by name, or create if it doesn't exist"""
        try:
            with self.get_session() as session:
                category = session.query(Category).filter(Category.name == name).first()

                if category:
                    return category.id

                # Create new category
                new_category = Category(name=name, fullname=fullname)
                session.add(new_category)
                session.flush()
                return new_category.id
        except Exception as e:
            print(f"Error getting/creating category {name}: {e}")
            return None

    # ==================== GET/RETRIEVE OPERATIONS ====================

    def get_all_categories(self) -> List[Dict[str, Any]]:
        """Get all categories"""
        try:
            with self.get_session() as session:
                categories = session.query(Category).order_by(Category.name).all()
                return [{
                    'id': c.id,
                    'name': c.name,
                    'fullname': c.fullname,
                    'description': c.description
                } for c in categories]
        except Exception as e:
            print(f"Error retrieving categories: {e}")
            return []

    def get_category_by_id(self, category_id: int) -> Optional[Dict[str, Any]]:
        """Get category by ID"""
        try:
            with self.get_session() as session:
                category = session.query(Category).filter(Category.id == category_id).first()
                if not category:
                    return None
                return {
                    'id': category.id,
                    'name': category.name,
                    'fullname': category.fullname,
                    'description': category.description,
                    'active_type': category.active_type,
                    'region': category.region,
                    'currency': category.currency,
                    'sub_category': category.sub_category,
                    'hedged_currency': category.hedged_currency
                }
        except Exception as e:
            print(f"Error retrieving category {category_id}: {e}")
            return None

    def get_category_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Get category by name"""
        try:
            with self.get_session() as session:
                category = session.query(Category).filter(Category.name == name).first()
                if not category:
                    return None
                return {
                    'id': category.id,
                    'name': category.name,
                    'fullname': category.fullname,
                    'description': category.description
                }
        except Exception as e:
            print(f"Error retrieving category {name}: {e}")
            return None

    def search_categories_by_embedding(self, embedding: List[float], limit: int = 5) -> List[Dict[str, Any]]:
        """Search categories by semantic similarity using pgvector"""
        try:
            with self.get_session() as session:
                # Use raw SQL for pgvector operations
                query = text("""
                    SELECT id, name, fullname, description,
                           1 - (embedding <=> CAST(:embedding AS vector)) as similarity
                    FROM categories
                    WHERE embedding IS NOT NULL
                    ORDER BY embedding <=> CAST(:embedding AS vector)
                    LIMIT :limit
                """)
                result = session.execute(query, {'embedding': str(embedding), 'limit': limit})
                return [dict(row) for row in result]
        except Exception as e:
            print(f"Error searching categories by embedding: {e}")
            return []

    def update_category_embedding(self, category_id: int, embedding: List[float]) -> bool:
        """Update category embedding for semantic search"""
        try:
            with self.get_session() as session:
                category = session.query(Category).filter(Category.id == category_id).first()
                if category:
                    category.embedding = embedding
                return True
        except Exception as e:
            print(f"Error updating embedding for category {category_id}: {e}")
            return False

    def update_category(self, category_id: int, **kwargs) -> bool:
        """Update category fields"""
        try:
            with self.get_session() as session:
                category = session.query(Category).filter(Category.id == category_id).first()
                if not category:
                    return False

                for key, value in kwargs.items():
                    if hasattr(category, key) and value is not None:
                        setattr(category, key, value)

                return True
        except Exception as e:
            print(f"Error updating category {category_id}: {e}")
            return False

    def get_categories_with_fund_counts(self) -> List[Dict[str, Any]]:
        """Get all categories with their associated fund counts"""
        try:
            with self.get_session() as session:
                query = session.query(
                    Category.id,
                    Category.name,
                    Category.fullname,
                    func.count(Fund.id).label('fund_count')
                ).outerjoin(Fund).group_by(
                    Category.id, Category.name, Category.fullname
                ).order_by(func.count(Fund.id).desc(), Category.name.asc())

                results = query.all()
                return [{
                    'id': row.id,
                    'name': row.name,
                    'fullname': row.fullname,
                    'fund_count': row.fund_count
                } for row in results]
        except Exception as e:
            print(f"Error retrieving categories with fund counts: {e}")
            return []

    def search_categories_by_metadata(self, embedding: List[float] = None,
                                     active_type: str = None, region: str = None,
                                     currency: str = None, sub_category: str = None,
                                     hedged_currency: str = None, limit: int = 5) -> List[Dict[str, Any]]:
        """Search categories by semantic similarity and/or metadata filters"""
        try:
            with self.get_session() as session:
                if embedding:
                    # Use raw SQL for vector search with filters
                    query_parts = ["embedding IS NOT NULL"]
                    params = {'embedding': str(embedding), 'limit': limit}

                    if active_type:
                        query_parts.append("active_type = :active_type")
                        params['active_type'] = active_type
                    if region:
                        query_parts.append("region = :region")
                        params['region'] = region
                    if currency:
                        query_parts.append("currency = :currency")
                        params['currency'] = currency
                    if sub_category:
                        query_parts.append("sub_category = :sub_category")
                        params['sub_category'] = sub_category
                    if hedged_currency:
                        query_parts.append("hedged_currency = :hedged_currency")
                        params['hedged_currency'] = hedged_currency

                    where_clause = " AND ".join(query_parts)
                    query = text(f"""
                        SELECT id, name, fullname, description, active_type, region,
                               currency, sub_category, hedged_currency,
                               1 - (embedding <=> CAST(:embedding AS vector)) as similarity
                        FROM categories
                        WHERE {where_clause}
                        ORDER BY embedding <=> CAST(:embedding AS vector)
                        LIMIT :limit
                    """)
                    result = session.execute(query, params)
                    return [dict(row) for row in result]
                else:
                    # Metadata-only search using ORM
                    query = session.query(Category)
                    if active_type:
                        query = query.filter(Category.active_type == active_type)
                    if region:
                        query = query.filter(Category.region == region)
                    if currency:
                        query = query.filter(Category.currency == currency)
                    if sub_category:
                        query = query.filter(Category.sub_category == sub_category)
                    if hedged_currency:
                        query = query.filter(Category.hedged_currency == hedged_currency)

                    results = query.order_by(Category.name).limit(limit).all()
                    return [{
                        'id': c.id,
                        'name': c.name,
                        'fullname': c.fullname,
                        'description': c.description,
                        'active_type': c.active_type,
                        'region': c.region,
                        'currency': c.currency,
                        'sub_category': c.sub_category,
                        'hedged_currency': c.hedged_currency
                    } for c in results]
        except Exception as e:
            print(f"Error searching categories by metadata: {e}")
            return []

    # ==================== MIGRATION OPERATIONS ====================

    def migrate_categories_from_funds(self) -> bool:
        """Extract unique categories from funds table and populate categories table"""
        try:
            # Use raw SQL for this migration operation
            query = text("""
                SELECT DISTINCT category
                FROM funds
                WHERE category IS NOT NULL AND category != ''
                ORDER BY category
            """)

            with self.get_session() as session:
                result = session.execute(query)
                categories = [row[0] for row in result]

            migrated_count = 0
            for category_name in categories:
                category_id = self.get_or_create_category(category_name, category_name)
                if category_id:
                    migrated_count += 1
                    print(f"Migrated category: {category_name}")

            print(f"Category migration completed. Migrated {migrated_count} categories.")
            return True
        except Exception as e:
            print(f"Error during category migration: {e}")
            return False

    def update_funds_with_category_ids(self) -> bool:
        """Update funds table to use category_id references"""
        try:
            # Get all funds with categories (raw SQL for simplicity)
            query = text("""
                SELECT isin, category
                FROM funds
                WHERE category IS NOT NULL AND category != ''
            """)

            with self.get_session() as session:
                result = session.execute(query)
                funds_data = [(row[0], row[1]) for row in result]

            updated_count = 0
            for isin, category_name in funds_data:
                category_id = self.get_or_create_category(category_name)

                if category_id:
                    with self.get_session() as session:
                        session.query(Fund).filter(Fund.isin == isin).update(
                            {Fund.category_id: category_id},
                            synchronize_session='fetch'
                        )
                    updated_count += 1

            print(f"Updated {updated_count} funds with category IDs.")
            return True
        except Exception as e:
            print(f"Error updating funds with category IDs: {e}")
            return False
