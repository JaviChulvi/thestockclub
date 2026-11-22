"""
Chat API endpoints
Handles AI agent chat functionality with conversation history
"""

import logging
from fastapi import APIRouter, Depends, Body, Request
from datetime import datetime, timedelta
from langchain_core.messages import HumanMessage, AIMessage
from typing import Optional, List
from pydantic import BaseModel

from database import db
import stock_analysis
from api.utils import (
    get_user_from_session,
    handle_errors,
    success_response,
    get_resource_or_404,
    format_datetime_iso,
    error_response
)

logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

MAX_CHAT_HISTORY = 20


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[int] = None


def get_agent(request: Request):
    """FastAPI dependency to inject the AI agent from app state"""
    return getattr(request.app.state, "agent", None)


def _load_chat_history(conversation_id: int) -> List:
    """Load recent chat history from database for LangChain context"""
    messages = db.get_conversation_messages(conversation_id)
    chat_history = []
    for msg in messages:
        if msg['message_type'] == 'user':
            chat_history.append(HumanMessage(content=msg['content']))
        else:
            chat_history.append(AIMessage(content=msg['content']))
    # Keep only the most recent messages to limit context size
    return chat_history[-MAX_CHAT_HISTORY:]


def _handle_chat_logic(
    message: str,
    user_id: int,
    agent,
    conversation_id: Optional[int] = None
) -> dict:
    """Core chat logic handling both new and existing conversations"""

    # Determine if this is a new conversation
    is_new_conversation = conversation_id is None
    db_conversation_id = None

    if is_new_conversation:
        # Create new conversation in database
        # Use first 100 characters of message as title
        title = message[:100] if len(message) <= 100 else message[:97] + "..."
        db_conversation_id = db.create_conversation(user_id, title, message)

        if not db_conversation_id:
            raise error_response(500, 'Failed to create conversation')

        # New conversation — no prior history
        chat_history = []
    else:
        # Verify conversation exists and belongs to user
        db_conversation_id = conversation_id
        conversation = db.get_conversation_by_id(db_conversation_id, user_id)

        if not conversation:
            raise error_response(404, 'Conversation not found or access denied')

        # Load prior history before persisting the current turn.
        chat_history = _load_chat_history(db_conversation_id)

        # Add user message to database
        message_id = db.add_message(db_conversation_id, message, 'user')
        if not message_id:
            raise error_response(500, 'Failed to save message')

    # Get response from agent
    if agent is None:
        agent_response = "I apologize, but the AI agent is not currently available. Please try again later."
    else:
        agent_response = agent.chat(message, chat_history)

    # Handle response - could be string or dict with artifact
    response_text = None
    artifact = None
    isin = None

    if isinstance(agent_response, dict):
        response_text = agent_response.get('response', '')
        artifact = agent_response.get('artifact')
        isin = agent_response.get('isin') or agent_response.get('ticker')
    else:
        # Simple string response
        response_text = agent_response

    # Save AI response to database with artifact and isin
    ai_message_id = db.add_message(
        db_conversation_id,
        response_text,
        'ai',
        artifact,
        isin
    )

    if not ai_message_id:
        logger.warning("Failed to save AI response to database for conversation %s", db_conversation_id)

    # Build response
    response_kwargs = {
        'response': response_text,
        'conversation_id': db_conversation_id,
        'timestamp': format_datetime_iso(datetime.now())
    }

    # Add artifact and isin if present
    if artifact is not None:
        response_kwargs['artifact'] = artifact
    if isin is not None:
        response_kwargs['isin'] = isin

    # Add is_new flag for new conversations
    if is_new_conversation:
        response_kwargs['is_new'] = True

    return success_response(**response_kwargs)


@router.post('')
@handle_errors
def chat_with_ai(
    chat_request: ChatRequest,
    user_id: Optional[str] = Depends(get_user_from_session),
    agent=Depends(get_agent)
):
    """AI chat endpoint - creates new conversation if no conversation_id provided"""
    if not user_id:
        raise error_response(401, 'Unauthorized - valid session required')

    if not chat_request.message:
        raise error_response(400, 'Message is required')

    return _handle_chat_logic(
        message=chat_request.message,
        user_id=user_id,
        agent=agent,
        conversation_id=chat_request.conversation_id
    )


@router.post('/{conversation_id}')
@handle_errors
def chat_with_conversation(
    conversation_id: int,
    message: str = Body(..., embed=True),
    user_id: Optional[str] = Depends(get_user_from_session),
    agent=Depends(get_agent)
):
    """AI chat endpoint for specific conversation (alternative route)"""
    if not user_id:
        raise error_response(401, 'Unauthorized - valid session required')

    if not message:
        raise error_response(400, 'Message is required')

    return _handle_chat_logic(
        message=message,
        user_id=user_id,
        agent=agent,
        conversation_id=conversation_id
    )


