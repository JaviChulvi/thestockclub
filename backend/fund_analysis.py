from database import db
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import pandas as pd
import numpy as np


def get_fund_volatility(isin: str):
    price_history = db.get_price_history(
            isin, 
            start_date=datetime.now() - timedelta(weeks=52), 
            end_date=datetime.now()
        )
    df = pd.DataFrame(price_history)
    df['date'] = pd.to_datetime(df['date'])
    df['close_price'] = df['close_price'].astype(float)
    df.set_index('date', inplace=True)
    df = df.sort_index()
    df['return'] = df['close_price'].pct_change()
    df = df.dropna()
    daily_volatility = df['return'].std()
    annual_volatility = daily_volatility * np.sqrt(252)
    return annual_volatility

def analyze_drawdowns(isin: str, time_period: str = "3Y"):
    # Get price data
    time_period_in_weeks = int(time_period.split('Y')[0]) * 52
    start_date = datetime.now() - timedelta(weeks=time_period_in_weeks)
    end_date = datetime.now()
    price_history = db.get_price_history(isin, start_date=start_date, end_date=end_date)
    df = pd.DataFrame(price_history)
    df['date'] = pd.to_datetime(df['date'])
    df['close_price'] = df['close_price'].astype(float)  # Convert Decimal to float
    df.set_index('date', inplace=True)
    df = df.sort_index()

    # Calculate running maximum (peak) - already vectorized with pandas/NumPy
    df['peak'] = df['close_price'].expanding().max()

    # Calculate drawdown from peak - vectorized operation
    df['drawdown'] = (df['close_price'] - df['peak']) / df['peak'] * 100

    # Use NumPy for finding max drawdown more efficiently
    drawdown_values = df['drawdown'].values
    max_drawdown_idx = np.argmin(drawdown_values)
    max_drawdown = float(drawdown_values[max_drawdown_idx])

    # Find the date of the maximum drawdown (trough)
    trough_date = df.index[max_drawdown_idx]

    # Find the last peak before the trough using NumPy
    peak_values_before_trough = df.loc[:trough_date, 'peak'].values
    peak_before_trough = peak_values_before_trough[-1]

    # Find peak date using NumPy's where for faster search
    close_prices = df['close_price'].values
    dates_array = df.index.values
    peak_indices = np.where(close_prices == peak_before_trough)[0]
    peak_date = df.index[peak_indices[-1]]

    # Calculate drawdown duration (from peak to trough)
    drawdown_duration = (trough_date - peak_date).days

    # Calculate recovery time using NumPy for faster boolean operations
    prices_after_trough = df.loc[trough_date:, 'close_price'].values
    dates_after_trough = df.loc[trough_date:].index

    # Find first price >= peak using NumPy
    recovery_indices = np.where(prices_after_trough >= peak_before_trough)[0]

    if len(recovery_indices) > 0:
        recovery_date = dates_after_trough[recovery_indices[0]]
        recovery_time = (recovery_date - trough_date).days
    else:
        recovery_date = None
        recovery_time = None

    return {
        'max_drawdown': max_drawdown,
        'drawdown_duration_days': drawdown_duration,
        'recovery_time_days': recovery_time,
        'trough_date': trough_date,
        'peak_date': peak_date
    }
if __name__ == "__main__":
    volatility = get_fund_volatility("LU1106545616")
    print(str(volatility))
