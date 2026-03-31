"""
Benchmarks API endpoints
Handles benchmark-related operations
"""

from fastapi import APIRouter, Query
from functools import lru_cache

from database import db
from api.utils import handle_errors, paginated_response, success_response

# Create router
router = APIRouter()


@lru_cache(maxsize=256)
def get_benchmarks_cached(limit: int, offset: int):
    """Cached version of get_benchmarks function with pagination"""
    # Get total count of benchmarks
    total_count = db.get_benchmarks_count()

    # Get paginated benchmarks with fund counts
    benchmarks = db.get_benchmarks_with_fund_counts(limit=limit, offset=offset)

    return paginated_response(
        items=benchmarks,
        total=total_count,
        limit=limit,
        offset=offset,
        benchmarks=benchmarks
    )


@router.get('')
@handle_errors
def get_benchmarks(
    limit: int = Query(15, ge=1, le=50, description="Number of benchmarks per page"),
    offset: int = Query(0, ge=0, description="Number of benchmarks to skip")
):
    """Get all benchmarks with fund counts, sorted by fund count descending with pagination support"""
    return get_benchmarks_cached(limit, offset)


@router.get('/sitemap')
@handle_errors
def get_benchmarks_for_sitemap():
    """Get all benchmark IDs for sitemap generation"""
    ids = db.get_all_benchmark_ids()

    return success_response(
        ids=ids,
        count=len(ids)
    )

