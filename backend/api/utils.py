"""
Shared utility functions for API endpoints
"""

from fastapi import Header, HTTPException
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from functools import wraps
import logging

logger = logging.getLogger(__name__)

from database import db


# ==================== AUTHENTICATION ====================

def get_user_from_session(authorization: str = Header(None)) -> Optional[str]:
    """
    Extract user ID from session token in request headers

    Args:
        authorization: Authorization header containing the session token

    Returns:
        User ID if valid session exists, None otherwise
    """
    if not authorization:
        return None

    # Remove 'Bearer ' prefix if present
    if authorization.startswith('Bearer '):
        authorization = authorization[7:]

    session = db.get_session_by_token(authorization)
    if session and session.get('is_active'):
        return session.get('user_id')

    return None


# ==================== RESPONSE HELPERS ====================

def success_response(
    data: Any = None,
    message: str = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Create a standardized success response

    Args:
        data: The main data payload
        message: Optional success message
        **kwargs: Additional fields to include in the response

    Returns:
        Standardized success response dictionary
    """
    response = {'success': True}

    if message:
        response['message'] = message

    if data is not None:
        # If data is a dict, merge it with response
        if isinstance(data, dict):
            response.update(data)
        else:
            response['data'] = data

    # Add any additional kwargs
    response.update(kwargs)

    return response


def error_response(
    status_code: int,
    detail: str,
    error_type: str = None
) -> HTTPException:
    """
    Create a standardized error response

    Args:
        status_code: HTTP status code
        detail: Error message
        error_type: Optional error type for categorization

    Returns:
        HTTPException with standardized error format
    """
    error_detail = {'message': detail}
    if error_type:
        error_detail['error_type'] = error_type

    return HTTPException(status_code=status_code, detail=detail)


def paginated_response(
    items: List[Any],
    total: int,
    limit: int,
    offset: int,
    **kwargs
) -> Dict[str, Any]:
    """
    Create a standardized paginated response

    Args:
        items: List of items for current page
        total: Total number of items across all pages
        limit: Number of items per page
        offset: Number of items to skip
        **kwargs: Additional fields to include in the response

    Returns:
        Standardized paginated response dictionary
    """
    response = {
        'success': True,
        'pagination': {
            'total': total,
            'limit': limit,
            'offset': offset,
            'has_more': (offset + limit) < total
        }
    }

    response.update(kwargs)

    return response


# ==================== DATE/TIME HELPERS ====================

def format_datetime_iso(dt: Any) -> str:
    """
    Format datetime to ISO string, handling both datetime objects and strings

    Args:
        dt: Datetime object or string

    Returns:
        ISO formatted datetime string
    """
    if dt is None:
        return None

    if isinstance(dt, datetime):
        return dt.isoformat()

    return dt


def get_date_range(days: int = 90) -> tuple[str, str]:
    """
    Get date range for the last N days

    Args:
        days: Number of days to go back

    Returns:
        Tuple of (start_date, end_date) as strings in YYYY-MM-DD format
    """
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)

    return (
        start_date.strftime('%Y-%m-%d'),
        end_date.strftime('%Y-%m-%d')
    )


# ==================== VALIDATION HELPERS ====================

def require_fields(data: Dict[str, Any], *fields: str) -> None:
    """
    Validate that required fields are present in data

    Args:
        data: Dictionary to validate
        *fields: Field names to check for

    Raises:
        HTTPException: If any required field is missing
    """
    missing = [field for field in fields if field not in data or data[field] is None]

    if missing:
        raise HTTPException(
            status_code=400,
            detail=f'Missing required fields: {", ".join(missing)}'
        )


def validate_positive_int(value: int, name: str, min_value: int = 1) -> None:
    """
    Validate that a value is a positive integer

    Args:
        value: Value to validate
        name: Name of the field for error message
        min_value: Minimum allowed value (default: 1)

    Raises:
        HTTPException: If validation fails
    """
    if not isinstance(value, int) or value < min_value:
        raise HTTPException(
            status_code=400,
            detail=f'{name} must be a positive integer (>= {min_value})'
        )


# ==================== RESOURCE HELPERS ====================

def get_resource_or_404(
    getter_func,
    identifier: Any,
    resource_name: str = "Resource"
) -> Any:
    """
    Get a resource or raise 404 if not found

    Args:
        getter_func: Function to call to get the resource
        identifier: Identifier to pass to getter function
        resource_name: Name of resource for error message

    Returns:
        The resource if found

    Raises:
        HTTPException: 404 if resource not found
    """
    resource = getter_func(identifier)

    if not resource:
        raise HTTPException(
            status_code=404,
            detail=f'{resource_name} not found'
        )

    return resource


def safe_float(value: Any, default: float = None) -> Optional[float]:
    """
    Safely convert value to float, handling NaN and Infinity values

    Args:
        value: Value to convert
        default: Default value if conversion fails or value is not JSON-compliant

    Returns:
        Float value or default (returns default for NaN/Infinity values)
    """
    if value is None:
        return default

    try:
        float_value = float(value)

        # Check for NaN, Infinity, or -Infinity (not JSON compliant)
        import math
        if math.isnan(float_value) or math.isinf(float_value):
            return default

        return float_value
    except (ValueError, TypeError):
        return default


# ==================== ERROR HANDLING DECORATOR ====================

def handle_errors(func):
    """
    Decorator to standardize error handling for API endpoints

    Catches all exceptions and converts them to appropriate HTTPExceptions
    """
    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Error in %s", func.__name__)
            raise HTTPException(
                status_code=500,
                detail='Internal server error'
            )

    @wraps(func)
    def sync_wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Error in %s", func.__name__)
            raise HTTPException(
                status_code=500,
                detail='Internal server error'
            )

    # Return appropriate wrapper based on whether function is async
    import inspect
    if inspect.iscoroutinefunction(func):
        return async_wrapper
    else:
        return sync_wrapper


# ==================== PRICE HISTORY HELPERS ====================

def fetch_price_history_with_dates(
    fetch_func,
    identifier: str,
    days: int = 90
) -> List[Dict[str, Any]]:
    """
    Fetch price history for a given number of days

    Args:
        fetch_func: Function to call to get price history (should accept identifier, start_date, end_date)
        identifier: Identifier for the resource (ISIN, ticker, etc.)
        days: Number of days of history to fetch

    Returns:
        List of price history records
    """
    start_date, end_date = get_date_range(days)
    return fetch_func(identifier, start_date=start_date, end_date=end_date)


def calculate_price_change(
    current_price: float,
    old_price: float
) -> tuple[float, float]:
    """
    Calculate price change amount and percentage

    Args:
        current_price: Current price
        old_price: Previous price

    Returns:
        Tuple of (change_amount, change_percent)
    """
    if not current_price or not old_price or old_price == 0:
        return (0.0, 0.0)

    change = current_price - old_price
    change_percent = (change / old_price) * 100

    return (round(change, 2), round(change_percent, 2))
