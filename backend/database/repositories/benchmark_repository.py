from typing import Optional, Dict, Any, List
import json
from urllib.parse import quote
import sys
import os

# Add backend directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from database.connection import DatabaseConnection
from database.models import Benchmark, Manager, Holding, FundHolding, Base, Fund
from sqlalchemy import func

class BenchmarkRepository(DatabaseConnection):
    """Benchmark, holdings, and manager database operations using SQLAlchemy ORM"""

    # ==================== CREATE TABLES ====================

    def create_benchmarks_table(self) -> bool:
        """Create the benchmarks table using SQLAlchemy ORM"""
        try:
            Base.metadata.create_all(self.engine, tables=[Benchmark.__table__])
            print("Benchmarks table created successfully")
            return True
        except Exception as e:
            print(f"Error creating benchmarks table: {e}")
            return False

    def create_holdings_table(self) -> bool:
        """Create the holdings table using SQLAlchemy ORM"""
        try:
            Base.metadata.create_all(self.engine, tables=[Holding.__table__])
            print("Holdings table created successfully")
            return True
        except Exception as e:
            print(f"Error creating holdings table: {e}")
            return False

    def create_fund_holdings_table(self) -> bool:
        """Create the fund_holdings table using SQLAlchemy ORM"""
        try:
            Base.metadata.create_all(self.engine, tables=[FundHolding.__table__])
            print("Fund holdings table created successfully")
            return True
        except Exception as e:
            print(f"Error creating fund holdings table: {e}")
            return False

    def create_managers_table(self) -> bool:
        """Create the managers table using SQLAlchemy ORM"""
        try:
            Base.metadata.create_all(self.engine, tables=[Manager.__table__])
            print("Managers table created successfully")
            return True
        except Exception as e:
            print(f"Error creating managers table: {e}")
            return False

    # ==================== MIGRATION OPERATIONS ====================

    def migrate_fund_holdings(self) -> bool:
        """Migrate existing top_holdings JSON data to the new holdings tables"""
        try:
            # Get all funds with top_holdings data
            query = "SELECT isin, top_holdings FROM funds WHERE top_holdings IS NOT NULL AND top_holdings != 'null'"
            funds = self.execute_query(query)

            for fund in funds:
                isin = fund['isin']
                try:
                    holdings_data = json.loads(fund['top_holdings'])
                    if isinstance(holdings_data, list) and holdings_data:
                        self.insert_fund_holdings(isin, holdings_data)
                        print(f"Migrated holdings for fund {isin}")
                except json.JSONDecodeError:
                    print(f"Invalid JSON for fund {isin} top_holdings")
                except Exception as e:
                    print(f"Error migrating holdings for fund {isin}: {e}")

            return True
        except Exception as e:
            print(f"Error during holdings migration: {e}")
            return False

    def migrate_benchmarks(self) -> bool:
        """Migrate existing benchmark VARCHAR data to the new benchmarks table"""
        try:
            # Get all funds with benchmark data
            query = "SELECT isin, benchmark FROM funds WHERE benchmark IS NOT NULL AND benchmark != '' AND benchmark != 'null'"
            funds = self.execute_query(query)

            migrated_count = 0
            for fund in funds:
                isin = fund['isin']
                benchmark_name = fund['benchmark']

                # Skip if benchmark_id already exists (already migrated)
                check_query = "SELECT benchmark_id FROM funds WHERE isin = :isin AND benchmark_id IS NOT NULL"
                existing = self.execute_query(check_query, {'isin': isin})

                if existing and existing[0]['benchmark_id']:
                    continue  # Already migrated

                try:
                    # Use get_or_create_benchmark to handle the benchmark
                    benchmark_id = self.get_or_create_benchmark(benchmark_name)

                    if benchmark_id:
                        # Update the fund to reference the benchmark_id
                        update_query = "UPDATE funds SET benchmark_id = :benchmark_id WHERE isin = :isin"
                        self.execute_non_query(update_query, {'benchmark_id': benchmark_id, 'isin': isin})
                        migrated_count += 1
                        print(f"Migrated benchmark for fund {isin}: {benchmark_name}")

                except Exception as e:
                    print(f"Error migrating benchmark for fund {isin}: {e}")

            print(f"Benchmark migration completed. Migrated {migrated_count} benchmarks.")
            return True

        except Exception as e:
            print(f"Error during benchmark migration: {e}")
            return False

    # ==================== BENCHMARK OPERATIONS ====================

    def get_benchmarks(self) -> List[Dict[str, Any]]:
        """Get all benchmarks"""
        try:
            with self.get_session() as session:
                benchmarks = session.query(Benchmark).all()
                return [{
                    'id': b.id,
                    'name': b.name,
                    'url': b.url,
                    'created_at': b.created_at,
                    'updated_at': b.updated_at
                } for b in benchmarks]
        except Exception as e:
            print(f"Error retrieving benchmarks: {e}")
            return []

    def get_benchmarks_with_fund_counts(self, limit: int = None, offset: int = 0) -> List[Dict[str, Any]]:
        """Get all benchmarks with their associated fund counts with pagination support"""
        try:
            with self.get_session() as session:
                query = session.query(
                    Benchmark.id,
                    Benchmark.name,
                    func.count(Fund.id).label('fund_count')
                ).outerjoin(Fund, Benchmark.id == Fund.benchmark_id).filter(
                    Benchmark.id.notin_([1, 2, 8, 9])
                ).group_by(
                    Benchmark.id, Benchmark.name
                ).order_by(
                    func.count(Fund.id).desc(),
                    Benchmark.name.asc()
                )

                if limit:
                    query = query.limit(limit)
                if offset:
                    query = query.offset(offset)

                results = query.all()
                return [{
                    'id': row.id,
                    'name': row.name,
                    'fund_count': row.fund_count
                } for row in results]
        except Exception as e:
            print(f"Error retrieving benchmarks with fund counts: {e}")
            return []

    def get_benchmarks_count(self) -> int:
        """Get total count of benchmarks (excluding specific IDs)"""
        try:
            with self.get_session() as session:
                count = session.query(func.count(Benchmark.id)).filter(
                    Benchmark.id.notin_([1, 2, 8, 9])
                ).scalar()

                return count or 0
        except Exception as e:
            print(f"Error counting benchmarks: {e}")
            return 0

    def get_benchmark_by_id(self, benchmark_id: int) -> Optional[Dict[str, Any]]:
        """Get benchmark by ID"""
        try:
            with self.get_session() as session:
                benchmark = session.query(Benchmark).filter(
                    Benchmark.id == benchmark_id
                ).first()

                if not benchmark:
                    return None

                return {
                    'id': benchmark.id,
                    'name': benchmark.name
                }
        except Exception as e:
            print(f"Error retrieving benchmark {benchmark_id}: {e}")
            return None

    def get_or_create_benchmark(self, benchmark_name: str, benchmark_url: str = None) -> Optional[int]:
        """Get benchmark ID by name, or create if it doesn't exist"""
        try:
            with self.get_session() as session:
                # Try to get existing benchmark
                benchmark = session.query(Benchmark).filter(
                    Benchmark.name == benchmark_name
                ).first()

                if benchmark:
                    return benchmark.id

                # Create new benchmark
                new_benchmark = Benchmark(name=benchmark_name, url=benchmark_url)
                session.add(new_benchmark)
                session.flush()
                return new_benchmark.id
        except Exception as e:
            print(f"Error creating benchmark {benchmark_name}: {e}")
            # Try to get it again in case of race condition (concurrent insert)
            try:
                with self.get_session() as session:
                    benchmark = session.query(Benchmark).filter(
                        Benchmark.name == benchmark_name
                    ).first()
                    return benchmark.id if benchmark else None
            except:
                return None

    # ==================== HOLDINGS OPERATIONS ====================

    def get_fund_holdings(self, isin: str) -> List[Dict[str, Any]]:
        """Get all holdings for a fund"""
        try:
            with self.get_session() as session:
                results = session.query(
                    Holding.name,
                    Holding.symbol,
                    FundHolding.holding_percent
                ).join(
                    FundHolding, Holding.id == FundHolding.holding_id
                ).filter(
                    FundHolding.fund_isin == isin
                ).order_by(
                    FundHolding.holding_percent.desc()
                ).all()

                return [{
                    'name': row.name,
                    'symbol': row.symbol,
                    'holding_percent': row.holding_percent
                } for row in results]
        except Exception as e:
            print(f"Error retrieving holdings for fund {isin}: {e}")
            return []

    def get_or_create_holding(self, name: str, symbol: str) -> Optional[int]:
        """Get holding ID by name and symbol, or create if it doesn't exist"""
        try:
            with self.get_session() as session:
                # Try to get existing holding
                holding = session.query(Holding).filter(
                    Holding.symbol == symbol
                ).first()

                if holding:
                    return holding.id

                # Create new holding
                new_holding = Holding(name=name, symbol=symbol)
                session.add(new_holding)
                session.flush()
                return new_holding.id
        except Exception as e:
            print(f"Error creating holding {name} ({symbol}): {e}")
            # Try to get it again in case of race condition
            try:
                with self.get_session() as session:
                    holding = session.query(Holding).filter(
                        Holding.symbol == symbol
                    ).first()
                    return holding.id if holding else None
            except:
                return None

    def insert_fund_holdings(self, isin: str, holdings_data: List[Dict[str, Any]]) -> bool:
        """Insert holdings for a fund, replacing existing ones"""
        try:
            with self.get_session() as session:
                # First, delete existing holdings for this fund
                session.query(FundHolding).filter(
                    FundHolding.fund_isin == isin
                ).delete()

                # Insert new holdings
                for holding in holdings_data:
                    # Get or create the holding (in separate session to avoid conflicts)
                    holding_id = self.get_or_create_holding(holding['Name'], holding['Symbol'])

                    if holding_id:
                        # Create fund holding
                        fund_holding = FundHolding(
                            fund_isin=isin,
                            holding_id=holding_id,
                            holding_percent=holding['Holding Percent']
                        )
                        session.merge(fund_holding)  # Use merge for upsert behavior

            return True
        except Exception as e:
            print(f"Error inserting holdings for fund {isin}: {e}")
            return False

    # ==================== MANAGER OPERATIONS ====================

    def get_manager_by_id(self, manager_id: int) -> Optional[Dict[str, Any]]:
        """Get a manager by id"""
        try:
            with self.get_session() as session:
                manager = session.query(Manager).filter(
                    Manager.id == manager_id
                ).first()

                if not manager:
                    return None

                return {
                    'id': manager.id,
                    'name': manager.name,
                    'url': manager.url,
                    'created_at': manager.created_at,
                    'updated_at': manager.updated_at
                }
        except Exception as e:
            print(f"Error retrieving manager {manager_id}: {e}")
            return None

    def create_manager(self, manager: str) -> Optional[int]:
        """Create the manager name"""
        try:
            url = quote(manager.replace(" ", "_").lower(), safe="")

            with self.get_session() as session:
                new_manager = Manager(name=manager, url=url)
                session.add(new_manager)
                session.flush()
                return new_manager.id
        except Exception as e:
            print(f"Error creating manager {manager}: {e}")
            return None

    def create_or_return_manager(self, manager: str) -> Optional[int]:
        """Create or return the manager name"""
        try:
            with self.get_session() as session:
                # Try to get existing manager
                existing = session.query(Manager).filter(
                    Manager.name == manager
                ).first()

                if existing:
                    return existing.id
                else:
                    # Create in same session
                    url = quote(manager.replace(" ", "_").lower(), safe="")
                    new_manager = Manager(name=manager, url=url)
                    session.add(new_manager)
                    session.flush()
                    return new_manager.id
        except Exception as e:
            print(f"Error retrieving/creating manager {manager}: {e}")
            return None

    # ==================== SITEMAP OPERATIONS ====================

    def get_all_benchmark_ids(self) -> List[int]:
        """Get all benchmark IDs for sitemap generation (excluding specific IDs)"""
        try:
            with self.get_session() as session:
                results = session.query(Benchmark.id).filter(
                    Benchmark.id.notin_([1, 2, 8, 9])
                ).order_by(Benchmark.id).all()

                return [row.id for row in results]
        except Exception as e:
            print(f"Error getting all benchmark IDs: {e}")
            return []

