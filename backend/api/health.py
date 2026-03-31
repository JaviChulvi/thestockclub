"""
Health check and monitoring endpoints
Provides system status and health information
"""

from fastapi import APIRouter
from datetime import datetime

from api.utils import format_datetime_iso

# Create router
router = APIRouter()

# Agent availability will be set from main app
agent_available = False


def set_agent_status(available):
    """Set the agent availability status"""
    global agent_available
    agent_available = available


@router.get('/health')
def health_check():
    """Health check endpoint"""
    return {
        'status': 'healthy',
        'message': 'The Stock Club API is running',
        'agent_available': agent_available,
        'timestamp': format_datetime_iso(datetime.now())
    }


@router.get('/status')
def status():
    """Detailed status endpoint"""
    return {
        'status': 'operational',
        'services': {
            'api': 'healthy',
            'database': 'connected',
            'ai_agent': 'available' if agent_available else 'unavailable'
        },
        'version': '1.0.0',
        'timestamp': format_datetime_iso(datetime.now())
    }

