import yfinance as yf
import pandas as pd
import json
from datetime import datetime

def get_fund_info(ticker_symbol):
    """
    Fetch comprehensive information about a fund from Yahoo Finance

    Args:
        ticker_symbol (str): The fund ticker symbol (e.g., 'SPY', 'QQQ', 'VFIAX')

    Returns:
        dict: Dictionary containing all available fund information
    """
    try:
        # Create ticker object
        fund = yf.Ticker(ticker_symbol)

        # Get basic information
        info = fund.info

        print(f"\n{'='*60}")
        print(f"YAHOO FINANCE FUND INFORMATION FOR: {ticker_symbol.upper()}")
        print(f"{'='*60}")

        # Print all available information
        print("\n--- BASIC FUND INFORMATION ---")
        for key, value in info.items():
            if value is not None:
                print(f"{key}: {value}")

        # Get historical price data (last 1 year)
        print(f"\n--- HISTORICAL PRICE DATA (Last 1 Year) ---")
        hist = fund.history(period="1y")
        if not hist.empty:
            print("Recent Price Data:")
            print(hist.tail(10))  # Last 10 days

        # Return all data as dictionary
        return {
            'info': info,
            'historical_data': hist.to_dict() if not hist.empty else None,
        }

    except Exception as e:
        print(f"Error fetching data for {ticker_symbol}: {e}")
        return None

def save_fund_data_to_json(ticker_symbol, data):
    """
    Save the fund data to a JSON file

    Args:
        ticker_symbol (str): The fund ticker
        data (dict): The fund data dictionary
    """
    filename = f"{ticker_symbol.upper()}_fund_data.json"
    with open(filename, 'w') as f:
        # Convert datetime objects to strings for JSON serialization
        def convert_datetime(obj):
            if isinstance(obj, pd.Timestamp):
                return obj.strftime('%Y-%m-%d %H:%M:%S')
            elif isinstance(obj, pd.DataFrame):
                return obj.to_dict('records') if not obj.empty else []
            elif isinstance(obj, pd.Series):
                return obj.to_dict()
            elif isinstance(obj, dict):
                # Handle dictionary keys that might be Timestamps
                new_dict = {}
                for k, v in obj.items():
                    # Convert key to string if it's not already a valid JSON key type
                    if isinstance(k, pd.Timestamp):
                        k = k.strftime('%Y-%m-%d %H:%M:%S')
                    elif not isinstance(k, (str, int, float, bool, type(None))):
                        k = str(k)
                    new_dict[k] = v
                return new_dict
            elif hasattr(obj, '__dict__'):
                # Handle custom objects
                return str(obj)
            return str(obj)

        json.dump(data, f, indent=4, default=convert_datetime)
    print(f"\nData saved to {filename}")

def main():
    """
    Main function to demonstrate the fund data fetching
    """
    # Example usage - you can change this to any fund ticker
    ticker = "IE00BYVJR916"

    print(f"Fetching data for {ticker}...")

    # Get fund information
    fund_data = get_fund_info(ticker)

    if fund_data:
        # Optionally save to JSON
        try:
            save_option = input("\nSave data to JSON file? (y/n): ").strip().lower()
            if save_option == 'y':
                save_fund_data_to_json(ticker, fund_data)
        except EOFError:
            # If running non-interactively, automatically save the data
            print("\nRunning non-interactively, automatically saving data...")
            save_fund_data_to_json(ticker, fund_data)

    print("\nDone!")

if __name__ == "__main__":
    main()
