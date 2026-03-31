"""
Funds API endpoints
Handles all fund-related operations including retrieval, search, and filtering
"""

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from functools import lru_cache

from database import db
from util import format_date
from api.utils import (
    handle_errors,
    success_response,
    paginated_response,
    get_resource_or_404,
    safe_float,
    get_date_range,
    calculate_price_change
)

# Create router
router = APIRouter()


# ==================== HELPER FUNCTIONS ====================

def _sanitize_price_history(price_history: list, date_formatter=None) -> list:
    """Filter out records with NaN/Infinity/null prices"""
    sanitized = []
    if price_history:
        for record in price_history:
            close_price = safe_float(record.get('close_price'))
            if close_price is not None:
                date = record.get('date')
                sanitized.append({
                    'date': date_formatter(date) if date_formatter else date,
                    'close_price': close_price
                })
    return sanitized


def format_fund_data(fund: dict, price_history_90d: list = None,
                     latest_price: dict = None, extra: dict = None) -> dict:
    """
    Format fund data for frontend consumption.

    Args:
        fund: Raw fund data from database
        price_history_90d: Pre-fetched 90-day price history (pass None to skip)
        latest_price: Pre-fetched latest price record (pass None to skip)
        extra: Additional fields to merge into the result
    """
    formatted_fund = {
        'id': fund['id'],
        'isin': fund['isin'],
        'name': fund['long_name'] or 'Unknown Fund',
        'shortName': fund['short_name'] or fund['isin'],
        'price': safe_float(fund['previous_close'], 0.0),
        'currency': fund['currency'] or 'USD',
        'type': fund['type_disp'] or 'Investment Fund',
        'region': fund['region'] or 'Global',
        'ytdReturn': safe_float(fund['ytd_return']),
        'ninety_d_return': safe_float(fund['last_90d_return']),
    }

    if price_history_90d is not None:
        formatted_fund['last_90d_price_history'] = _sanitize_price_history(price_history_90d)

    if latest_price:
        formatted_fund['price'] = safe_float(latest_price['close_price'], 0.0)

    if extra:
        formatted_fund.update(extra)

    return formatted_fund


def _batch_format_funds(funds: list, include_30d_change: bool = False) -> list:
    """Format a list of funds using batch-loaded price data (2 queries total)."""
    if not funds:
        return []

    isins = [f['isin'] for f in funds]
    start_date_90d, end_date_90d = get_date_range(90)

    # 2 batch queries instead of up to 3N individual queries
    latest_prices = db.get_batch_latest_prices(isins)
    price_histories_90d = db.get_batch_price_history(
        isins, start_date=start_date_90d, end_date=end_date_90d
    )

    # Derive 30-day cutoff from 90-day data (no extra query needed)
    start_date_30d = None
    if include_30d_change:
        start_date_30d, _ = get_date_range(30)

    result = []
    for fund in funds:
        isin = fund['isin']
        history_90d = price_histories_90d.get(isin, [])
        latest = latest_prices.get(isin)

        extra = {}

        if include_30d_change and latest:
            # Filter 30-day subset from the already-fetched 90-day data
            history_30d = [r for r in history_90d if r.get('date', '') >= start_date_30d]
            if len(history_30d) >= 2:
                current_price = safe_float(history_30d[0]['close_price'], 0.0)
                old_price = safe_float(history_30d[-1]['close_price'], 0.0)
                change, change_percent = calculate_price_change(current_price, old_price)
                extra['change'] = change
                extra['changePercent'] = change_percent

        result.append(format_fund_data(
            fund,
            price_history_90d=history_90d,
            latest_price=latest,
            extra=extra,
        ))

    return result


# ==================== ENDPOINT HANDLERS ====================


@lru_cache(maxsize=128)
def _get_random_funds_cached(fund_type: str = None):
    """Cached version of get_random_funds function"""
    # Try to get funds with historical data first
    funds = db.get_random_funds_with_history(18, fund_type)

    if not funds:
        return success_response(count=0, funds=[])

    formatted_funds = _batch_format_funds(funds)

    return success_response(
        count=len(formatted_funds),
        funds=formatted_funds
    )


@router.get('/random')
@router.get('/random/{fund_type}')
@handle_errors
def get_random_funds(fund_type: str = None):
    """Get 9 random funds with historical data from the database"""
    return _get_random_funds_cached(fund_type)


@lru_cache(maxsize=128)
def _get_funds_from_manager_cached(manager_id: str, limit: str):
    """Cached version of get_funds_from_manager function"""
    funds = db.get_funds_from_manager(manager_id, limit)
    manager = db.get_manager_by_id(manager_id)

    if not funds:
        return success_response(count=0, funds=[], manager=manager)

    formatted_funds = _batch_format_funds(funds)

    # Merge manager-specific extra fields the frontend uses
    for formatted, raw in zip(formatted_funds, funds):
        formatted['fund_assets'] = raw.get('fund_assets')
        formatted['category'] = raw.get('category')
        formatted['created_at'] = raw.get('created_at')
        formatted['url'] = raw.get('url')

    return success_response(
        count=len(formatted_funds),
        funds=formatted_funds,
        manager=manager
    )


