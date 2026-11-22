"""
FundLord API - FastAPI Application
Entry point for the FastAPI application with all API endpoints
"""

import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import db
from agent import AiAgent
from api import api_routers
from util import is_production


def get_cors_origins():
    """Get CORS origins based on environment"""
    if is_production():
        # Production origins
        return [
            "https://thestock.club",
            "https://www.thestock.club",
            "http://localhost:3000",  # For local development
            "http://127.0.0.1:3000",  # For local development
        ]
    else:
        # Development - allow localhost and common dev ports
        return [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
            "http://localhost:8080",  # If accessing API directly
        ]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for FastAPI application
    Handles startup and shutdown events
    """
    # Startup: Initialize database and AI agent
    print("\n🚀 Initializing FundLord API...")

    # Initialize database
    try:
        if db.initialize_database():
            print("✓ Database initialized successfully")
        else:
            print("✗ Warning: Database initialization failed")
    except Exception as e:
        print(f"✗ Warning: Database initialization failed: {e}")

    # Initialize AI agent and store on app state for dependency injection
    try:
        print("Initializing AI Agent...")
        agent = AiAgent()
        app.state.agent = agent
        print("✓ AI Agent initialized successfully")
    except Exception as e:
        print(f"✗ Warning: AI Agent initialization failed: {e}")
        print("  API will run without AI agent functionality")
        app.state.agent = None

    print("✓ FundLord API ready!\n")

    # Yield control to the application
    yield

    # Shutdown: Cleanup resources if needed
    print("\n🛑 Shutting down FundLord API...")
    # Add any cleanup code here if needed


def create_app():
    """Create FastAPI application with lifespan management"""
    app = FastAPI(
        title="FundLord API",
        description="Financial Intelligence API for FundLord",
        version="1.0.0",
        lifespan=lifespan
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_cors_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Define router configurations in the same order as api_routers
    router_configs = [
        {'prefix': '/api/funds', 'tags': ['funds']},      # funds router
        {'prefix': '/api/benchmarks', 'tags': ['benchmarks']},  # benchmarks router
        {'prefix': '/api/categories', 'tags': ['categories']},  # categories router
        {'prefix': '/api/chat', 'tags': ['chat']},        # chat router
        {'prefix': '/api/auth', 'tags': ['auth']},        # auth router
        {'prefix': '/api/admin', 'tags': ['admin']},      # admin router
        {'prefix': '/api/health', 'tags': ['health']},    # health router
        {'prefix': '/api/stock', 'tags': ['stocks']},     # stocks router
        {'prefix': '/api/data-sync', 'tags': ['data-sync']},  # data sync router
    ]

    # Register all routers with their configurations
    for i, router in enumerate(api_routers):
        if i < len(router_configs):
            config = router_configs[i]
            app.include_router(router, prefix=config['prefix'], tags=config['tags'])
        else:
            # Fallback for any additional routers
            app.include_router(router, prefix='/api', tags=['api'])

    return app


# Create the FastAPI app - this will be imported by uvicorn
app = create_app()


if __name__ == '__main__':
    import uvicorn

    # Print startup banner
    print("\n" + "="*60)
    if is_production():
        print("🚀 FundLord FastAPI Server Starting (PRODUCTION MODE)")
        print("   Configuration: SSL enabled, reload disabled, port 443")
    else:
        print("🚀 FundLord FastAPI Server Starting (DEVELOPMENT MODE)")
        print("   Configuration: No SSL, reload enabled, port 8080")
    print("="*60 + "\n")

    # Configure uvicorn based on environment
    uvicorn_config = {
        "app": "main:app",
        "host": "0.0.0.0",
        "access_log": True,
    }

    if is_production():
        # Production configuration
        uvicorn_config.update({
            "port": 443,  # HTTPS port
            "reload": False,  # Disable reload in production
            "ssl_keyfile": "/etc/ssl/private/fundlord.key",  # SSL certificate paths
            "ssl_certfile": "/etc/ssl/certs/fundlord.crt",
        })
    else:
        # Development configuration
        uvicorn_config.update({
            "port": 8080,  # Standard dev port
            "reload": True,  # Enable reload for development
        })

    # Run with configuration
    try:
        uvicorn.run(**uvicorn_config)
    except Exception as e:
        if is_production():
            print(f"⚠️  HTTPS server failed, falling back to HTTP on port 80: {e}")
            # Fallback to HTTP if SSL fails
            uvicorn.run(
                "main:app",
                host="0.0.0.0",
                port=80,
                reload=False,
                access_log=True
            )
        else:
            raise
