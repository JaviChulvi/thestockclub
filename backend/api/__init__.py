"""
API Module for FundLord
This package contains all API endpoints organized by resource type.
"""

# Import all routers
from .funds import router as funds_router
from .benchmarks import router as benchmarks_router
from .categories import router as categories_router
from .chat import router as chat_router
from .auth import router as auth_router
from .admin import router as admin_router
from .health import router as health_router
from .stocks import router as stocks_router
from .data_sync import router as data_sync_router

# List of all routers to register
api_routers = [
    funds_router,
    benchmarks_router,
    categories_router,
    chat_router,
    auth_router,
    admin_router,
    health_router,
    stocks_router,
    data_sync_router
]

__all__ = ['api_routers']

