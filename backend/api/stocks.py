"""
Stock API endpoints
Handles all stock-related operations including retrieval, search, and filtering
"""

from fastapi import APIRouter, Query
import random
from datetime import datetime

from database import db
from util import format_date
from api.utils import (
    handle_errors,
    success_response,
    get_resource_or_404,
    safe_float,
    get_date_range,
    fetch_price_history_with_dates,
    calculate_price_change
)

# Create router
router = APIRouter()


# ==================== HELPER FUNCTIONS ====================

def format_stock_data(stock: dict, include_price_history: bool = True) -> dict:
    """
    Format stock data for frontend consumption

    Args:
        stock: Raw stock data from database
        include_price_history: Whether to include 90-day price history

    Returns:
        Formatted stock dictionary
    """
    formatted_stock = {
        'id': stock['id'],
        'symbol': stock['symbol'],
        'name': stock['symbol'],  # We can enhance this if we have a 'name' field in the future
        'price': safe_float(stock['current_price'], 0.0),
        'currency': stock['currency'] or 'USD',
        'country': stock['country'] or 'Global',
        'sector': stock['sector_key'] or 'Unknown',
        'industry': stock['industry_key'] or 'Unknown',
        'marketCap': stock['market_cap'],
        'trailingPE': safe_float(stock['trailing_pe']),
        'forwardPE': safe_float(stock['forward_pe']),
        'beta': safe_float(stock['beta']),
        'fiftyTwoWeekHigh': safe_float(stock['fifty_two_week_high']),
        'fiftyTwoWeekLow': safe_float(stock['fifty_two_week_low']),
    }

    # Add 90-day price history if requested
    if include_price_history:
        last_90d_price_history = fetch_price_history_with_dates(
            db.get_stock_price_history,
            stock['symbol'],
            days=90
        )
        formatted_stock['last_90d_price_history'] = last_90d_price_history

        # Get latest price from price history if available
        latest_price = db.get_stock_latest_price(stock['symbol'])
        if latest_price:
            formatted_stock['price'] = safe_float(latest_price['close_price'], 0.0)

            if len(last_90d_price_history) >= 2:
                current_price = safe_float(last_90d_price_history[-1]['close_price'], 0.0)
                old_price = safe_float(last_90d_price_history[0]['close_price'], 0.0)
                change, change_percent = calculate_price_change(current_price, old_price)
                formatted_stock['change'] = change
                formatted_stock['changePercent'] = change_percent

            # Calculate 1 year return
            price_history_1y = fetch_price_history_with_dates(
                db.get_stock_price_history,
                stock['symbol'],
                days=365
            )

            if len(price_history_1y) >= 2:
                current_price = safe_float(price_history_1y[-1]['close_price'], 0.0)
                year_ago_price = safe_float(price_history_1y[0]['close_price'], 0.0)
                _, one_year_return = calculate_price_change(current_price, year_ago_price)
                formatted_stock['oneYearReturn'] = one_year_return
            else:
                formatted_stock['oneYearReturn'] = None
        else:
            # Mock data for stocks without price history
            formatted_stock['change'] = round(random.uniform(-2.0, 3.0), 2)
            formatted_stock['changePercent'] = round(random.uniform(-3.0, 5.0), 2)
            formatted_stock['oneYearReturn'] = None

    return formatted_stock


# ==================== ENDPOINT HANDLERS ====================


def _get_random_stocks_cached():
    """Cached version of get_random_stocks function"""
    # Try to get stocks with historical data
    stocks = db.get_random_stocks_with_history(18)

    if not stocks:
        return success_response(count=0, stocks=[])

    # Format the stocks data for the frontend using helper function
    formatted_stocks = [format_stock_data(stock) for stock in stocks]

    return success_response(
        count=len(formatted_stocks),
        stocks=formatted_stocks
    )


@router.get('/filter-options')
@handle_errors
def get_filter_options():
    """Get available filter options (countries, sectors, currencies)"""
    options = db.get_stock_filter_options()

    return success_response(options=options)


