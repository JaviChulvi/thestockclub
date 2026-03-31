# API Development Guidelines

**READ THIS BEFORE CREATING NEW ENDPOINTS**

This document outlines the standard practices, utilities, and patterns to follow when developing API endpoints in this project.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Core Principles](#core-principles)
3. [Utility Functions Reference](#utility-functions-reference)
4. [Standard Endpoint Pattern](#standard-endpoint-pattern)
5. [Code Examples](#code-examples)
6. [Testing Guidelines](#testing-guidelines)

---

## Project Structure

```
backend/api/
├── __init__.py          # Router registration
├── utils.py             # Shared utility functions (USE THESE!)
├── admin.py             # Admin endpoints (/admin/*)
├── auth.py              # Authentication (/auth/*)
├── benchmarks.py        # Benchmarks (/benchmarks/*)
├── categories.py        # Categories (/categories/*)
├── chat.py              # AI chat (/chat/*)
├── data_sync.py         # Data sync tasks (/data-sync/*)
├── funds.py             # Fund endpoints (/funds/*)
├── health.py            # Health checks (/health)
└── stocks.py            # Stock endpoints (/stocks/*)
```

Each file handles a specific domain and exports a FastAPI router.

---

## Core Principles

### 1. **DRY (Don't Repeat Yourself)**
- Use utility functions from `utils.py` instead of duplicating code
- If you write the same logic twice, extract it to a utility function

### 2. **Consistent Error Handling**
- ALWAYS use `@handle_errors` decorator on endpoint functions
- Use `error_response()` instead of raising `HTTPException` directly
- Use `get_resource_or_404()` for database lookups

### 3. **Consistent Response Formats**
- Use `success_response()` for successful operations
- Use `paginated_response()` for paginated results
- All responses should include `success: true` field

### 4. **Type Safety**
- Use Pydantic models for request bodies
- Add type hints to function parameters and return values
- Use utility functions that handle type conversions safely

### 5. **Clean Code**
- Keep endpoint functions focused on business logic
- Remove all try-except boilerplate (use `@handle_errors`)
- Use descriptive function and variable names

---

## Utility Functions Reference

**Location:** `backend/api/utils.py`

### Authentication

#### `get_user_from_session(authorization: str = Header(None)) -> Optional[str]`
Extract user ID from authorization header.

**Usage:**
```python
@router.get('/protected')
def protected_endpoint(user_id: Optional[str] = Depends(get_user_from_session)):
    if not user_id:
        raise error_response(401, 'Unauthorized')
    # ... your logic
```

---

### Response Helpers

#### `success_response(data=None, message=None, **kwargs) -> Dict[str, Any]`
Create standardized success response.

**Usage:**
```python
return success_response(
    message='Operation successful',
    user={'id': 1, 'name': 'John'},
    count=10
)
# Returns: {'success': True, 'message': '...', 'user': {...}, 'count': 10}
```

#### `paginated_response(items, total, limit, offset, **kwargs) -> Dict[str, Any]`
Create standardized paginated response.

**Usage:**
```python
return paginated_response(
    items=formatted_items,
    total=total_count,
    limit=limit,
    offset=offset,
    additional_field='value'
)
# Returns: {
#   'success': True,
#   'pagination': {'total': 100, 'limit': 20, 'offset': 0, 'has_more': True},
#   'additional_field': 'value'
# }
```

#### `error_response(status_code: int, detail: str, error_type: str = None) -> HTTPException`
Create standardized error response.

**Usage:**
```python
if not user:
    raise error_response(404, 'User not found')

if invalid_data:
    raise error_response(400, 'Invalid request data')
```

---

### Date/Time Helpers

#### `get_date_range(days: int = 90) -> tuple[str, str]`
Calculate date range for the last N days.

**Usage:**
```python
start_date, end_date = get_date_range(90)  # Last 90 days
# Returns: ('2024-01-01', '2024-04-01')
```

#### `format_datetime_iso(dt: Any) -> str`
Safely format datetime to ISO string.

**Usage:**
```python
formatted_users = [
    {
        'id': user['id'],
        'created_at': format_datetime_iso(user['created_at'])
    }
    for user in users
]
```

---

### Resource Helpers

#### `get_resource_or_404(getter_func, identifier, resource_name="Resource") -> Any`
Get resource or raise 404 if not found.

**Usage:**
```python
# Instead of:
fund = db.get_fund_by_isin(isin)
if not fund:
    raise HTTPException(status_code=404, detail='Fund not found')

# Use:
fund = get_resource_or_404(db.get_fund_by_isin, isin, "Fund")
```

#### `safe_float(value: Any, default: float = None) -> Optional[float]`
Safely convert value to float.

**Usage:**
```python
formatted_stock = {
    'price': safe_float(stock['current_price'], 0.0),
    'pe_ratio': safe_float(stock['trailing_pe']),  # None if invalid
}
```

---

### Error Handling Decorator

#### `@handle_errors`
Standardize error handling for endpoints (catches all exceptions).

**Usage:**
```python
@router.get('/users')
@handle_errors  # Always add this!
def get_users():
    # No need for try-except blocks
    users = db.get_all_users()
    return success_response(users=users)
```

---

### Price History Helpers

#### `fetch_price_history_with_dates(fetch_func, identifier: str, days: int = 90) -> List[Dict]`
Fetch price history with auto-calculated date range.

**Usage:**
```python
# Instead of:
start_date = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')
end_date = datetime.now().strftime('%Y-%m-%d')
price_history = db.get_price_history(isin, start_date, end_date)

# Use:
price_history = fetch_price_history_with_dates(
    db.get_price_history,
    isin,
    days=90
)
```

#### `calculate_price_change(current_price: float, old_price: float) -> tuple[float, float]`
Calculate price change amount and percentage.

**Usage:**
```python
current = 105.50
previous = 100.00
change, change_percent = calculate_price_change(current, previous)
# Returns: (5.50, 5.50)

formatted_data = {
    'change': change,
    'changePercent': change_percent
}
```

---

## Standard Endpoint Pattern

### Basic Endpoint Template

```python
from fastapi import APIRouter, Query, Depends
from typing import Optional
from pydantic import BaseModel

from database import db
from api.utils import (
    handle_errors,
    success_response,
    get_user_from_session,
    get_resource_or_404,
    error_response
)

router = APIRouter()


# Request model (if needed)
class CreateItemRequest(BaseModel):
    name: str
    description: Optional[str] = None


@router.get('/items')
@handle_errors
def get_items(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user_id: Optional[str] = Depends(get_user_from_session)
):
    """Get paginated list of items"""
    if not user_id:
        raise error_response(401, 'Unauthorized')

    items = db.get_items(limit=limit, offset=offset)
    total = db.get_items_count()

    return paginated_response(
        items=items,
        total=total,
        limit=limit,
        offset=offset
    )


@router.get('/items/{item_id}')
@handle_errors
def get_item(item_id: int):
    """Get single item by ID"""
    item = get_resource_or_404(db.get_item_by_id, item_id, "Item")
    return success_response(item=item)


@router.post('/items')
@handle_errors
def create_item(
    data: CreateItemRequest,
    user_id: Optional[str] = Depends(get_user_from_session)
):
    """Create new item"""
    if not user_id:
        raise error_response(401, 'Unauthorized')

    item_id = db.create_item(
        name=data.name,
        description=data.description,
        created_by=user_id
    )

    if not item_id:
        raise error_response(500, 'Failed to create item')

    return success_response(
        message='Item created successfully',
        item_id=item_id
    )


@router.delete('/items/{item_id}')
@handle_errors
def delete_item(
    item_id: int,
    user_id: Optional[str] = Depends(get_user_from_session)
):
    """Delete item"""
    if not user_id:
        raise error_response(401, 'Unauthorized')

    # Verify resource exists
    item = get_resource_or_404(db.get_item_by_id, item_id, "Item")

    success = db.delete_item(item_id)
    if not success:
        raise error_response(500, 'Failed to delete item')

    return success_response(message='Item deleted successfully')
```

---

## Code Examples

### Example 1: Paginated Endpoint with Filters

```python
@router.get('/stocks/filter')
@handle_errors
def get_filtered_stocks(
    country: str = Query(None, description="Filter by country"),
    sector: str = Query(None, description="Filter by sector"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Get stocks with filters applied"""
    stocks = db.get_filtered_stocks(
        country=country,
        sector=sector,
        limit=limit,
        offset=offset
    )

    total = db.get_filtered_stocks_count(country=country, sector=sector)

    return paginated_response(
        items=stocks,
        total=total,
        limit=limit,
        offset=offset,
        stocks=stocks
    )
```

### Example 2: Resource with Price History

```python
@router.get('/funds/{isin}')
@handle_errors
def get_fund_by_isin(isin: str):
    """Get fund with price history"""
    fund = get_resource_or_404(db.get_fund_by_isin, isin, "Fund")

    # Get 90-day price history
    price_history = fetch_price_history_with_dates(
        db.get_price_history,
        isin,
        days=90
    )

    # Format with safe float conversion
    formatted_fund = {
        'isin': fund['isin'],
        'name': fund['long_name'],
        'price': safe_float(fund['previous_close'], 0.0),
        'ytd_return': safe_float(fund['ytd_return']),
        'price_history': price_history
    }

    return success_response(fund=formatted_fund)
```

### Example 3: Admin-Only Endpoint

```python
from api.admin import require_admin

@router.patch('/users/{user_id}')
@handle_errors
def update_user(
    user_id: int,
    data: UpdateUserRequest,
    admin_user_id: str = Depends(require_admin)
):
    """Update user (ADMIN only)"""
    # Verify user exists
    user = get_resource_or_404(db.get_user_by_id, user_id, "User")

    # Update user
    success = db.update_user(
        user_id=user_id,
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email
    )

    if not success:
        raise error_response(500, 'Failed to update user')

    # Get updated data
    updated_user = db.get_user_by_id(user_id)

    return success_response(
        message='User updated successfully',
        user=updated_user
    )
```

### Example 4: Formatting Response with Datetime

```python
@router.get('/conversations')
@handle_errors
def list_conversations(
    user_id: Optional[str] = Depends(get_user_from_session)
):
    """List user conversations"""
    if not user_id:
        raise error_response(401, 'Unauthorized')

    conversations = db.get_user_conversations(user_id)

    # Format with datetime helper
    formatted = [
        {
            'id': conv['id'],
            'title': conv['title'],
            'created_at': format_datetime_iso(conv['created_at'])
        }
        for conv in conversations
    ]

    return success_response(
        conversations=formatted,
        count=len(formatted)
    )
```

---

## Testing Guidelines

### 1. Manual Testing Checklist

Before committing new endpoints:

- [ ] Test with valid data
- [ ] Test with invalid data (400 errors)
- [ ] Test with missing authentication (401 errors)
- [ ] Test with unauthorized access (403 errors)
- [ ] Test with non-existent resources (404 errors)
- [ ] Test pagination boundaries (limit/offset)
- [ ] Verify response format matches standards

### 2. Response Format Validation

All responses should follow these formats:

**Success Response:**
```json
{
  "success": true,
  "data": {...},
  "message": "Optional message"
}
```

**Paginated Response:**
```json
{
  "success": true,
  "items": [...],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

**Error Response:**
```json
{
  "detail": "Error message"
}
```

---

## Common Mistakes to Avoid

### ❌ DON'T: Write manual try-except blocks
```python
@router.get('/items')
def get_items():
    try:
        items = db.get_items()
        return {'success': True, 'items': items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### ✅ DO: Use @handle_errors decorator
```python
@router.get('/items')
@handle_errors
def get_items():
    items = db.get_items()
    return success_response(items=items)
```

---

### ❌ DON'T: Manually build pagination responses
```python
return {
    'success': True,
    'items': items,
    'pagination': {
        'total': total,
        'limit': limit,
        'offset': offset,
        'has_more': (offset + limit) < total
    }
}
```

### ✅ DO: Use paginated_response()
```python
return paginated_response(
    items=items,
    total=total,
    limit=limit,
    offset=offset
)
```

---

### ❌ DON'T: Manual datetime formatting
```python
'created_at': user['created_at'].isoformat() if isinstance(user['created_at'], datetime) else user['created_at']
```

### ✅ DO: Use format_datetime_iso()
```python
'created_at': format_datetime_iso(user['created_at'])
```

---

### ❌ DON'T: Manual resource 404 checks
```python
fund = db.get_fund_by_isin(isin)
if not fund:
    raise HTTPException(status_code=404, detail='Fund not found')
```

### ✅ DO: Use get_resource_or_404()
```python
fund = get_resource_or_404(db.get_fund_by_isin, isin, "Fund")
```

---

## Quick Reference Checklist

When creating a new endpoint:

- [ ] Import utilities from `api.utils`
- [ ] Add `@handle_errors` decorator
- [ ] Use `success_response()` or `paginated_response()`
- [ ] Use `get_resource_or_404()` for database lookups
- [ ] Use `error_response()` instead of `HTTPException`
- [ ] Use `format_datetime_iso()` for datetime fields
- [ ] Use `safe_float()` for float conversions
- [ ] Use `get_date_range()` for date calculations
- [ ] Add proper type hints
- [ ] Document the endpoint with a docstring
- [ ] Test all error cases

---

## Need Help?

- Check existing endpoints in `funds.py`, `stocks.py`, or `admin.py` for examples
- Review `utils.py` for available utilities
- Follow the patterns established in this codebase
- When in doubt, use the utilities!

---

**Remember: Consistency is key. Follow these guidelines for clean, maintainable code.**
