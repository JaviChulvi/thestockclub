import yfinance as yf
from curl_cffi import requests as requests_yf
from datetime import datetime, timedelta
import os
import sys
import pandas as pd

# Add the backend directory to the Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(backend_dir)
sys.path.insert(0, parent_dir)
from database.repositories.stock_repository import StockRepository

class UpdateStockData(StockRepository):
    def __init__(self):
        StockRepository.__init__(self)
        # Default test stocks to load
        self.test_stocks = [
            'AAPL',  # Apple Inc.
            'GOOGL', # Alphabet Inc.
            'MSFT',  # Microsoft Corporation
            'AMZN',  # Amazon.com Inc.
            'TSLA',  # Tesla Inc.
            'NVDA',  # NVIDIA Corporation
            'META',  # Meta Platforms Inc.
            'NFLX',  # Netflix Inc.
            'AMD',   # Advanced Micro Devices
            'INTC'   # Intel Corporation
        ]

    def get_stock_price_history(self, ticker: str):
        """Get stock price history using yfinance"""
        stock = yf.Ticker(ticker)
        return stock.history(period="max", interval="1d", auto_adjust=False)

    def get_stock_info(self, ticker: str):
        """Get stock info using yfinance"""
        stock = yf.Ticker(ticker)
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

    def update_stocks_data(self):
        """Update stock data for all test stocks"""
        session = requests_yf.Session(impersonate="chrome")
        
        for symbol in self.test_stocks:
            print(f"Processing stock: {symbol}")
            
            try:
                # Get stock info
                stock = yf.Ticker(symbol, session=session)
                stock_info = stock.get_info()
                
                if not stock_info:
                    print(f"No info found for {symbol}")
                    continue
                
                # Clean the stock info
                cleaned_info = self.clean_stock_info(stock_info)
                
                # Insert or update stock data
                success = self.insert_stock(symbol, cleaned_info)
                if success:
                    print(f"Successfully inserted/updated stock data for {symbol}")
                else:
                    print(f"Failed to insert/update stock data for {symbol}")
                    
            except Exception as e:
                print(f"Error processing stock {symbol}: {e}")
                continue

    def update_stocks_historical_data(self):
        """Update historical price data for all test stocks"""
        session = requests_yf.Session(impersonate="chrome")
        
        for symbol in self.test_stocks:
            print(f"Processing price history for: {symbol}")
            
            try:
                # Get the latest price from database to determine start date
                latest_price = self.get_stock_latest_price(symbol)
                
                if latest_price:
                    last_date = datetime.strptime(latest_price['date'], '%Y-%m-%d')
                else:
                    # If no price history exists, get last 2 years
                    last_date = datetime.now() - timedelta(days=730)

                stock = yf.Ticker(symbol, session=session)
                price_history = stock.history(interval="1d", start=last_date, end=datetime.now(), auto_adjust=False)

                if price_history.empty:
                    print(f"No price history found for {symbol}")
                    continue

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

                # Insert price history records
                for date_index, row in price_history.iterrows():
                    date = date_index.strftime('%Y-%m-%d')
                    success = self.insert_stock_price_history(
                        symbol=symbol,
                        date=date,
                        close_price=float(row["Adj Close"]),
                        volume=int(row["Volume"])
                    )
                    
                    if not success:
                        print(f"Failed to insert price history for {symbol} on {date}")

                print(f"Successfully updated price history for {symbol}")
                
            except Exception as e:
                print(f"Error processing price history for {symbol}: {e}")
                continue

    def create_tables(self):
        """Create necessary database tables"""
        print("Creating stocks table...")
        self.create_stocks_table()
        print("Creating stock price history table...")
        self.create_stock_price_history_table()


if __name__ == "__main__":
    update_stock_data = UpdateStockData()
    
    # Create tables if they don't exist
    update_stock_data.create_tables()
    
    # Update stock data (company info)
    print("Updating stock data...")
    update_stock_data.update_stocks_data()
    
    # Update historical price data
    print("Updating stock price history...")
    update_stock_data.update_stocks_historical_data()
    
    print("Stock data update completed!")