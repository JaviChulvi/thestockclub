from re import M
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
from database.repositories.fund_repository import FundRepository
class UpdateData(FundRepository):
    def __init__(self):
        FundRepository.__init__(self)

    def update_funds_historical_data(self):
        session = requests_yf.Session(impersonate="chrome")
        funds = self.get_all_funds()
        for fund in funds:
            isin = fund['isin']
            latest_price = self.get_latest_price(isin)
            # print(latest_price)
            # if latest_price:
            #     last_date = datetime.strptime(latest_price['date'], '%Y-%m-%d')
            # else:
            #     last_date = datetime.now() - timedelta(days=365)
            last_date = datetime.strptime('2025-10-01', '%Y-%m-%d')

            try:
                fund = yf.Ticker(isin, session=session)
            except Exception as e:
                print(e)
                continue

            price_history = fund.history(interval="1d", start=last_date, end=datetime.now())

            if price_history.index.name == 'Date' or 'Date' in str(type(price_history.index)):
                price_history = price_history.reset_index()
            
            price_history['Date'] = pd.to_datetime(price_history['Date'])
            price_history['Close'] = price_history['Close'].astype(float)
            
            price_history.set_index('Date', inplace=True)
            price_history = price_history.sort_index()
            
            price_history = price_history[price_history.index > last_date.strftime('%Y-%m-%d')]

            for date_index, row in price_history.iterrows():
                date = date_index.strftime('%Y-%m-%d')
                self.insert_price_history(isin, date, row["Close"])

    def update_returns(self):
        funds = self.get_all_funds()
        for fund in funds:
            ytd_return, last_90d_return = self.get_returns(fund['isin'])
            self.update_fund_returns(fund['isin'], ytd_return=ytd_return, last_90d_return=last_90d_return)


if __name__ == "__main__":
    update_data = UpdateData()
    update_data.update_funds_historical_data()
    update_data.update_returns()
