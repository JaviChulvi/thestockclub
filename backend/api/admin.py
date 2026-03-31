"""
Admin API endpoints
Handles administrative functions like user management
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from sqlalchemy import func

from database import db
from database.models import User, Fund, Conversation, Stock
from api.utils import (
    get_user_from_session,
    handle_errors,
    success_response,
    paginated_response,
    get_resource_or_404,
    format_datetime_iso,
    error_response
)

# Create router
router = APIRouter()


def require_admin(user_id: Optional[str] = Depends(get_user_from_session)):
    """
    Dependency to verify that the requesting user is an ADMIN
    """
    if not user_id:
        raise error_response(401, 'Unauthorized')

    # Get user from database
    user = get_resource_or_404(db.get_user_by_id, user_id, "User")

    # Check if user is admin
    if user.get('role') != 'ADMIN':
        raise error_response(403, 'Access denied. Admin privileges required.')

    return user_id


class UpdateAiEnabledRequest(BaseModel):
    ai_enabled: bool


class UpdateUserRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[str] = None


class UpdateFundRequest(BaseModel):
    long_name: Optional[str] = None
    short_name: Optional[str] = None
    type_disp: Optional[str] = None
    currency: Optional[str] = None
    region: Optional[str] = None
    category_id: Optional[int] = None


class UpdateStockRequest(BaseModel):
    country: Optional[str] = None
    sector_key: Optional[str] = None
    industry_key: Optional[str] = None
    exchange: Optional[str] = None
    currency: Optional[str] = None


@router.get('/users')
@handle_errors
def get_all_users(admin_user_id: str = Depends(require_admin)):
    """
    Get all users in the system (ADMIN only)
    Returns list of users ordered by creation date (most recent first)
    """
    users = db.get_all_users()

    if not users:
        return success_response(users=[])

    # Sort by created_at descending (most recent first)
    sorted_users = sorted(users, key=lambda x: x.get('created_at', datetime.min), reverse=True)

    # Format users for response
    formatted_users = [
        {
            'id': user['id'],
            'first_name': user['first_name'],
            'last_name': user['last_name'],
            'email': user['email'],
            'role': user.get('role', 'USER'),
            'is_active': user['is_active'],
            'ai_enabled': user['ai_enabled'],
            'created_at': format_datetime_iso(user['created_at'])
        }
        for user in sorted_users
    ]

    return success_response(users=formatted_users)


@router.patch('/users/{user_id}/ai-enabled')
@handle_errors
def update_user_ai_enabled(
    user_id: int,
    data: UpdateAiEnabledRequest,
    admin_user_id: str = Depends(require_admin)
):
    """
    Update a user's AI enabled status (ADMIN only)
    """
    # Check if target user exists
    target_user = get_resource_or_404(db.get_user_by_id, user_id, "User")

    # Update the user's ai_enabled field
    success = db.update_user_ai_enabled(user_id, data.ai_enabled)

    if not success:
        raise error_response(500, 'Failed to update user')

    return success_response(
        message=f'AI access {"enabled" if data.ai_enabled else "disabled"} for user',
        user={
            'id': user_id,
            'ai_enabled': data.ai_enabled
        }
    )


@router.patch('/users/{user_id}')
@handle_errors
def update_user(
    user_id: int,
    data: UpdateUserRequest,
    admin_user_id: str = Depends(require_admin)
):
    """
    Update user information (ADMIN only)
    Prevents admin from changing their own role
    """
    # Check if target user exists
    target_user = get_resource_or_404(db.get_user_by_id, user_id, "User")

    # Prevent admin from changing their own role
    if int(admin_user_id) == user_id and data.role is not None and data.role != target_user.get('role'):
        raise error_response(400, 'Cannot change your own role')

    # Validate role if provided
    if data.role is not None and data.role not in ['USER', 'ADMIN']:
        raise error_response(400, 'Invalid role. Must be USER or ADMIN')

    # Update the user
    success = db.update_user(
        user_id=user_id,
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        is_active=data.is_active,
        role=data.role
    )

    if not success:
        raise error_response(500, 'Failed to update user. Email may already be in use.')

    # Get updated user data
    updated_user = db.get_user_by_id(user_id)

    return success_response(
        message='User updated successfully',
        user=updated_user
    )


@router.delete('/users/{user_id}')
@handle_errors
def delete_user(
    user_id: int,
    admin_user_id: str = Depends(require_admin)
):
    """
    Delete a user (ADMIN only)
    Prevents admin from deleting themselves
    """
    # Prevent admin from deleting themselves
    if int(admin_user_id) == user_id:
        raise error_response(400, 'Cannot delete your own account')

    # Check if target user exists
    target_user = get_resource_or_404(db.get_user_by_id, user_id, "User")

    # Delete the user (will cascade delete sessions, conversations, messages)
    success = db.delete_user(user_id)

    if not success:
        raise error_response(500, 'Failed to delete user')

    return success_response(
        message='User deleted successfully',
        user_id=user_id
    )


@router.get('/funds')
@handle_errors
def get_all_funds(
    limit: int = 20,
    offset: int = 0,
    category_id: Optional[int] = None,
    admin_user_id: str = Depends(require_admin)
):
    """
    Get paginated funds list with optional category filter (ADMIN only)
    """
    result = db.get_all_funds_paginated(limit=limit, offset=offset, category_id=category_id)

    return paginated_response(
        items=result['funds'],
        total=result['pagination']['total'],
        limit=limit,
        offset=offset,
        funds=result['funds']
    )


@router.get('/funds/stats')
@handle_errors
def get_funds_stats(admin_user_id: str = Depends(require_admin)):
    """
    Get funds statistics (ADMIN only)
    """
    stats = db.get_funds_stats()

    return success_response(stats=stats)


@router.patch('/funds/{isin}')
@handle_errors
def update_fund(
    isin: str,
    data: UpdateFundRequest,
    admin_user_id: str = Depends(require_admin)
):
    """
    Update fund information (ADMIN only)
    """
    # Check if fund exists
    fund = get_resource_or_404(db.get_fund_by_isin, isin, "Fund")

    # Update the fund
    success = db.update_fund_admin(
        isin=isin,
        long_name=data.long_name,
        short_name=data.short_name,
        type_disp=data.type_disp,
        currency=data.currency,
        region=data.region,
        category_id=data.category_id
    )

    if not success:
        raise error_response(500, 'Failed to update fund')

    # Get updated fund data
    updated_fund = db.get_fund_by_isin(isin)

    return success_response(
        message='Fund updated successfully',
        fund=updated_fund
    )


@router.delete('/funds/{isin}')
@handle_errors
def delete_fund(
    isin: str,
    admin_user_id: str = Depends(require_admin)
):
    """
    Delete a fund (ADMIN only)
    """
    # Check if fund exists
    fund = get_resource_or_404(db.get_fund_by_isin, isin, "Fund")

    # Delete the fund
    success = db.delete_fund(isin)

    if not success:
        raise error_response(500, 'Failed to delete fund')

    return success_response(
        message='Fund deleted successfully',
        isin=isin
    )


@router.get('/stats')
@handle_errors
def get_admin_stats(admin_user_id: str = Depends(require_admin)):
    """
    Get dashboard statistics (ADMIN only)
    Returns:
    - Total users count
    - Total funds count
    - Total AI chats count
    - Tokens used (placeholder for future implementation)
    """
    with db.get_session() as session:
        # Get total users count
        total_users = session.query(func.count(User.id)).scalar() or 0

        # Get total funds count
        total_funds = session.query(func.count(Fund.isin)).scalar() or 0

        # Get total AI chats (conversations) count
        total_chats = session.query(func.count(Conversation.id)).scalar() or 0

        # Tokens used - placeholder for future implementation
        tokens_used = 0  # TODO: Implement token tracking

    return success_response(
        stats={
            'total_users': total_users,
            'total_funds': total_funds,
            'total_chats': total_chats,
            'tokens_used': tokens_used
        }
    )


@router.get('/stocks')
@handle_errors
def get_all_stocks(
    limit: int = 20,
    offset: int = 0,
    admin_user_id: str = Depends(require_admin)
):
    """
    Get paginated stocks list (ADMIN only)
    """
    result = db.get_all_stocks_paginated(limit=limit, offset=offset)

    return paginated_response(
        items=result['stocks'],
        total=result['pagination']['total'],
        limit=limit,
        offset=offset,
        stocks=result['stocks']
    )


@router.get('/stocks/stats')
@handle_errors
def get_stocks_stats(admin_user_id: str = Depends(require_admin)):
    """
    Get stocks statistics (ADMIN only)
    """
    stats = db.get_stocks_stats()

    return success_response(stats=stats)


@router.patch('/stocks/{symbol}')
@handle_errors
def update_stock(
    symbol: str,
    data: UpdateStockRequest,
    admin_user_id: str = Depends(require_admin)
):
    """
    Update stock information (ADMIN only)
    """
    # Check if stock exists
    stock = get_resource_or_404(db.get_stock_by_symbol, symbol, "Stock")

    # Update the stock
    success = db.update_stock_admin(
        symbol=symbol,
        country=data.country,
        sector_key=data.sector_key,
        industry_key=data.industry_key,
        exchange=data.exchange,
        currency=data.currency
    )

    if not success:
        raise error_response(500, 'Failed to update stock')

    # Get updated stock data
    updated_stock = db.get_stock_by_symbol(symbol)

    return success_response(
        message='Stock updated successfully',
        stock=updated_stock
    )


@router.delete('/stocks/{symbol}')
@handle_errors
def delete_stock(
    symbol: str,
    admin_user_id: str = Depends(require_admin)
):
    """
    Delete a stock (ADMIN only)
    """
    # Check if stock exists
    stock = get_resource_or_404(db.get_stock_by_symbol, symbol, "Stock")

    # Delete the stock
    success = db.delete_stock(symbol)

    if not success:
        raise error_response(500, 'Failed to delete stock')

    return success_response(
        message='Stock deleted successfully',
        symbol=symbol
    )