@router.get('/manager/{manager_id}/{limit}')
@handle_errors
def get_funds_from_manager(manager_id: str, limit: str):
    """Get all funds from a manager"""
    return _get_funds_from_manager_cached(manager_id, limit)


@lru_cache(maxsize=128)
def _get_funds_with_history_cached(limit: int = 20):
    """Cached version of get_funds_with_history function"""
    funds = db.get_funds_with_history(limit)

    if not funds:
        return success_response(count=0, funds=[])

    formatted_funds = _batch_format_funds(funds, include_30d_change=True)

    # Merge the extra field this endpoint provides
    for formatted, raw in zip(formatted_funds, funds):
        formatted['price_records_count'] = raw.get('price_count', 0)

    return success_response(
        count=len(formatted_funds),
        funds=formatted_funds
    )


@router.get('/with-history')
@handle_errors
def get_funds_with_history(limit: int = Query(20, ge=1, le=100)):
    """Get funds that have historical price data"""
    return _get_funds_with_history_cached(limit)


@router.get('/search')
@handle_errors
def search_funds(q: str = Query(..., min_length=1)):
    """Search funds by ISIN or name"""
    query = q.strip()

    if not query:
        return {'funds': [], 'count': 0}

    # Search by ISIN (pattern match) - allow single characters for ISIN
    isin_funds = db.get_funds_by_isin_pattern(query.upper())

    # Search by name (partial match) - require at least 2 characters for name search
    name_funds = []
    if len(query) >= 2:
        name_funds = db.get_funds_by_name_pattern(query)

    # Combine and deduplicate results
    all_funds = {}
    for fund in isin_funds + name_funds:
        if fund['isin'] not in all_funds:
            all_funds[fund['isin']] = fund

    funds_list = list(all_funds.values())

    # Format results for frontend
    formatted_funds = []
    for fund in funds_list[:10]:  # Limit to 10 results
        formatted_fund = {
            'isin': fund['isin'],
            'name': fund['long_name'] or 'Unknown Fund',
            'short_name': fund['short_name'] or fund['isin'],
            'type': fund.get('type_disp', 'Investment Fund'),
            'currency': fund.get('currency', 'USD')
        }
        formatted_funds.append(formatted_fund)

    return {
        'funds': formatted_funds,
        'count': len(formatted_funds),
        'query': query
    }


@router.get('/{isin}')
@handle_errors
def get_fund_by_isin(isin: str):
    """Get a fund by its ISIN"""
    fund = get_resource_or_404(db.get_fund_by_isin, isin, "Fund")
    price_history = db.get_price_history(isin)

    return {
        'fund': fund,
        'price_history': _sanitize_price_history(price_history, date_formatter=format_date)
    }


@lru_cache(maxsize=512)
def _get_funds_by_benchmark_cached(benchmark_id: int, limit: int, offset: int):
    """Cached version of get_funds_by_benchmark function with pagination"""
    benchmark = db.get_benchmark_by_id(benchmark_id)

    # Get total count of funds for this benchmark
    total_count = db.get_funds_count_by_benchmark(benchmark_id)

    # Get paginated funds for the benchmark with historical data
    funds = db.get_funds_by_benchmark_with_history(benchmark_id, count=limit, offset=offset)

    if not funds and offset == 0:
        return paginated_response(
            items=[],
            total=0,
            limit=limit,
            offset=offset,
            funds=[],
            benchmark=benchmark
        )

    # Format the funds data using batch loading
    formatted_funds = _batch_format_funds(funds)

    if benchmark is not None:
        benchmark['fund_count'] = total_count

    return paginated_response(
        items=formatted_funds,
        total=total_count,
        limit=limit,
        offset=offset,
        funds=formatted_funds,
        benchmark=benchmark
    )


@router.get('/by-benchmark/{benchmark_id}')
@handle_errors
def get_funds_by_benchmark(
    benchmark_id: int,
    limit: int = Query(12, ge=1, le=50, description="Number of funds per page"),
    offset: int = Query(0, ge=0, description="Number of funds to skip")
):
    """Get funds for a specific benchmark with historical data and pagination support"""
    return _get_funds_by_benchmark_cached(benchmark_id, limit, offset)


@router.get('/sitemap/funds')
@handle_errors
def get_funds_for_sitemap():
    """Get all fund ISINs for sitemap generation"""
    isins = db.get_all_fund_isins()

    return JSONResponse(content=success_response(
        isins=isins,
        count=len(isins)
    ))


@router.get('/managers/sitemap')
@handle_errors
def get_managers_for_sitemap():
    """Get all manager IDs for sitemap generation"""
    ids = db.get_all_manager_ids()

    return JSONResponse(content=success_response(
        ids=ids,
        count=len(ids)
    ))
