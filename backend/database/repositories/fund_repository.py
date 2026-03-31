from typing import Optional, Dict, Any, List
import json
from datetime import datetime, timedelta
import traceback
import sys
import os
import numpy as np

# Add backend directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from database.connection import DatabaseConnection
from database.models import Fund, FundPriceHistory, Benchmark, Manager, Holding, FundHolding, Base
from sqlalchemy import func, or_, and_, exists, select
from sqlalchemy.dialects.postgresql import insert as pg_insert

class FundRepository(DatabaseConnection):
    """Fund-specific database operations"""

    # ==================== CREATE TABLES ====================

    def create_funds_table(self) -> bool:
        """Create the funds table using SQLAlchemy ORM"""
        try:
            Base.metadata.create_all(self.engine, tables=[Fund.__table__])
            print("Funds table created successfully")
            return True
        except Exception as e:
            print(f"Error creating funds table: {e}")
            return False

    def create_price_history_table(self) -> bool:
        """Create the fund_price_history table using SQLAlchemy ORM"""
        try:
            Base.metadata.create_all(self.engine, tables=[FundPriceHistory.__table__])
            print("Fund price history table created successfully")
            return True
        except Exception as e:
            print(f"Error creating price history table: {e}")
            return False

    # ==================== INSERT OPERATIONS ====================

    def insert_fund(self, isin: str, fund_data: Dict[str, Any]) -> bool:
        """Insert a fund record into the database using SQLAlchemy ORM"""
        try:
            # Handle benchmark_id - if benchmark name is provided, look it up or create it
            benchmark_id = None
            if fund_data.get('benchmark'):
                from database.repositories.benchmark_repository import BenchmarkRepository
                benchmark_repo = BenchmarkRepository()
                benchmark_id = benchmark_repo.get_or_create_benchmark(fund_data['benchmark'])

            # Prepare data for upsert
            values = {
                'isin': isin,
                'long_name': fund_data.get('long_name') or fund_data.get('longName'),
                'short_name': fund_data.get('short_name') or fund_data.get('shortName'),
                'type_disp': fund_data.get('type_disp') or fund_data.get('typeDisp'),
                'currency': fund_data.get('currency'),
                'region': fund_data.get('region'),
                'quote_source_name': fund_data.get('quote_source_name') or fund_data.get('quoteSourceName'),
                'previous_close': fund_data.get('previous_close') or fund_data.get('previousClose'),
                'fund_overview': fund_data.get('fund_overview', {}),
                'sector_weightings': fund_data.get('sector_weightings', {}),
                'asset_classes': fund_data.get('asset_classes', {}),
                'bond_holdings': fund_data.get('bond_holdings', {}),
                'equity_holdings': fund_data.get('equity_holdings', {}),
                'bond_ratings': fund_data.get('bond_ratings', {}),
                'url': fund_data.get('url'),
                'benchmark_id': benchmark_id
            }

            with self.get_session() as session:
                # Use PostgreSQL's INSERT ... ON CONFLICT DO UPDATE
                stmt = pg_insert(Fund).values(**values)
                stmt = stmt.on_conflict_do_update(
                    index_elements=['isin'],
                    set_={
                        'long_name': stmt.excluded.long_name,
                        'short_name': stmt.excluded.short_name,
                        'type_disp': stmt.excluded.type_disp,
                        'currency': stmt.excluded.currency,
                        'region': stmt.excluded.region,
                        'quote_source_name': stmt.excluded.quote_source_name,
                        'previous_close': stmt.excluded.previous_close,
                        'fund_overview': stmt.excluded.fund_overview,
                        'sector_weightings': stmt.excluded.sector_weightings,
                        'asset_classes': stmt.excluded.asset_classes,
                        'bond_holdings': stmt.excluded.bond_holdings,
                        'equity_holdings': stmt.excluded.equity_holdings,
                        'bond_ratings': stmt.excluded.bond_ratings,
                        'url': stmt.excluded.url,
                        'benchmark_id': stmt.excluded.benchmark_id,
                        'updated_at': func.now()
                    }
                )
                session.execute(stmt)

            print(f"Fund {isin} inserted/updated successfully")
            return True
        except Exception as e:
            print(f"Error inserting fund {isin}: {e}")
            return False

    def insert_price_history(self, isin: str, date: str, close_price: float,
                           open_price: float = None, high_price: float = None,
                           low_price: float = None, volume: int = None) -> bool:
        """Insert price history record for a fund using SQLAlchemy ORM"""
        try:
            values = {
                'isin': isin,
                'date': date,
                'close_price': float(close_price),
                'volume': volume
            }

            with self.get_session() as session:
                # Use PostgreSQL's INSERT ... ON CONFLICT DO UPDATE
                stmt = pg_insert(FundPriceHistory).values(**values)
                stmt = stmt.on_conflict_do_update(
                    index_elements=['isin', 'date'],
                    set_={
                        'close_price': stmt.excluded.close_price,
                        'volume': stmt.excluded.volume,
                        'updated_at': func.now()
                    }
                )
                session.execute(stmt)

            print(f"Price history for {isin} on {date} inserted/updated successfully")
            return True
        except Exception as e:
            print(f"Error inserting price history for {isin} on {date}: {e}")
            return False

    def insert_price_history_batch(self, price_history_list: List[Dict[str, Any]]) -> int:
        """Insert multiple price history records in batch"""
        success_count = 0
        for price_data in price_history_list:
            isin = price_data.get('isin')
            date = price_data.get('date')
            close_price = price_data.get('close_price') or price_data.get('close')

            if not all([isin, date, close_price]):
                print(f"Skipping invalid price data: missing required fields")
                continue

            open_price = price_data.get('open_price') or price_data.get('open')
            high_price = price_data.get('high_price') or price_data.get('high')
            low_price = price_data.get('low_price') or price_data.get('low')
            volume = price_data.get('volume')

            if self.insert_price_history(isin, date, close_price, open_price, high_price, low_price, volume):
                success_count += 1

        print(f"Successfully inserted {success_count} out of {len(price_history_list)} price history records")
        return success_count

    def insert_finect_data(self, isin: str, data: dict) -> bool:
        """
        Update only the fields present in the Finect db_fields mapping for the given ISIN using SQLAlchemy ORM.
        The input data dict has db field names as keys and the values to save.
        Only 'classes' is a complex (JSON) field.
        """
        finect_fields = [
            "category",
            "benchmark",
            "fund_assets",
            "class_assets",
            "start_date",
            "management_fee",
            "performance_fee",
            "custody_fee",
            "ongoing_charges",
            "redemption_fee",
            "subscription_fee",
            "classes",
        ]

        if not isin:
            print("No ISIN found in data, cannot update fund.")
            return False

        # Note: This will be provided by benchmark_repository through the main class
        from database.repositories.benchmark_repository import BenchmarkRepository
        benchmark_repo = BenchmarkRepository()
        manager_id = benchmark_repo.create_or_return_manager(data.get('manager'))
        if not manager_id:
            print("No manager found in data, cannot update fund.")
            return False

        # Only update fields that are present in the data and in finect_fields
        update_fields = {k: v for k, v in data.items() if k in finect_fields and v is not None}
        update_fields["manager_id"] = manager_id

        if not update_fields:
            print("No Finect fields to update for ISIN:", isin)
            return False

        try:
            with self.get_session() as session:
                fund = session.query(Fund).filter(Fund.isin == isin).first()
                if not fund:
                    print(f"Fund with ISIN {isin} not found")
                    return False

                # Update fund fields
                for field, value in update_fields.items():
                    if hasattr(fund, field):
                        setattr(fund, field, value)

            return True
        except Exception as e:
            print(f"Error updating Finect data for {isin}: {e}")
            return False

    # ==================== GET/RETRIEVE OPERATIONS ====================

    def get_all_funds(self, limit: int = None) -> List[Dict[str, Any]]:
        """Get all funds from the database using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                query = session.query(Fund).order_by(Fund.created_at.desc())

                if limit and self._validate_limit(limit):
                    query = query.limit(limit)

                funds = query.all()

                # Convert to dict format for backward compatibility
                return [self._fund_to_dict(f) for f in funds]
        except Exception as e:
            print(f"Error retrieving all funds: {e}")
            return []

    def _fund_to_dict(self, fund: Fund) -> Dict[str, Any]:
        """Convert Fund ORM object to dictionary with JSON-serializable types"""
        return {
            'id': fund.id,
            'isin': fund.isin,
            'long_name': fund.long_name,
            'short_name': fund.short_name,
            'type_disp': fund.type_disp,
            'currency': fund.currency,
            'region': fund.region,
            'quote_source_name': fund.quote_source_name,
            'previous_close': float(fund.previous_close) if fund.previous_close is not None else None,
            'fund_overview': fund.fund_overview,
            'sector_weightings': fund.sector_weightings,
            'asset_classes': fund.asset_classes,
            'bond_holdings': fund.bond_holdings,
            'equity_holdings': fund.equity_holdings,
            'bond_ratings': fund.bond_ratings,
            'url': fund.url,
            'category': fund.category,
            'benchmark_id': fund.benchmark_id,
            'fund_assets': fund.fund_assets,
            'class_assets': fund.class_assets,
            'start_date': fund.start_date,
            'management_fee': float(fund.management_fee) if fund.management_fee is not None else None,
            'performance_fee': float(fund.performance_fee) if fund.performance_fee is not None else None,
            'custody_fee': float(fund.custody_fee) if fund.custody_fee is not None else None,
            'ongoing_charges': float(fund.ongoing_charges) if fund.ongoing_charges is not None else None,
            'redemption_fee': float(fund.redemption_fee) if fund.redemption_fee is not None else None,
            'subscription_fee': float(fund.subscription_fee) if fund.subscription_fee is not None else None,
            'classes': fund.classes,
            'ytd_return': float(fund.ytd_return) if fund.ytd_return is not None else None,
            'last_90d_return': float(fund.last_90d_return) if fund.last_90d_return is not None else None,
            'manager_id': fund.manager_id,
            'category_id': fund.category_id,
            'created_at': fund.created_at.isoformat() if fund.created_at else None,
            'updated_at': fund.updated_at.isoformat() if fund.updated_at else None
        }

    def get_fund_by_isin(self, isin: str) -> Optional[Dict[str, Any]]:
        """Get fund details by ISIN with benchmark and holdings information using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                # Query fund with benchmark relationship
                fund = session.query(Fund).filter(Fund.isin == isin).first()

                if not fund:
                    return None

                # Convert to dict
                fund_data = self._fund_to_dict(fund)

                # Add benchmark name if exists (access relationship INSIDE session)
                if fund.benchmark:
                    fund_data['benchmark_name'] = fund.benchmark.name
                    fund_data['benchmark_id'] = fund.benchmark.id

            # Get holdings for this fund (outside session is fine, separate query)
            from database.repositories.benchmark_repository import BenchmarkRepository
            benchmark_repo = BenchmarkRepository()
            holdings = benchmark_repo.get_fund_holdings(isin)

            # Add holdings to fund data
            fund_data['holdings'] = holdings

            from database.repositories.category_repository import CategoryRepository
            category_repo = CategoryRepository()
            category = category_repo.get_category_by_id(fund.category_id)
            if category:
                fund_data['category_name'] = category['name']
                fund_data['category_fullname'] = category['fullname']
                fund_data['category_description'] = category['description']
                fund_data['category_active_type'] = category['active_type']
                fund_data['category_region'] = category['region']
                fund_data['category_currency'] = category['currency']
                fund_data['category_sub_category'] = category['sub_category']
                fund_data['category_hedged_currency'] = category['hedged_currency']

            return fund_data
        except Exception as e:
            print(f"Error retrieving fund {isin}: {e}")
            import traceback
            traceback.print_exc()
            return None

    def get_funds_by_isin_pattern(self, pattern: str) -> List[Dict[str, Any]]:
        """Search funds by ISIN pattern (case-insensitive) using SQLAlchemy ORM"""
        sanitized_pattern = self._sanitize_pattern(pattern)
        if not sanitized_pattern:
            return []

        try:
            with self.get_session() as session:
                funds = session.query(Fund).filter(
                    Fund.isin.ilike(f'%{sanitized_pattern}%')
                ).order_by(Fund.isin).limit(20).all()

                # Convert to dict and add manager name (access relationship INSIDE session)
                results = []
                for fund in funds:
                    fund_dict = self._fund_to_dict(fund)
                    if fund.manager:
                        fund_dict['manager_name'] = fund.manager.name
                    results.append(fund_dict)

            return results
        except Exception as e:
            print(f"Error searching funds by ISIN pattern: {e}")
            return []

    def get_funds_by_name_pattern(self, pattern: str) -> List[Dict[str, Any]]:
        """Search funds by name pattern (case-insensitive) using SQLAlchemy ORM"""
        sanitized_pattern = self._sanitize_pattern(pattern)
        if not sanitized_pattern:
            return []

        try:
            with self.get_session() as session:
                funds = session.query(Fund).filter(
                    or_(
                        Fund.long_name.ilike(f'%{sanitized_pattern}%'),
                        Fund.short_name.ilike(f'%{sanitized_pattern}%')
                    )
                ).order_by(Fund.long_name).limit(20).all()

                # Convert to dict and add manager name (access relationship INSIDE session)
                results = []
                for fund in funds:
                    fund_dict = self._fund_to_dict(fund)
                    if fund.manager:
                        fund_dict['manager_name'] = fund.manager.name
                    results.append(fund_dict)

            return results
        except Exception as e:
            print(f"Error searching funds by name pattern: {e}")
            return []

    def get_random_funds(self, count: int = 9) -> List[Dict[str, Any]]:
        """Get random funds from the database using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                funds = session.query(Fund).order_by(func.random()).limit(count).all()
                return [self._fund_to_dict(f) for f in funds]
        except Exception as e:
            print(f"Error retrieving random funds: {e}")
            return []

    def get_random_funds_with_history(self, count: int = 9, fund_type: str = None) -> List[Dict[str, Any]]:
        """Get random funds that have recent historical price data (last 90 days) using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                # Calculate date 90 days ago
                ninety_days_ago = datetime.now() - timedelta(days=90)

                # Create EXISTS subquery to check for recent price history
                subq = exists().where(
                    and_(
                        FundPriceHistory.isin == Fund.isin,
                        FundPriceHistory.date >= ninety_days_ago
                    )
                )

                query = session.query(Fund).filter(subq)

                if fund_type:
                    query = query.filter(Fund.type_disp.ilike(fund_type))

                query = query.order_by(func.random()).limit(count)
                funds = query.all()

                return [self._fund_to_dict(f) for f in funds]
        except Exception as e:
            print(f"Error retrieving random funds with history: {e}")
            return []

    def get_funds_with_history(self, limit: int = None) -> List[Dict[str, Any]]:
        """Get all funds that have historical price data using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                # Create EXISTS subquery
                subq = exists().where(FundPriceHistory.isin == Fund.isin)

                query = session.query(Fund).filter(subq).order_by(Fund.created_at.desc())

                if limit and self._validate_limit(limit):
                    query = query.limit(limit)

                funds = query.all()
                return [self._fund_to_dict(f) for f in funds]
        except Exception as e:
            print(f"Error retrieving funds with history: {e}")
            return []

    def get_funds_by_type(self, fund_type: str, limit: int = None) -> List[Dict[str, Any]]:
        """Get funds by type using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                query = session.query(Fund).filter(
                    Fund.type_disp.ilike(fund_type)
                ).order_by(Fund.created_at.desc())

                if limit and self._validate_limit(limit):
                    query = query.limit(limit)

                funds = query.all()
                return [self._fund_to_dict(f) for f in funds]
        except Exception as e:
            print(f"Error retrieving funds by type {fund_type}: {e}")
            return []

    def get_funds_by_currency(self, currency: str, limit: int = None) -> List[Dict[str, Any]]:
        """Get funds by currency using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                query = session.query(Fund).filter(
                    Fund.currency == currency
                ).order_by(Fund.created_at.desc())

                if limit and self._validate_limit(limit):
                    query = query.limit(limit)

                funds = query.all()
                return [self._fund_to_dict(f) for f in funds]
        except Exception as e:
            print(f"Error retrieving funds by currency {currency}: {e}")
            return []

    def get_funds_from_manager(self, manager: str, limit: int = None) -> List[Dict[str, Any]]:
        """Get all funds from a manager using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                query = session.query(Fund).filter(
                    Fund.manager_id == manager
                ).order_by(Fund.created_at.desc())

                if limit and self._validate_limit(limit):
                    query = query.limit(limit)

                funds = query.all()
                return [self._fund_to_dict(f) for f in funds]
        except Exception as e:
            print(f"Error retrieving funds from manager {manager}: {e}")
            return []

    def get_funds_by_benchmark_with_history(self, benchmark_id: int, count: int = None, offset: int = 0) -> List[Dict[str, Any]]:
        """Get funds for a specific benchmark that have recent historical price data (last 90 days) with pagination support using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                # Calculate date 90 days ago
                ninety_days_ago = datetime.now() - timedelta(days=90)

                # Create EXISTS subquery to check for recent price history
                subq = exists().where(
                    and_(
                        FundPriceHistory.isin == Fund.isin,
                        FundPriceHistory.date >= ninety_days_ago
                    )
                )

                query = session.query(Fund).filter(
                    and_(
                        Fund.benchmark_id == benchmark_id,
                        subq,
                        Fund.long_name.isnot(None)
                    )
                ).order_by(Fund.created_at.desc())

                if count:
                    query = query.limit(count)
                if offset:
                    query = query.offset(offset)

                funds = query.all()
                return [self._fund_to_dict(f) for f in funds]
        except Exception as e:
            print(f"Error retrieving funds for benchmark {benchmark_id}: {e}")
            return []

    def get_funds_count_by_benchmark(self, benchmark_id: int) -> int:
        """Get total count of funds for a specific benchmark that have recent historical price data (last 90 days) using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                # Calculate date 90 days ago
                ninety_days_ago = datetime.now() - timedelta(days=90)

                # Create EXISTS subquery to check for recent price history
                subq = exists().where(
                    and_(
                        FundPriceHistory.isin == Fund.isin,
                        FundPriceHistory.date >= ninety_days_ago
                    )
                )

                count = session.query(func.count(Fund.id)).filter(
                    and_(
                        Fund.benchmark_id == benchmark_id,
                        subq,
                        Fund.long_name.isnot(None)
                    )
                ).scalar()

                return count or 0
        except Exception as e:
            print(f"Error counting funds for benchmark {benchmark_id}: {e}")
            return 0

    def get_funds_by_category_with_history_for_chatbot(self, category_id: int, count: int = None) -> List[Dict[str, Any]]:
        """Get funds for a specific category that have historical price data with pagination support using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                # Create EXISTS subquery
                subq = exists().where(FundPriceHistory.isin == Fund.isin)

                query = session.query(Fund).filter(
                    and_(
                        Fund.category_id == category_id,
                        subq,
                        Fund.long_name.isnot(None),
                        Fund.currency == 'EUR'
                    )
                ).order_by(Fund.ytd_return.desc())

                if count:
                    query = query.limit(count+3)

                funds = query.all()
                final_funds_list = []
                seen_fund_groups = set()
                for fund in funds:
                    if not fund.classes or not isinstance(fund.classes, list):
                        continue

                    for class_ in fund.classes:
                        if not class_ or not isinstance(class_, dict):
                            continue

                        isin_list = sorted([item['isin'] for item in fund.classes if 'isin' in item])

                        if fund.isin not in seen_fund_groups:
                            final_funds_list.append(self._fund_to_dict(fund))
                            seen_fund_groups.add(fund.isin)
                            seen_fund_groups = seen_fund_groups.union(set(isin_list))

                return final_funds_list[:count]
        except Exception as e:
            print(f"Error retrieving funds for category {category_id}: {e}")
            return []

    def get_funds_by_category_with_history(self, category_id: int, count: int = None, offset: int = 0) -> List[Dict[str, Any]]:
        """Get funds for a specific category that have recent historical price data (last 90 days) with pagination support using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                # Calculate date 90 days ago
                ninety_days_ago = datetime.now() - timedelta(days=90)

                # Create EXISTS subquery to check for recent price history
                subq = exists().where(
                    and_(
                        FundPriceHistory.isin == Fund.isin,
                        FundPriceHistory.date >= ninety_days_ago
                    )
                )

                query = session.query(Fund).filter(
                    and_(
                        Fund.category_id == category_id,
                        subq,
                        Fund.long_name.isnot(None)
                    )
                ).order_by(Fund.ytd_return.desc())

                if count:
                    query = query.limit(count)
                if offset:
                    query = query.offset(offset)

                funds = query.all()
                return [self._fund_to_dict(f) for f in funds]
        except Exception as e:
            print(f"Error retrieving funds for category {category_id}: {e}")
            return []

    def get_funds_count_by_category(self, category_id: int) -> int:
        """Get total count of funds for a specific category that have recent historical price data (last 90 days) using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                # Calculate date 90 days ago
                ninety_days_ago = datetime.now() - timedelta(days=90)

                # Create EXISTS subquery to check for recent price history
                subq = exists().where(
                    and_(
                        FundPriceHistory.isin == Fund.isin,
                        FundPriceHistory.date >= ninety_days_ago
                    )
                )

                count = session.query(func.count(Fund.id)).filter(
                    and_(
                        Fund.category_id == category_id,
                        subq,
                        Fund.long_name.isnot(None)
                    )
                ).scalar()

                return count or 0
        except Exception as e:
            print(f"Error counting funds for category {category_id}: {e}")
            return 0

    def get_best_ytd_funds(self, limit: int = 3) -> List[Dict[str, Any]]:
        """Get the best YTD funds using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                funds = session.query(Fund).order_by(Fund.ytd_return.desc()).limit(limit).all()

                # Return only selected fields for backward compatibility
                return [{
                    'isin': f.isin,
                    'long_name': f.long_name,
                    'ytd_return': float(f.ytd_return) if f.ytd_return is not None else None
                } for f in funds]
        except Exception as e:
            print(f"Error retrieving best YTD funds: {e}")
            return []

    def get_best_last_90d_funds(self, limit: int = 3) -> List[Dict[str, Any]]:
        """Get the best last 90d funds using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                funds = session.query(Fund).order_by(Fund.last_90d_return.desc()).limit(limit).all()

                # Return only selected fields for backward compatibility
                return [{
                    'isin': f.isin,
                    'long_name': f.long_name,
                    'last_90d_return': float(f.last_90d_return) if f.last_90d_return is not None else None
                } for f in funds]
        except Exception as e:
            print(f"Error retrieving best last 90d funds: {e}")
            return []

    def get_funds_info_from_isin_list(self, isin_list: List[str]) -> List[Dict[str, Any]]:
        """Get the information from a list of funds using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                funds = session.query(Fund).filter(
                    Fund.isin.in_(isin_list)
                ).order_by(Fund.ytd_return.desc(), Fund.last_90d_return).all()

                # Convert to dict with selected fields including joined data (access relationships INSIDE session)
                results = []
                for f in funds:
                    result = {
                        'isin': f.isin,
                        'long_name': f.long_name,
                        'ytd_return': float(f.ytd_return) if f.ytd_return is not None else None,
                        'last_90d_return': float(f.last_90d_return) if f.last_90d_return is not None else None,
                        'currency': f.currency,
                        'type_disp': f.type_disp,
                        'region': f.region,
                        'fund_assets': f.fund_assets,
                        'category': f.category,
                        'benchmark_name': f.benchmark.name if f.benchmark else None,
                        'manager_name': f.manager.name if f.manager else None
                    }
                    results.append(result)

            return results
        except Exception as e:
            print(f"Error retrieving funds info from isin list: {e}")
            return []

    def get_funds_fees_from_isin_list(self, isin_list: List[str]) -> List[Dict[str, Any]]:
        """Get the fees from a list of funds using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                funds = session.query(Fund).filter(
                    Fund.isin.in_(isin_list)
                ).all()

                # Return only fee-related fields (convert Decimal to float)
                return [{
                    'isin': f.isin,
                    'long_name': f.long_name,
                    'management_fee': float(f.management_fee) if f.management_fee is not None else None,
                    'performance_fee': float(f.performance_fee) if f.performance_fee is not None else None,
                    'custody_fee': float(f.custody_fee) if f.custody_fee is not None else None,
                    'ongoing_charges': float(f.ongoing_charges) if f.ongoing_charges is not None else None,
                    'redemption_fee': float(f.redemption_fee) if f.redemption_fee is not None else None,
                    'subscription_fee': float(f.subscription_fee) if f.subscription_fee is not None else None
                } for f in funds]
        except Exception as e:
            print(f"Error retrieving funds fees from isin list: {e}")
            return []

    def get_funds_holding_stock(self, ticker: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Get the funds holding a specific stock by matching the ticker symbol
        using the holdings table and fund_holdings junction table using SQLAlchemy ORM.
        Results are ordered by holding_percent descending.
        """
        try:
            with self.get_session() as session:
                # Query with JOINs
                results = session.query(
                    Fund, FundHolding.holding_percent, Holding.name, Holding.symbol
                ).join(
                    FundHolding, Fund.isin == FundHolding.fund_isin
                ).join(
                    Holding, FundHolding.holding_id == Holding.id
                ).filter(
                    Holding.symbol == ticker.upper()
                ).order_by(
                    FundHolding.holding_percent.desc()
                ).limit(limit).all()

                # Convert to dict format (access all data INSIDE session)
                funds_list = []
                for fund, holding_percent, holding_name, holding_symbol in results:
                    fund_dict = self._fund_to_dict(fund)
                    fund_dict['holding_percent'] = float(holding_percent) if holding_percent is not None else None
                    fund_dict['holding_name'] = holding_name
                    fund_dict['holding_symbol'] = holding_symbol
                    funds_list.append(fund_dict)

            return funds_list
        except Exception as e:
            print(f"Error retrieving funds holding stock {ticker}: {e}")
            return []

    def get_returns(self, isin: str) -> float:
        """Get the YTD return and 90-day return for a fund using SQLAlchemy ORM with NumPy optimization"""
        try:
            with self.get_session() as session:
                # Get YTD return (from January 1st to now)
                start_of_year = datetime.now().strftime('%Y-01-01')
                ytd_results = session.query(FundPriceHistory).filter(
                    and_(
                        FundPriceHistory.isin == isin,
                        FundPriceHistory.date >= start_of_year
                    )
                ).order_by(FundPriceHistory.date.desc()).all()

                # Get 90-day return (from 90 days ago to now)
                ninety_days_ago = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')
                ninety_d_results = session.query(FundPriceHistory).filter(
                    and_(
                        FundPriceHistory.isin == isin,
                        FundPriceHistory.date >= ninety_days_ago
                    )
                ).order_by(FundPriceHistory.date.desc()).all()

                ytd_return = 0
                ninety_d_return = 0

                # Calculate YTD return using NumPy
                if len(ytd_results) >= 2:
                    # Convert prices to NumPy array for vectorized operations
                    ytd_prices = np.array([float(r.close_price) for r in ytd_results], dtype=np.float64)

                    # Check for valid prices (no zero, NaN, or Inf)
                    if ytd_prices[-1] > 0 and np.all(np.isfinite(ytd_prices)):
                        # Calculate return: (latest - start) / start * 100
                        ytd_return = float((ytd_prices[0] - ytd_prices[-1]) / ytd_prices[-1] * 100)

                        # Check for NaN/Inf before clipping
                        if np.isfinite(ytd_return):
                            # Cap unrealistic returns using NumPy
                            ytd_return = float(np.clip(ytd_return, -100, 350))
                            if ytd_return >= 350:
                                ytd_return = 0
                        else:
                            ytd_return = 0
                    else:
                        print(f"[DEBUG] Invalid YTD prices for {isin}: start={ytd_prices[-1]}, latest={ytd_prices[0]}")

                # Calculate 90-day return using NumPy
                if len(ninety_d_results) >= 2:
                    # Convert prices to NumPy array for vectorized operations
                    ninety_d_prices = np.array([float(r.close_price) for r in ninety_d_results], dtype=np.float64)

                    # Check for valid prices (no zero, NaN, or Inf)
                    if ninety_d_prices[-1] > 0 and np.all(np.isfinite(ninety_d_prices)):
                        # Calculate return: (latest - start) / start * 100
                        ninety_d_return = float((ninety_d_prices[0] - ninety_d_prices[-1]) / ninety_d_prices[-1] * 100)

                        # Check for NaN/Inf before clipping
                        if np.isfinite(ninety_d_return):
                            # Cap unrealistic returns using NumPy
                            ninety_d_return = float(np.clip(ninety_d_return, -100, 350))
                            if ninety_d_return >= 350:
                                ninety_d_return = 0
                        else:
                            ninety_d_return = 0
                    else:
                        print(f"[DEBUG] Invalid 90d prices for {isin}: start={ninety_d_prices[-1]}, latest={ninety_d_prices[0]}")

                return round(ytd_return, 2), round(ninety_d_return, 2)
        except Exception as e:
            print(f"Error retrieving returns for {isin}: {e}")
            traceback.print_exc()
            return 0, 0

    # --- Price History Retrieval ---

    def get_price_history(self, isin: str, start_date: str = None, end_date: str = None,
                         limit: int = None) -> List[Dict[str, Any]]:
        """Retrieve price history for a fund using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                query = session.query(FundPriceHistory).filter(
                    FundPriceHistory.isin == isin
                )

                if start_date:
                    query = query.filter(FundPriceHistory.date >= start_date)

                if end_date:
                    query = query.filter(FundPriceHistory.date <= end_date)

                query = query.order_by(FundPriceHistory.date.asc())

                if limit:
                    query = query.limit(limit)

                price_history = query.all()
                return [{
                    'close_price': float(ph.close_price) if ph.close_price is not None else None,
                    'date': ph.date.isoformat() if hasattr(ph.date, 'isoformat') else ph.date
                } for ph in price_history]
        except Exception as e:
            print(f"Error retrieving price history for {isin}: {e}")
            return []

    def get_latest_price(self, isin: str) -> Optional[Dict[str, Any]]:
        """Get the most recent price for a fund using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                price = session.query(FundPriceHistory).filter(
                    FundPriceHistory.isin == isin
                ).order_by(FundPriceHistory.date.desc()).first()

                if not price:
                    return None

                return {
                    'id': price.id,
                    'isin': price.isin,
                    'date': price.date.isoformat() if hasattr(price.date, 'isoformat') else price.date,
                    'close_price': float(price.close_price) if price.close_price is not None else None,
                    'volume': price.volume,
                    'created_at': price.created_at.isoformat() if price.created_at else None,
                    'updated_at': price.updated_at.isoformat() if price.updated_at else None
                }
        except Exception as e:
            print(f"Error retrieving latest price for {isin}: {e}")
            return None

    def get_price_history_count(self, isin: str) -> int:
        """Get the total number of price history records for a fund using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                count = session.query(func.count(FundPriceHistory.id)).filter(
                    FundPriceHistory.isin == isin
                ).scalar()

                return count or 0
        except Exception as e:
            print(f"Error counting price history for {isin}: {e}")
            return 0

    def get_batch_price_history(self, isins: List[str], start_date=None, end_date=None) -> Dict[str, List[Dict[str, Any]]]:
        """Retrieve price history for multiple funds in a single query.

        Returns:
            Dict mapping ISIN to list of price history records, sorted by date ascending.
        """
        if not isins:
            return {}
        try:
            with self.get_session() as session:
                query = session.query(FundPriceHistory).filter(
                    FundPriceHistory.isin.in_(isins)
                )
                if start_date:
                    query = query.filter(FundPriceHistory.date >= start_date)
                if end_date:
                    query = query.filter(FundPriceHistory.date <= end_date)

                query = query.order_by(FundPriceHistory.isin, FundPriceHistory.date.asc())

                result = {}
                for isin in isins:
                    result[isin] = []

                for ph in query.all():
                    result[ph.isin].append({
                        'close_price': float(ph.close_price) if ph.close_price is not None else None,
                        'date': ph.date.isoformat() if hasattr(ph.date, 'isoformat') else ph.date
                    })

                return result
        except Exception as e:
            print(f"Error retrieving batch price history: {e}")
            return {isin: [] for isin in isins}

    def get_batch_latest_prices(self, isins: List[str]) -> Dict[str, Optional[Dict[str, Any]]]:
        """Get the most recent price for multiple funds in a single query.

        Returns:
            Dict mapping ISIN to latest price record (or None if no price exists).
        """
        if not isins:
            return {}
        try:
            with self.get_session() as session:
                # Subquery to get the max date per ISIN
                latest_dates = session.query(
                    FundPriceHistory.isin,
                    func.max(FundPriceHistory.date).label('max_date')
                ).filter(
                    FundPriceHistory.isin.in_(isins)
                ).group_by(FundPriceHistory.isin).subquery()

                # Join back to get the full row for each latest date
                prices = session.query(FundPriceHistory).join(
                    latest_dates,
                    and_(
                        FundPriceHistory.isin == latest_dates.c.isin,
                        FundPriceHistory.date == latest_dates.c.max_date
                    )
                ).all()

                result = {isin: None for isin in isins}
                for price in prices:
                    result[price.isin] = {
                        'id': price.id,
                        'isin': price.isin,
                        'date': price.date.isoformat() if hasattr(price.date, 'isoformat') else price.date,
                        'close_price': float(price.close_price) if price.close_price is not None else None,
                        'volume': price.volume,
                        'created_at': price.created_at.isoformat() if price.created_at else None,
                        'updated_at': price.updated_at.isoformat() if price.updated_at else None
                    }

                return result
        except Exception as e:
            print(f"Error retrieving batch latest prices: {e}")
            return {isin: None for isin in isins}

    # ==================== UPDATE OPERATIONS ====================

    def update_fund_returns(self, isin: str, ytd_return: float, last_90d_return: float) -> bool:
        """Update only the returns for a fund using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                session.query(Fund).filter(Fund.isin == isin).update({
                    Fund.ytd_return: ytd_return,
                    Fund.last_90d_return: last_90d_return
                })
            return True
        except Exception as e:
            print(f"Error updating fund returns {isin}: {e}")
            return False

    def update_fund_data(
        self,
        isin: str,
        fund_overview={},
        top_holdings={},
        sector_weightings={},
        asset_classes={},
        bond_holdings={},
        equity_holdings={},
        bond_ratings={}
    ) -> bool:
        """Update the fund with detailed data fields using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                fund = session.query(Fund).filter(Fund.isin == isin).first()
                if not fund:
                    print(f"Fund with ISIN {isin} not found")
                    return False

                # Update JSONB fields (no need for json.dumps, SQLAlchemy handles it)
                if fund_overview is not None:
                    fund.fund_overview = fund_overview
                if sector_weightings is not None:
                    fund.sector_weightings = sector_weightings
                if asset_classes is not None:
                    fund.asset_classes = asset_classes
                if bond_holdings is not None:
                    fund.bond_holdings = bond_holdings
                if equity_holdings is not None:
                    fund.equity_holdings = equity_holdings
                if bond_ratings is not None:
                    fund.bond_ratings = bond_ratings

            return True
        except Exception as e:
            print(f"Error updating fund {isin}: {e}")
            return False

    def update_fund_data_from_funds_data(self, isin: str, funds_data: dict) -> bool:
        """Update the fund with detailed data fields from funds data"""
        return self.update_fund_data(
            isin,
            fund_overview=funds_data.get('fund_overview'),
            top_holdings=funds_data.get('top_holdings'),
            sector_weightings=funds_data.get('sector_weightings'),
            asset_classes=funds_data.get('asset_classes'),
            bond_holdings=funds_data.get('bond_holdings'),
            equity_holdings=funds_data.get('equity_holdings'),
            bond_ratings=funds_data.get('bond_ratings')
        )

    # ==================== SITEMAP OPERATIONS ====================

    def get_all_fund_isins(self) -> List[str]:
        """Get all fund ISINs for sitemap generation using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                isins = session.query(Fund.isin).order_by(Fund.isin).all()
                return [row[0] for row in isins]
        except Exception as e:
            print(f"Error getting all fund ISINs: {e}")
            return []

    def get_all_manager_ids(self) -> List[int]:
        """Get all unique manager IDs that have funds using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                manager_ids = session.query(Fund.manager_id).filter(
                    Fund.manager_id.isnot(None)
                ).distinct().order_by(Fund.manager_id).all()
                return [row[0] for row in manager_ids]
        except Exception as e:
            print(f"Error getting all manager IDs: {e}")
            return []

    # ==================== ADMIN OPERATIONS ====================

    def get_all_funds_paginated(self, limit: int = 20, offset: int = 0, category_id: int = None) -> Dict[str, Any]:
        """
        Get paginated funds for admin panel with optional category filter
        Returns funds with pagination info
        """
        try:
            with self.get_session() as session:
                # Base query
                query = session.query(Fund).order_by(Fund.updated_at.desc())

                # Apply category filter if provided
                if category_id is not None:
                    query = query.filter(Fund.category_id == category_id)

                # Get total count before pagination
                total = query.count()

                # Apply pagination
                funds = query.limit(limit).offset(offset).all()

                # Check if there are more results
                has_more = (offset + limit) < total

                return {
                    'funds': [self._fund_to_dict(f) for f in funds],
                    'pagination': {
                        'total': total,
                        'limit': limit,
                        'offset': offset,
                        'has_more': has_more
                    }
                }
        except Exception as e:
            print(f"Error getting paginated funds: {e}")
            return {'funds': [], 'pagination': {'total': 0, 'limit': limit, 'offset': offset, 'has_more': False}}

    def delete_fund(self, isin: str) -> bool:
        """
        Delete a fund by ISIN (ADMIN only)
        Will cascade delete price history and other related data
        """
        try:
            with self.get_session() as session:
                fund = session.query(Fund).filter(Fund.isin == isin).first()
                if not fund:
                    print(f"Fund {isin} not found")
                    return False

                # Delete the fund (cascading will handle related data)
                session.delete(fund)
                session.flush()
                print(f"Fund {isin} deleted successfully")
                return True
        except Exception as e:
            print(f"Error deleting fund {isin}: {e}")
            return False

    def update_fund_admin(self, isin: str, long_name: str = None, short_name: str = None,
                         type_disp: str = None, currency: str = None, region: str = None,
                         category_id: int = None) -> bool:
        """
        Update basic fund information (ADMIN only)
        Only updates provided fields (None values are ignored)
        """
        try:
            with self.get_session() as session:
                fund = session.query(Fund).filter(Fund.isin == isin).first()
                if not fund:
                    print(f"Fund {isin} not found")
                    return False

                # Update only provided fields
                if long_name is not None:
                    fund.long_name = long_name
                if short_name is not None:
                    fund.short_name = short_name
                if type_disp is not None:
                    fund.type_disp = type_disp
                if currency is not None:
                    fund.currency = currency
                if region is not None:
                    fund.region = region
                if category_id is not None:
                    fund.category_id = category_id

                session.flush()
                print(f"Fund {isin} updated successfully")
                return True
        except Exception as e:
            print(f"Error updating fund {isin}: {e}")
            return False

    def get_funds_stats(self) -> Dict[str, Any]:
        """Get statistics about funds for admin dashboard"""
        try:
            with self.get_session() as session:
                total_funds = session.query(func.count(Fund.isin)).scalar() or 0

                # Get last updated fund
                last_updated = session.query(func.max(Fund.updated_at)).scalar()

                return {
                    'total_funds': total_funds,
                    'last_updated': last_updated.isoformat() if last_updated else None
                }
        except Exception as e:
            print(f"Error getting funds stats: {e}")
            return {'total_funds': 0, 'last_updated': None}

    # ==================== MIGRATION OPERATIONS ====================

    def add_category_id_to_funds_table(self) -> bool:
        """Add category_id foreign key to funds table"""
        from sqlalchemy import text
        alter_query = """
        ALTER TABLE funds
        ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_category_id ON funds(category_id);
        """

        try:
            with self.engine.connect() as conn:
                conn.execute(text(alter_query))
                conn.commit()
            print("Added category_id column to funds table successfully")
            return True
        except Exception as e:
            print(f"Error adding category_id to funds table: {e}")
            return False

