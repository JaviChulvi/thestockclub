"""
Stock repository for stock and stock price history database operations
"""
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import sys
import os

# Add backend directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from database.connection import DatabaseConnection
from database.models import Stock, StockPriceHistory, Base
from sqlalchemy import func, and_, exists
from sqlalchemy.dialects.postgresql import insert as pg_insert


class StockRepository(DatabaseConnection):
    """Stock-specific database operations"""

    # ==================== CREATE TABLES ====================

    def create_stocks_table(self) -> bool:
        """Create the stocks table using SQLAlchemy ORM"""
        try:
            Base.metadata.create_all(self.engine, tables=[Stock.__table__])
            print("Stocks table created successfully")
            return True
        except Exception as e:
            print(f"Error creating stocks table: {e}")
            return False

    def create_stock_price_history_table(self) -> bool:
        """Create the stock_price_history table using SQLAlchemy ORM"""
        try:
            Base.metadata.create_all(self.engine, tables=[StockPriceHistory.__table__])
            print("Stock price history table created successfully")
            return True
        except Exception as e:
            print(f"Error creating stock price history table: {e}")
            return False

    # ==================== INSERT OPERATIONS ====================

    def insert_stock(self, symbol: str, stock_data: Dict[str, Any]) -> bool:
        """Insert or update a stock record into the database using SQLAlchemy ORM"""
        try:
            values = {
                'symbol': symbol.upper(),
                # General info
                'country': stock_data.get('country'),
                'sector_key': stock_data.get('sectorKey') or stock_data.get('sector_key'),
                'industry_key': stock_data.get('industryKey') or stock_data.get('industry_key'),
                'long_business_summary': stock_data.get('longBusinessSummary') or stock_data.get('long_business_summary'),
                'full_time_employees': stock_data.get('fullTimeEmployees') or stock_data.get('full_time_employees'),
                'address': stock_data.get('address1') or stock_data.get('address'),
                'website': stock_data.get('website'),
                'currency': stock_data.get('currency'),
                'exchange': stock_data.get('exchange'),
                # Valuation & Market Size
                'market_cap': stock_data.get('marketCap') or stock_data.get('market_cap'),
                'current_price': stock_data.get('currentPrice') or stock_data.get('current_price'),
                'trailing_pe': stock_data.get('trailingPE') or stock_data.get('trailing_pe'),
                'forward_pe': stock_data.get('forwardPE') or stock_data.get('forward_pe'),
                'price_to_book': stock_data.get('priceToBook') or stock_data.get('price_to_book'),
                'beta': stock_data.get('beta'),
                # Financial Position
                'total_cash': stock_data.get('totalCash') or stock_data.get('total_cash'),
                'total_debt': stock_data.get('totalDebt') or stock_data.get('total_debt'),
                'current_ratio': stock_data.get('currentRatio') or stock_data.get('current_ratio'),
                'debt_to_equity': stock_data.get('debtToEquity') or stock_data.get('debt_to_equity'),
                # Profitability & Cash Flow
                'total_revenue': stock_data.get('totalRevenue') or stock_data.get('total_revenue'),
                'net_income_to_common': stock_data.get('netIncomeToCommon') or stock_data.get('net_income_to_common'),
                'profit_margins': stock_data.get('profitMargins') or stock_data.get('profit_margins'),
                'return_on_equity': stock_data.get('returnOnEquity') or stock_data.get('return_on_equity'),
                'free_cashflow': stock_data.get('freeCashflow') or stock_data.get('free_cashflow'),
                'ebitda': stock_data.get('ebitda'),
                # Growth & Performance
                'revenue_growth': stock_data.get('revenueGrowth') or stock_data.get('revenue_growth'),
                'earnings_growth': stock_data.get('earningsGrowth') or stock_data.get('earnings_growth'),
                'trailing_eps': stock_data.get('trailingEps') or stock_data.get('trailing_eps'),
                'fifty_two_week_high': stock_data.get('fiftyTwoWeekHigh') or stock_data.get('fifty_two_week_high'),
                'fifty_two_week_low': stock_data.get('fiftyTwoWeekLow') or stock_data.get('fifty_two_week_low'),
                # Financial Health & Risk
                'overall_risk': stock_data.get('overallRisk') or stock_data.get('overall_risk'),
                # Analyst Expectations
                'recommendation_key': stock_data.get('recommendationKey') or stock_data.get('recommendation_key'),
                'target_mean_price': stock_data.get('targetMeanPrice') or stock_data.get('target_mean_price'),
                'number_of_analyst_opinions': stock_data.get('numberOfAnalystOpinions') or stock_data.get('number_of_analyst_opinions'),
            }

            with self.get_session() as session:
                # Use PostgreSQL's INSERT ... ON CONFLICT DO UPDATE
                stmt = pg_insert(Stock).values(**values)
                stmt = stmt.on_conflict_do_update(
                    index_elements=['symbol'],
                    set_={
                        'country': stmt.excluded.country,
                        'sector_key': stmt.excluded.sector_key,
                        'industry_key': stmt.excluded.industry_key,
                        'long_business_summary': stmt.excluded.long_business_summary,
                        'full_time_employees': stmt.excluded.full_time_employees,
                        'address': stmt.excluded.address,
                        'website': stmt.excluded.website,
                        'currency': stmt.excluded.currency,
                        'exchange': stmt.excluded.exchange,
                        'market_cap': stmt.excluded.market_cap,
                        'current_price': stmt.excluded.current_price,
                        'trailing_pe': stmt.excluded.trailing_pe,
                        'forward_pe': stmt.excluded.forward_pe,
                        'price_to_book': stmt.excluded.price_to_book,
                        'beta': stmt.excluded.beta,
                        'total_cash': stmt.excluded.total_cash,
                        'total_debt': stmt.excluded.total_debt,
                        'current_ratio': stmt.excluded.current_ratio,
                        'debt_to_equity': stmt.excluded.debt_to_equity,
                        'total_revenue': stmt.excluded.total_revenue,
                        'net_income_to_common': stmt.excluded.net_income_to_common,
                        'profit_margins': stmt.excluded.profit_margins,
                        'return_on_equity': stmt.excluded.return_on_equity,
                        'free_cashflow': stmt.excluded.free_cashflow,
                        'ebitda': stmt.excluded.ebitda,
                        'revenue_growth': stmt.excluded.revenue_growth,
                        'earnings_growth': stmt.excluded.earnings_growth,
                        'trailing_eps': stmt.excluded.trailing_eps,
                        'fifty_two_week_high': stmt.excluded.fifty_two_week_high,
                        'fifty_two_week_low': stmt.excluded.fifty_two_week_low,
                        'overall_risk': stmt.excluded.overall_risk,
                        'recommendation_key': stmt.excluded.recommendation_key,
                        'target_mean_price': stmt.excluded.target_mean_price,
                        'number_of_analyst_opinions': stmt.excluded.number_of_analyst_opinions,
                        'updated_at': func.now()
                    }
                )
                session.execute(stmt)

            print(f"Stock {symbol} inserted/updated successfully")
            return True
        except Exception as e:
            print(f"Error inserting stock {symbol}: {e}")
            return False

    # Maximum value for Numeric(15, 6) column: 10^(15-6) - 1 = 999,999,999.999999
    MAX_PRICE_VALUE = 999_999_999.0

    def insert_stock_price_history(self, symbol: str, date: str, close_price: float,
                                   volume: int = None) -> bool:
        """Insert price history record for a stock using SQLAlchemy ORM"""
        try:
            # Validate close_price is within acceptable range for Numeric(15, 6)
            price_value = float(close_price)
            if price_value > self.MAX_PRICE_VALUE:
                print(f"Skipping {symbol} on {date}: price {price_value:,.2f} exceeds max allowed value {self.MAX_PRICE_VALUE:,.2f}")
                return False

            if price_value < 0:
                print(f"Skipping {symbol} on {date}: negative price {price_value:,.2f}")
                return False

            values = {
                'symbol': symbol.upper(),
                'date': date,
                'close_price': price_value,
                'volume': volume
            }

            with self.get_session() as session:
                # Use PostgreSQL's INSERT ... ON CONFLICT DO UPDATE
                stmt = pg_insert(StockPriceHistory).values(**values)
                stmt = stmt.on_conflict_do_update(
                    index_elements=['symbol', 'date'],
                    set_={
                        'close_price': stmt.excluded.close_price,
                        'volume': stmt.excluded.volume,
                        'updated_at': func.now()
                    }
                )
                session.execute(stmt)

            return True
        except Exception as e:
            print(f"Error inserting stock price history for {symbol} on {date}: {e}")
            return False

    def insert_stock_price_history_batch(self, price_history_list: List[Dict[str, Any]]) -> int:
        """Insert multiple stock price history records in batch"""
        success_count = 0
        for price_data in price_history_list:
            symbol = price_data.get('symbol')
            date = price_data.get('date')
            close_price = price_data.get('close_price') or price_data.get('close')

            if not all([symbol, date, close_price]):
                print(f"Skipping invalid price data: missing required fields")
                continue

            volume = price_data.get('volume')

            if self.insert_stock_price_history(symbol, date, close_price, volume):
                success_count += 1

        print(f"Successfully inserted {success_count} out of {len(price_history_list)} stock price history records")
        return success_count

    # ==================== GET/RETRIEVE OPERATIONS ====================

    def _stock_to_dict(self, stock: Stock) -> Dict[str, Any]:
        """Convert Stock ORM object to dictionary with JSON-serializable types"""
        return {
            'id': stock.id,
            'symbol': stock.symbol,
            # General info
            'country': stock.country,
            'sector_key': stock.sector_key,
            'industry_key': stock.industry_key,
            'long_business_summary': stock.long_business_summary,
            'full_time_employees': stock.full_time_employees,
            'address': stock.address,
            'website': stock.website,
            'currency': stock.currency,
            'exchange': stock.exchange,
            # Valuation & Market Size
            'market_cap': stock.market_cap,
            'current_price': float(stock.current_price) if stock.current_price is not None else None,
            'trailing_pe': float(stock.trailing_pe) if stock.trailing_pe is not None else None,
            'forward_pe': float(stock.forward_pe) if stock.forward_pe is not None else None,
            'price_to_book': float(stock.price_to_book) if stock.price_to_book is not None else None,
            'beta': float(stock.beta) if stock.beta is not None else None,
            # Financial Position
            'total_cash': stock.total_cash,
            'total_debt': stock.total_debt,
            'current_ratio': float(stock.current_ratio) if stock.current_ratio is not None else None,
            'debt_to_equity': float(stock.debt_to_equity) if stock.debt_to_equity is not None else None,
            # Profitability & Cash Flow
            'total_revenue': stock.total_revenue,
            'net_income_to_common': stock.net_income_to_common,
            'profit_margins': float(stock.profit_margins) if stock.profit_margins is not None else None,
            'return_on_equity': float(stock.return_on_equity) if stock.return_on_equity is not None else None,
            'free_cashflow': stock.free_cashflow,
            'ebitda': stock.ebitda,
            # Growth & Performance
            'revenue_growth': float(stock.revenue_growth) if stock.revenue_growth is not None else None,
            'earnings_growth': float(stock.earnings_growth) if stock.earnings_growth is not None else None,
            'trailing_eps': float(stock.trailing_eps) if stock.trailing_eps is not None else None,
            'fifty_two_week_high': float(stock.fifty_two_week_high) if stock.fifty_two_week_high is not None else None,
            'fifty_two_week_low': float(stock.fifty_two_week_low) if stock.fifty_two_week_low is not None else None,
            # Financial Health & Risk
            'overall_risk': stock.overall_risk,
            # Analyst Expectations
            'recommendation_key': stock.recommendation_key,
            'target_mean_price': float(stock.target_mean_price) if stock.target_mean_price is not None else None,
            'number_of_analyst_opinions': stock.number_of_analyst_opinions,
            # Timestamps
            'created_at': stock.created_at.isoformat() if stock.created_at else None,
            'updated_at': stock.updated_at.isoformat() if stock.updated_at else None
        }

    def get_all_stocks(self, limit: int = None) -> List[Dict[str, Any]]:
        """Get all stocks from the database using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                query = session.query(Stock).order_by(Stock.market_cap.desc())

                if limit and self._validate_limit(limit):
                    query = query.limit(limit)

                stocks = query.all()
                return [self._stock_to_dict(s) for s in stocks]
        except Exception as e:
            print(f"Error retrieving all stocks: {e}")
            return []

    def get_stock_by_symbol(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get stock details by symbol using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                stock = session.query(Stock).filter(
                    Stock.symbol == symbol.upper()
                ).first()

                if not stock:
                    return None

                return self._stock_to_dict(stock)
        except Exception as e:
            print(f"Error retrieving stock {symbol}: {e}")
            return None

    def get_stocks_by_symbol_pattern(self, pattern: str) -> List[Dict[str, Any]]:
        """Search stocks by symbol pattern (case-insensitive) using SQLAlchemy ORM"""
        sanitized_pattern = self._sanitize_pattern(pattern)
        if not sanitized_pattern:
            return []

        try:
            with self.get_session() as session:
                stocks = session.query(Stock).filter(
                    Stock.symbol.ilike(f'%{sanitized_pattern}%')
                ).order_by(Stock.symbol).limit(20).all()

                return [self._stock_to_dict(s) for s in stocks]
        except Exception as e:
            print(f"Error searching stocks by symbol pattern: {e}")
            return []

    def get_stocks_by_sector(self, sector: str, limit: int = None) -> List[Dict[str, Any]]:
        """Get stocks by sector using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                query = session.query(Stock).filter(
                    Stock.sector_key.ilike(f'%{sector}%')
                ).order_by(Stock.market_cap.desc())

                if limit and self._validate_limit(limit):
                    query = query.limit(limit)

                stocks = query.all()
                return [self._stock_to_dict(s) for s in stocks]
        except Exception as e:
            print(f"Error retrieving stocks by sector {sector}: {e}")
            return []

    def get_stocks_by_industry(self, industry: str, limit: int = None) -> List[Dict[str, Any]]:
        """Get stocks by industry using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                query = session.query(Stock).filter(
                    Stock.industry_key.ilike(f'%{industry}%')
                ).order_by(Stock.market_cap.desc())

                if limit and self._validate_limit(limit):
                    query = query.limit(limit)

                stocks = query.all()
                return [self._stock_to_dict(s) for s in stocks]
        except Exception as e:
            print(f"Error retrieving stocks by industry {industry}: {e}")
            return []

    def get_stocks_by_country(self, country: str, limit: int = None) -> List[Dict[str, Any]]:
        """Get stocks by country using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                query = session.query(Stock).filter(
                    Stock.country.ilike(f'%{country}%')
                ).order_by(Stock.market_cap.desc())

                if limit and self._validate_limit(limit):
                    query = query.limit(limit)

                stocks = query.all()
                return [self._stock_to_dict(s) for s in stocks]
        except Exception as e:
            print(f"Error retrieving stocks by country {country}: {e}")
            return []

    def get_stocks_with_price_history(self, limit: int = None) -> List[Dict[str, Any]]:
        """Get all stocks that have historical price data using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                # Create EXISTS subquery
                subq = exists().where(StockPriceHistory.symbol == Stock.symbol)

                query = session.query(Stock).filter(subq).order_by(Stock.market_cap.desc())

                if limit and self._validate_limit(limit):
                    query = query.limit(limit)

                stocks = query.all()
                return [self._stock_to_dict(s) for s in stocks]
        except Exception as e:
            print(f"Error retrieving stocks with history: {e}")
            return []

    # --- Price History Retrieval ---

    def get_stock_price_history(self, symbol: str, start_date: str = None, end_date: str = None,
                                limit: int = None) -> List[Dict[str, Any]]:
        """Retrieve price history for a stock using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                query = session.query(StockPriceHistory).filter(
                    StockPriceHistory.symbol == symbol.upper()
                )

                if start_date:
                    query = query.filter(StockPriceHistory.date >= start_date)

                if end_date:
                    query = query.filter(StockPriceHistory.date <= end_date)

                query = query.order_by(StockPriceHistory.date.asc())

                if limit:
                    query = query.limit(limit)

                price_history = query.all()

                return [{
                    'symbol': ph.symbol,
                    'date': ph.date.isoformat() if hasattr(ph.date, 'isoformat') else ph.date,
                    'close_price': float(ph.close_price) if ph.close_price is not None else None,
                    'volume': ph.volume
                } for ph in price_history]
        except Exception as e:
            print(f"Error retrieving stock price history for {symbol}: {e}")
            return []

    def get_stock_latest_price(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get the most recent price for a stock using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                price = session.query(StockPriceHistory).filter(
                    StockPriceHistory.symbol == symbol.upper()
                ).order_by(StockPriceHistory.date.desc()).first()

                if not price:
                    return None

                return {
                    'id': price.id,
                    'symbol': price.symbol,
                    'date': price.date.isoformat() if hasattr(price.date, 'isoformat') else price.date,
                    'close_price': float(price.close_price) if price.close_price is not None else None,
                    'volume': price.volume,
                    'created_at': price.created_at.isoformat() if price.created_at else None,
                    'updated_at': price.updated_at.isoformat() if price.updated_at else None
                }
        except Exception as e:
            print(f"Error retrieving latest price for {symbol}: {e}")
            return None

    def get_stock_price_history_count(self, symbol: str) -> int:
        """Get the total number of price history records for a stock using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                count = session.query(func.count(StockPriceHistory.id)).filter(
                    StockPriceHistory.symbol == symbol.upper()
                ).scalar()

                return count or 0
        except Exception as e:
            print(f"Error counting stock price history for {symbol}: {e}")
            return 0

    def get_random_stocks_with_history(self, count: int = 18) -> List[Dict[str, Any]]:
        """Get random stocks that have historical price data using SQLAlchemy ORM"""
        try:
            with self.get_session() as session:
                subq = exists().where(StockPriceHistory.symbol == Stock.symbol)

                query = session.query(Stock).filter(
                    subq,
                    Stock.current_price.isnot(None),
                    Stock.market_cap.isnot(None),
                    Stock.trailing_pe.isnot(None),
                    Stock.forward_pe.isnot(None)
                )
                query = query.order_by(func.random()).limit(count)
                stocks = query.all()

                return [self._stock_to_dict(s) for s in stocks]
        except Exception as e:
            print(f"Error retrieving random stocks with history: {e}")
            return []

    def get_filtered_stocks(
        self,
        country: Optional[str] = None,
        sector: Optional[str] = None,
        currency: Optional[str] = None,
        trailing_pe_min: Optional[float] = None,
        trailing_pe_max: Optional[float] = None,
        forward_pe_min: Optional[float] = None,
        forward_pe_max: Optional[float] = None,
        limit: int = None
    ) -> List[Dict[str, Any]]:
        """Get stocks with multiple filters applied"""
        try:
            with self.get_session() as session:
                # Create EXISTS subquery for stocks with price history
                subq = exists().where(StockPriceHistory.symbol == Stock.symbol)

                query = session.query(Stock).filter(subq)

                # Apply filters
                if country:
                    query = query.filter(Stock.country.ilike(f'%{country}%'))

                if sector:
                    query = query.filter(Stock.sector_key.ilike(f'%{sector}%'))

                if currency:
                    query = query.filter(Stock.currency == currency.upper())

                if trailing_pe_min is not None:
                    query = query.filter(Stock.trailing_pe >= trailing_pe_min)

                if trailing_pe_max is not None:
                    query = query.filter(Stock.trailing_pe <= trailing_pe_max)

                if forward_pe_min is not None:
                    query = query.filter(Stock.forward_pe >= forward_pe_min)

                if forward_pe_max is not None:
                    query = query.filter(Stock.forward_pe <= forward_pe_max)

                # Filter out stocks with null values for key metrics
                query = query.filter(
                    Stock.current_price.isnot(None),
                    Stock.market_cap.isnot(None),
                    Stock.trailing_pe.isnot(None),
                    Stock.forward_pe.isnot(None)
                )

                # Order by market cap descending
                query = query.order_by(Stock.market_cap.desc())

                if limit and self._validate_limit(limit):
                    query = query.limit(limit)

                stocks = query.all()
                return [self._stock_to_dict(s) for s in stocks]
        except Exception as e:
            print(f"Error retrieving filtered stocks: {e}")
            return []

    def get_stock_filter_options(self) -> Dict[str, List[str]]:
        """Get distinct values for filter options"""
        try:
            with self.get_session() as session:
                # Get distinct countries
                countries = session.query(Stock.country).filter(
                    Stock.country.isnot(None),
                    Stock.country != ''
                ).distinct().order_by(Stock.country).all()

                # Get distinct sectors
                sectors = session.query(Stock.sector_key).filter(
                    Stock.sector_key.isnot(None),
                    Stock.sector_key != ''
                ).distinct().order_by(Stock.sector_key).all()

                # Get distinct currencies
                currencies = session.query(Stock.currency).filter(
                    Stock.currency.isnot(None),
                    Stock.currency != ''
                ).distinct().order_by(Stock.currency).all()

                return {
                    'countries': [c[0] for c in countries],
                    'sectors': [s[0] for s in sectors],
                    'currencies': [cur[0] for cur in currencies]
                }
        except Exception as e:
            print(f"Error getting filter options: {e}")
            return {'countries': [], 'sectors': [], 'currencies': []}

    def get_all_stocks_paginated(self, limit: int = 20, offset: int = 0) -> Dict[str, Any]:
        """
        Get paginated stocks for admin panel
        Returns stocks with pagination info, ordered by symbol
        """
        try:
            with self.get_session() as session:
                # Base query - order by symbol alphabetically
                query = session.query(Stock).order_by(Stock.symbol.asc())

                # Get total count before pagination
                total = query.count()

                # Apply pagination
                stocks = query.limit(limit).offset(offset).all()

                # Check if there are more results
                has_more = (offset + limit) < total

                return {
                    'stocks': [self._stock_to_dict(s) for s in stocks],
                    'pagination': {
                        'total': total,
                        'limit': limit,
                        'offset': offset,
                        'has_more': has_more
                    }
                }
        except Exception as e:
            print(f"Error retrieving paginated stocks: {e}")
            return {
                'stocks': [],
                'pagination': {
                    'total': 0,
                    'limit': limit,
                    'offset': offset,
                    'has_more': False
                }
            }

    # ==================== STATISTICS ====================

    def get_stocks_stats(self) -> Dict[str, Any]:
        """Get statistics about stocks for dashboard"""
        try:
            with self.get_session() as session:
                total_stocks = session.query(func.count(Stock.id)).scalar() or 0
                last_updated = session.query(func.max(Stock.updated_at)).scalar()

                # Count by sector
                sector_counts = session.query(
                    Stock.sector_key,
                    func.count(Stock.id)
                ).group_by(Stock.sector_key).all()

                return {
                    'total_stocks': total_stocks,
                    'last_updated': last_updated.isoformat() if last_updated else None,
                    'by_sector': {sector: count for sector, count in sector_counts if sector}
                }
        except Exception as e:
            print(f"Error getting stocks stats: {e}")
            return {'total_stocks': 0, 'last_updated': None, 'by_sector': {}}

    # ==================== UPDATE OPERATIONS ====================

    def update_stock_admin(
        self,
        symbol: str,
        country: Optional[str] = None,
        sector_key: Optional[str] = None,
        industry_key: Optional[str] = None,
        exchange: Optional[str] = None,
        currency: Optional[str] = None
    ) -> bool:
        """
        Update stock information (ADMIN only)
        Only updates provided fields, leaving others unchanged
        """
        try:
            with self.get_session() as session:
                stock = session.query(Stock).filter(
                    Stock.symbol == symbol.upper()
                ).first()

                if not stock:
                    print(f"Stock {symbol} not found")
                    return False

                # Update only provided fields
                if country is not None:
                    stock.country = country
                if sector_key is not None:
                    stock.sector_key = sector_key
                if industry_key is not None:
                    stock.industry_key = industry_key
                if exchange is not None:
                    stock.exchange = exchange
                if currency is not None:
                    stock.currency = currency

                # Update timestamp
                stock.updated_at = func.now()

                session.flush()
                print(f"Stock {symbol} updated successfully")
                return True
        except Exception as e:
            print(f"Error updating stock {symbol}: {e}")
            return False

    # ==================== DELETE OPERATIONS ====================

    def delete_stock(self, symbol: str) -> bool:
        """Delete a stock by symbol (will cascade delete price history)"""
        try:
            with self.get_session() as session:
                stock = session.query(Stock).filter(
                    Stock.symbol == symbol.upper()
                ).first()

                if not stock:
                    print(f"Stock {symbol} not found")
                    return False

                session.delete(stock)
                session.flush()
                print(f"Stock {symbol} deleted successfully")
                return True
        except Exception as e:
            print(f"Error deleting stock {symbol}: {e}")
            return False