@router.get('/random')
@handle_errors
def get_random_stocks():
    """Get 9 random stocks with historical data from the database"""
    return _get_random_stocks_cached()


@router.get('/filter')
@handle_errors
def get_filtered_stocks(
    country: str = Query(None, description="Filter by country"),
    sector: str = Query(None, description="Filter by sector"),
    currency: str = Query(None, description="Filter by currency"),
    trailing_pe_min: float = Query(None, description="Minimum trailing P/E ratio"),
    trailing_pe_max: float = Query(None, description="Maximum trailing P/E ratio"),
    forward_pe_min: float = Query(None, description="Minimum forward P/E ratio"),
    forward_pe_max: float = Query(None, description="Maximum forward P/E ratio"),
    limit: int = Query(50, description="Maximum number of stocks to return")
):
    """Get stocks with filters applied"""
    stocks = db.get_filtered_stocks(
        country=country,
        sector=sector,
        currency=currency,
        trailing_pe_min=trailing_pe_min,
        trailing_pe_max=trailing_pe_max,
        forward_pe_min=forward_pe_min,
        forward_pe_max=forward_pe_max,
        limit=limit
    )

    if not stocks:
        return success_response(count=0, stocks=[])

    # Format the stocks data for the frontend
    formatted_stocks = [format_stock_data(stock) for stock in stocks]

    return success_response(
        count=len(formatted_stocks),
        stocks=formatted_stocks
    )


@router.get('/{ticker}')
@handle_errors
def get_stock_by_ticker(ticker: str):
    """Get a stock by its ticker symbol with complete price history"""
    stock = get_resource_or_404(db.get_stock_by_symbol, ticker, f"Stock {ticker}")

    # Get complete price history (no date limits)
    price_history = db.get_stock_price_history(ticker)

    # Format stock data
    formatted_stock = {
        'id': stock['id'],
        'symbol': stock['symbol'],
        'country': stock['country'],
        'sector': stock['sector_key'],
        'industry': stock['industry_key'],
        'longBusinessSummary': stock['long_business_summary'],
        'fullTimeEmployees': stock['full_time_employees'],
        'address': stock['address'],
        'website': stock['website'],
        'currency': stock['currency'],
        'exchange': stock['exchange'],
        'marketCap': stock['market_cap'],
        'currentPrice': safe_float(stock['current_price']),
        'trailingPE': safe_float(stock['trailing_pe']),
        'forwardPE': safe_float(stock['forward_pe']),
        'priceToBook': safe_float(stock['price_to_book']),
        'beta': safe_float(stock['beta']),
        'totalCash': stock['total_cash'],
        'totalDebt': stock['total_debt'],
        'currentRatio': safe_float(stock['current_ratio']),
        'debtToEquity': safe_float(stock['debt_to_equity']),
        'totalRevenue': stock['total_revenue'],
        'netIncomeToCommon': stock['net_income_to_common'],
        'profitMargins': safe_float(stock['profit_margins']),
        'returnOnEquity': safe_float(stock['return_on_equity']),
        'freeCashflow': stock['free_cashflow'],
        'ebitda': stock['ebitda'],
        'revenueGrowth': safe_float(stock['revenue_growth']),
        'earningsGrowth': safe_float(stock['earnings_growth']),
        'trailingEps': safe_float(stock['trailing_eps']),
        'fiftyTwoWeekHigh': safe_float(stock['fifty_two_week_high']),
        'fiftyTwoWeekLow': safe_float(stock['fifty_two_week_low']),
        'overallRisk': stock['overall_risk'],
        'recommendationKey': stock['recommendation_key'],
        'targetMeanPrice': safe_float(stock['target_mean_price']),
        'numberOfAnalystOpinions': stock['number_of_analyst_opinions']
    }

    return success_response(
        stock=formatted_stock,
        price_history=[
            {
                'date': format_date(price['date']),
                'close_price': safe_float(price['close_price']),
                'volume': price['volume']
            }
            for price in price_history
        ]
    )