@router.get('/conversations/{conversation_id}')
@handle_errors
def get_conversation(
    conversation_id: int,
    user_id: Optional[str] = Depends(get_user_from_session)
):
    """Get conversation details with messages"""
    if not user_id:
        raise error_response(401, 'Unauthorized - valid session required')

    # Verify conversation exists and belongs to user
    conversation = get_resource_or_404(
        lambda cid: db.get_conversation_by_id(cid, user_id),
        conversation_id,
        "Conversation"
    )

    # Get messages
    messages = db.get_conversation_messages(conversation_id)

    # Format messages
    formatted_messages = [
        {
            'id': msg['message_id'],
            'type': msg['message_type'],
            'content': msg['content'],
            'artifact': msg['artifact'],
            'isin': msg['isin'],
            'timestamp': format_datetime_iso(msg['created_at'])
        }
        for msg in messages
    ]

    return success_response(
        conversation={
            'id': conversation['conversation_id'],
            'title': conversation['title'],
        },
        messages=formatted_messages
    )


@router.delete('/conversations/{conversation_id}')
@handle_errors
def delete_conversation(
    conversation_id: int,
    user_id: Optional[str] = Depends(get_user_from_session)
):
    """Delete a specific conversation"""
    if not user_id:
        raise error_response(401, 'Unauthorized - valid session required')

    # Verify conversation exists and belongs to user
    conversation = get_resource_or_404(
        lambda cid: db.get_conversation_by_id(cid, user_id),
        conversation_id,
        "Conversation"
    )

    # Delete from database (messages will be cascade deleted)
    delete_query = "DELETE FROM conversations WHERE id = %s"
    db.execute_non_query(delete_query, (conversation_id,))

    return success_response(
        message=f'Conversation {conversation_id} deleted successfully'
    )


@router.get('/conversations')
@handle_errors
def list_conversations(
    user_id: Optional[str] = Depends(get_user_from_session)
):
    """List all conversations for the authenticated user"""
    if not user_id:
        raise error_response(401, 'Unauthorized - valid session required')

    conversations_list = db.get_user_conversations(user_id)

    # Format conversations for frontend
    formatted_conversations = [
        {
            'id': conv['conversation_id'],
            'title': conv['title'],
            'message_count': conv.get('message_count', 0),
            'created_at': format_datetime_iso(conv['created_at']),
        }
        for conv in conversations_list
    ]

    return success_response(
        conversations=formatted_conversations,
        count=len(formatted_conversations)
    )


@router.get('/artifacts/top-holdings/{isin}')
@handle_errors
def get_top_holdings_artifact(
    isin: str,
    user_id: Optional[str] = Depends(get_user_from_session)
):
    """Get top holdings artifact for a fund"""
    if not user_id:
        raise error_response(401, 'Unauthorized - valid session required')

    # Get fund information
    fund_holdings = db.get_fund_holdings(isin)

    if not fund_holdings:
        raise error_response(404, 'Fund not found')

    stocks_data = []
    stock_recommendations = []
    for holding in fund_holdings:
        ticker = holding['symbol']
        stock_price_history = stock_analysis.get_stock_price_history(ticker)
        if stock_price_history is not None and not stock_price_history.empty:
            stock_price_history_data = []
            for index, row in stock_price_history.iterrows():
                stock_price_history_data.append({
                    'date': index,
                    'close_price': row['close_price']
                })
            stocks_data.append({
                'ticker': ticker,
                'stock_price_history': stock_price_history_data
            })

    for holding in fund_holdings:
        ticker = holding['symbol']
        rec_data = stock_analysis.get_stock_recommendations(ticker)
        if rec_data:
            formatted_data = stock_analysis.format_stock_recommendations(rec_data)
            if formatted_data:
                stock_recommendations.append(formatted_data)
    stock_recommendations = stock_analysis.aggregate_fund_recommendations(stock_recommendations)

    return {
        'stocks_data': stocks_data,
        'stock_recommendations': stock_recommendations
    }


@router.get('/artifacts/fund-info/{isin}')
@handle_errors
def get_fund_info_artifact(
    isin: str,
    user_id: Optional[str] = Depends(get_user_from_session)
):
    """Get fund info artifact for a fund"""
    if not user_id:
        raise error_response(401, 'Unauthorized - valid session required')

    fund_info = get_resource_or_404(db.get_fund_by_isin, isin, "Fund")

    del fund_info['holdings']

    price_history = db.get_price_history(isin, start_date=datetime.now() - timedelta(days=365), end_date=datetime.now())

    if not price_history:
        raise error_response(404, 'Price history not found')

    return {
        'fund_info': fund_info,
        'price_history': price_history
    }


@router.get('/artifacts/stock-info/{ticker}')
@handle_errors
def get_stock_info_artifact(
    ticker: str,
    user_id: Optional[str] = Depends(get_user_from_session)
):
    """Get stock info artifact for a stock"""
    if not user_id:
        raise error_response(401, 'Unauthorized - valid session required')

    stock_info = get_resource_or_404(db.get_stock_by_symbol, ticker, "Stock")

    price_history = db.get_stock_price_history(ticker, start_date=(datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d'), end_date=datetime.now().strftime('%Y-%m-%d'))

    if not price_history:
        raise error_response(404, 'Price history not found')

    return {
        'stock_info': stock_info,
        'price_history': price_history
    }