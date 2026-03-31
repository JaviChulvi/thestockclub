"""
Categories API endpoints
Handles all category-related operations including retrieval and fund listings by category
"""

from fastapi import APIRouter, Query
from functools import lru_cache

from database import db
from api.funds import format_fund_data
from api.utils import handle_errors, success_response, paginated_response, get_resource_or_404

# Create router
router = APIRouter()


@lru_cache(maxsize=1)
def _get_all_categories_cached():
    """Cached version of get all categories function"""
    categories = db.get_categories_with_fund_counts()

    if not categories:
        return success_response(count=0, categories=[])

    # Format categories for frontend
    formatted_categories = [
        {
            'id': cat['id'],
            'name': cat['name'],
            'fullname': cat['fullname'] or cat['name'],
            'fund_count': cat['fund_count']
        }
        for cat in categories
    ]

    return success_response(
        count=len(formatted_categories),
        categories=formatted_categories
    )


@router.get('/')
@handle_errors
def get_all_categories():
    """Get all categories with fund counts"""
    return _get_all_categories_cached()


@lru_cache(maxsize=512)
def _get_funds_by_category_cached(category_id: int, limit: int, offset: int):
    """Cached version of get_funds_by_category function with pagination"""
    category = get_resource_or_404(db.get_category_by_id, category_id, "Category")

    # Get total count of funds for this category
    total_count = db.get_funds_count_by_category(category_id)

    # Get paginated funds for the category with historical data
    funds = db.get_funds_by_category_with_history(category_id, count=limit, offset=offset)

    if not funds and offset == 0:
        return paginated_response(
            items=[],
            total=0,
            limit=limit,
            offset=offset,
            funds=[],
            category={
                'id': category['id'],
                'name': category['name'],
                'fullname': category['fullname'] or category['name'],
                'description': category.get('description'),
                'fund_count': 0
            }
        )

    # Format the funds data for the frontend using helper function
    formatted_funds = [format_fund_data(fund) for fund in funds]

    return paginated_response(
        items=formatted_funds,
        total=total_count,
        limit=limit,
        offset=offset,
        funds=formatted_funds,
        category={
            'id': category['id'],
            'name': category['name'],
            'fullname': category['fullname'] or category['name'],
            'description': category.get('description'),
            'fund_count': total_count
        }
    )


@router.get('/{category_id}/funds')
@handle_errors
def get_funds_by_category(
    category_id: int,
    limit: int = Query(12, ge=1, le=50, description="Number of funds per page"),
    offset: int = Query(0, ge=0, description="Number of funds to skip")
):
    """Get funds for a specific category with historical data and pagination support"""
    return _get_funds_by_category_cached(category_id, limit, offset)

