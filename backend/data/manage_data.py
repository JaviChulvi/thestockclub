import sys
import os
# Add the backend directory to the Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(backend_dir)
sys.path.insert(0, parent_dir)
from database import FundDatabase
import yfinance as yf
from time import sleep
import pandas as pd

class ManageData:
    def __init__(self):
        self.db = FundDatabase()

    def update_returns(self):
        funds = self.db.get_funds_with_history()
        print(len(funds))
        for fund in funds:
            ytd_return, last_90d_return = self.db.get_returns(fund['isin'])
            self.db.update_fund_returns(fund['isin'], ytd_return=ytd_return, last_90d_return=last_90d_return)
    
    def convert_pandas_to_serializable(self, data):
        """Convert pandas objects to JSON-serializable format"""
        if data is None:
            return None
        elif isinstance(data, pd.DataFrame):
            if data.empty:
                return []
            else:
                # Convert DataFrame to list of records, preserving index
                return data.reset_index().to_dict('records')
        elif isinstance(data, pd.Series):
            if data.empty:
                return {}
            else:
                return data.to_dict()
        elif hasattr(data, 'to_dict'):
            # Other pandas objects
            try:
                return data.to_dict()
            except:
                return str(data)
        else:
            return data

    def convert_funds_data_to_dict(self, funds_data):
        """Convert yfinance funds_data to JSON-serializable format"""
        import pandas as pd
        
        result = {}
        for attr in ['fund_overview', 'top_holdings', 
                 'sector_weightings', 'asset_classes', 'bond_holdings', 
                 'equity_holdings', 'bond_ratings']:
            try:
                data = getattr(funds_data, attr, None)
                result[attr] = self.convert_pandas_to_serializable(data)
            except Exception as e:
                print(f"Error converting {attr}: {e}")
                result[attr] = None
        return result
    
    def update_funds_info(self):
        funds = self.db.get_all_funds()
        for fund in funds:
            isin = fund['isin']
            ticker = yf.Ticker(isin)
            funds_data = ticker.funds_data

            # Call each property to trigger the API call and populate the data
            try:
                _ = funds_data.fund_overview
            except Exception as e:
                print(f"Error getting fund_overview for {isin}: {e}")
            try:
                _ = funds_data.top_holdings
            except Exception as e:
                print(f"Error getting top_holdings for {isin}: {e}")
            try:
                _ = funds_data.sector_weightings
            except Exception as e:
                print(f"Error getting sector_weightings for {isin}: {e}")
            try:
                _ = funds_data.asset_classes
            except Exception as e:
                print(f"Error getting asset_classes for {isin}: {e}")
            try:
                _ = funds_data.bond_holdings
            except Exception as e:
                print(f"Error getting bond_holdings for {isin}: {e}")
            try:
                _ = funds_data.equity_holdings
            except Exception as e:
                print(f"Error getting equity_holdings for {isin}: {e}")
            try:
                _ = funds_data.bond_ratings
            except Exception as e:
                print(f"Error getting bond_ratings for {isin}: {e}")

            # Now pass the funds_data object directly to update_fund_data
            dict_result = self.convert_funds_data_to_dict(funds_data)
            self.db.update_fund_data_from_funds_data(isin, dict_result)
            print(isin, dict_result['top_holdings'])
            print("=" * 60)

    def get_funds_holding_stock(self, ticker: str):
        funds = self.db.get_funds_holding_stock(ticker, 5)
        for fund in funds:
            print(fund['isin'], fund['long_name'])
            print(fund['top_holdings'])
            print("=" * 60)

    
if __name__ == "__main__":
    manage_data = ManageData()
    manage_data.get_funds_holding_stock('AAPL')