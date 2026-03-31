import yfinance as yf
from curl_cffi import requests as requests_yf
from datetime import datetime, timedelta
import os
import sys
import pandas as pd
import signal
import time
from contextlib import contextmanager

# Add the backend directory to the Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(backend_dir)
sys.path.insert(0, parent_dir)
from database.repositories.stock_repository import StockRepository
from database.repositories.benchmark_repository import BenchmarkRepository
from database.models import Holding


class TimeoutException(Exception):
    """Exception raised when operation times out"""
    pass


@contextmanager
def timeout(seconds):
    """Context manager for adding timeout to operations"""
    def timeout_handler(signum, frame):
        raise TimeoutException(f"Operation timed out after {seconds} seconds")

    # Set the signal handler and alarm
    old_handler = signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(seconds)

    try:
        yield
    finally:
        # Disable the alarm and restore old handler
        signal.alarm(0)
        signal.signal(signal.SIGALRM, old_handler)


class LoadStocksFromHoldings(StockRepository, BenchmarkRepository):
    # Configuration constants
    MAX_RETRIES = 3
    INITIAL_RETRY_DELAY = 2  # seconds
    MAX_RETRY_DELAY = 30  # seconds
    RATE_LIMIT_DELAY = 1  # seconds between stocks
    SKIP_IF_UPDATED_WITHIN_HOURS = 6  # Skip stocks updated within this timeframe

    def __init__(self):
        StockRepository.__init__(self)

    def retry_with_backoff(self, func, *args, **kwargs):
        """
        Retry a function with exponential backoff
        Returns: (success: bool, result: any, error: Exception)
        """
        for attempt in range(self.MAX_RETRIES):
            try:
                result = func(*args, **kwargs)
                return True, result, None
            except Exception as e:
                if attempt < self.MAX_RETRIES - 1:
                    delay = min(self.INITIAL_RETRY_DELAY * (2 ** attempt), self.MAX_RETRY_DELAY)
                    print(f"    Attempt {attempt + 1} failed: {e}")
                    print(f"    Retrying in {delay} seconds...")
                    time.sleep(delay)
                else:
                    return False, None, e
        return False, None, Exception("Max retries exceeded")

    def should_skip_stock(self, symbol):
        """
        Check if a stock should be skipped because it was recently updated
        Returns: (should_skip: bool, reason: str)
        """
        try:
            latest_price = self.get_stock_latest_price(symbol)
            if latest_price and 'date' in latest_price:
                last_update = datetime.strptime(latest_price['date'], '%Y-%m-%d')
                hours_since_update = (datetime.now() - last_update).total_seconds() / 3600

                if hours_since_update < self.SKIP_IF_UPDATED_WITHIN_HOURS:
                    return True, f"Updated {hours_since_update:.1f} hours ago"

            return False, None
        except Exception as e:
            # If we can't determine, don't skip
            return False, None

    def get_all_holding_symbols(self):
        """Get all symbols from the holdings table"""
        try:
            with self.get_session() as session:
                holdings = session.query(Holding.symbol).all()
                return [h.symbol for h in holdings]
        except Exception as e:
            print(f"Error retrieving holding symbols: {e}")
            return []

    def get_stock_info(self, ticker: str, session=None):
        """Get stock info using yfinance"""
        stock = yf.Ticker(ticker, session=session)
        return stock.get_info()

    def clean_stock_info(self, stock_info: dict):
        """Clean and filter stock info to keep only relevant fields"""
        # Define the keys we want to keep based on the categories
        keys_to_keep = {
            # General info
            'country',
            'sectorKey',
            'industryKey',
            'longBusinessSummary',
            'fullTimeEmployees',
            'address1',
            'website',
            'currency',
            'exchange',
            # Valuation & Market Size
            'symbol',
            'marketCap',
            'currentPrice',
            'trailingPE',
            'forwardPE',
            'priceToBook',
            'beta',
            'totalCash',
            'totalDebt',
            'currentRatio',
            'debtToEquity',

            # Profitability & Cash Flow
            'totalRevenue',
            'netIncomeToCommon',
            'profitMargins',
            'returnOnEquity',
            'freeCashflow',
            'ebitda',

            # Growth & Performance
            'revenueGrowth',
            'earningsGrowth',
            'trailingEps',
            'fiftyTwoWeekHigh',
            'fiftyTwoWeekLow',

            # Financial Health & Risk
            'totalCash',
            'totalDebt',
            'debtToEquity',
            'currentRatio',
            'overallRisk',

            # Analyst Expectations
            'recommendationKey',
            'targetMeanPrice',
            'numberOfAnalystOpinions'
        }

        # Filter the stock_info to only include the keys we want and exclude None values
        return {k: v for k, v in stock_info.items() if k in keys_to_keep and v is not None}

    def update_stocks_and_history(self):
        """Update stock data and historical prices for all symbols from holdings table"""
        # Get all symbols from holdings table
        symbols = self.get_all_holding_symbols()

        if not symbols:
            print("No holdings found in the database")
            return

        print(f"Found {len(symbols)} holdings to process")

        # Create session with timeout configuration
        # Set a 60-second timeout for individual HTTP requests
        try:
            session = requests_yf.Session(impersonate="chrome", timeout=60)
        except Exception:
            # Fallback if timeout param not supported in constructor
            session = requests_yf.Session(impersonate="chrome")
            # Note: Individual operations still have signal-based timeout as backstop

        # Error tracking
        consecutive_errors = 0
        max_consecutive_errors = 10
        total_errors = 0
        total_processed = 0
        successful = 0
        skipped = 0
        total_symbols = len(symbols)

        for idx, symbol in enumerate(symbols, 1):
            print(f"\n{'='*60}")
            print(f"Processing stock: {symbol} ({idx}/{total_symbols} - {idx/total_symbols*100:.1f}%)")
            print(f"{'='*60}")

            # Check if we should skip this stock (recently updated)
            should_skip, skip_reason = self.should_skip_stock(symbol)
            if should_skip:
                print(f"[{symbol}] ⊘ Skipping: {skip_reason}")
                skipped += 1
                consecutive_errors = 0  # Don't count skips as errors
                continue

            # Check if we've hit the consecutive error threshold
            if consecutive_errors >= max_consecutive_errors:
                print(f"\n{'='*60}")
                print(f"ABORTING: Hit {max_consecutive_errors} consecutive errors")
                print(f"Total processed: {total_processed}, Successful: {successful}, Errors: {total_errors}")
                print(f"{'='*60}")
                # Exit with error code to indicate failure
                sys.exit(1)

            total_processed += 1

            try:
                # Wrap the entire stock processing in a timeout (90 seconds per stock)
                # Individual HTTP requests timeout at 60 seconds
                with timeout(90):
                    # Get stock info and historical data using the same Ticker object
                    stock = yf.Ticker(symbol, session=session)

                    # 1. Process stock info
                    print(f"[{symbol}] Fetching stock info...")
                    success, stock_info, error = self.retry_with_backoff(stock.get_info)

                    if not success:
                        print(f"[{symbol}] ✗ Failed to fetch stock info after {self.MAX_RETRIES} attempts: {error}")
                        raise error  # Re-raise to be caught by outer timeout handler

                    if not stock_info:
                        print(f"[{symbol}] No info found, skipping")
                        continue

                    # Clean the stock info
                    cleaned_info = self.clean_stock_info(stock_info)

                    # Insert or update stock data
                    success = self.insert_stock(symbol, cleaned_info)
                    if success:
                        print(f"[{symbol}] ✓ Stock data inserted/updated")
                    else:
                        print(f"[{symbol}] ✗ Failed to insert/update stock data")

                    # 2. Process historical price data
                    print(f"[{symbol}] Fetching price history...")

                    # Get the latest price from database to determine start date
                    latest_price = self.get_stock_latest_price(symbol)

                    if latest_price:
                        last_date = datetime.strptime(latest_price['date'], '%Y-%m-%d')
                        print(f"[{symbol}] Latest price in DB: {latest_price['date']}, fetching newer data...")
                    else:
                        # If no price history exists, get all available data
                        last_date = datetime(1900, 1, 1)
                        print(f"[{symbol}] No existing price history, fetching all available data...")

                    success, price_history, error = self.retry_with_backoff(
                        stock.history,
                        interval="1d",
                        start=last_date,
                        end=datetime.now(),
                        auto_adjust=False
                    )

                    if not success:
                        print(f"[{symbol}] ✗ Failed to fetch price history after {self.MAX_RETRIES} attempts: {error}")
                        raise error  # Re-raise to be caught by outer timeout handler

                    if price_history.empty:
                        print(f"[{symbol}] No price history found")
                    else:
                        # Process the price history DataFrame
                        if price_history.index.name == 'Date' or 'Date' in str(type(price_history.index)):
                            price_history = price_history.reset_index()

                        price_history['Date'] = pd.to_datetime(price_history['Date'])
                        price_history['Adj Close'] = price_history['Adj Close'].astype(float)
                        price_history['Open'] = price_history['Open'].astype(float)
                        price_history['High'] = price_history['High'].astype(float)
                        price_history['Low'] = price_history['Low'].astype(float)
                        price_history['Volume'] = price_history['Volume'].astype(int)

                        price_history.set_index('Date', inplace=True)
                        price_history = price_history.sort_index()

                        # Only insert new data (after the last date in database)
                        price_history = price_history[price_history.index > last_date.strftime('%Y-%m-%d')]

                        if price_history.empty:
                            print(f"[{symbol}] No new price data to insert")
                        else:
                            # Insert price history records
                            inserted_count = 0
                            for date_index, row in price_history.iterrows():
                                date = date_index.strftime('%Y-%m-%d')
                                success = self.insert_stock_price_history(
                                    symbol=symbol,
                                    date=date,
                                    close_price=float(row["Adj Close"]),
                                    volume=int(row["Volume"])
                                )

                                if success:
                                    inserted_count += 1

                            print(f"[{symbol}] ✓ Inserted {inserted_count} price records")

                    print(f"[{symbol}] ✓ Completed successfully")
                    successful += 1
                    consecutive_errors = 0  # Reset on success

                    # Rate limiting: sleep between stocks to avoid overwhelming the API
                    if idx < total_symbols:  # Don't sleep after the last stock
                        time.sleep(self.RATE_LIMIT_DELAY)

            except TimeoutException as e:
                print(f"[{symbol}] ✗ TIMEOUT: {e}")
                print(f"[{symbol}] Stock processing exceeded 90-second limit")
                print(f"[{symbol}] Skipping this stock and continuing with next...")
                total_errors += 1
                consecutive_errors += 1
                print(f"[WARNING] Consecutive errors: {consecutive_errors}/{max_consecutive_errors}")
                continue

            except KeyboardInterrupt:
                print(f"\n[{symbol}] Script interrupted by user")
                print(f"Stopping processing...")
                raise

            except Exception as e:
                error_msg = str(e)
                # Check if it's a timeout-related error from requests
                if 'timeout' in error_msg.lower() or 'timed out' in error_msg.lower():
                    print(f"[{symbol}] ✗ NETWORK TIMEOUT: {e}")
                    print(f"[{symbol}] Request exceeded timeout limit")
                else:
                    print(f"[{symbol}] ✗ Error: {e}")

                print(f"[{symbol}] Skipping this stock and continuing with next...")
                total_errors += 1
                consecutive_errors += 1
                print(f"[WARNING] Consecutive errors: {consecutive_errors}/{max_consecutive_errors}")
                continue

        # Print final summary
        print(f"\n{'='*60}")
        print(f"SUMMARY")
        print(f"{'='*60}")
        print(f"Total symbols: {total_symbols}")
        print(f"Processed: {total_processed}")
        print(f"Successful: {successful}")
        print(f"Skipped (recently updated): {skipped}")
        print(f"Errors: {total_errors}")
        print(f"Success rate: {(successful/total_processed*100):.1f}%" if total_processed > 0 else "N/A")
        print(f"{'='*60}")

    def create_tables(self):
        """Create necessary database tables"""
        print("Creating stocks table...")
        self.create_stocks_table()
        print("Creating stock price history table...")
        self.create_stock_price_history_table()


if __name__ == "__main__":
    load_stocks = LoadStocksFromHoldings()

    # Create tables if they don't exist
    load_stocks.create_tables()

    # Update stock data and historical prices from holdings
    print("\n" + "="*60)
    print("Loading stock data and price history from holdings table")
    print("="*60 + "\n")
    load_stocks.update_stocks_and_history()

    print("\n" + "="*60)
    print("Stock data update from holdings completed!")
    print("="*60)
