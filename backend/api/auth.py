"""
Authentication API endpoints
Handles user authentication, login, logout, and session management
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr, validator
import bcrypt
import secrets
import re
import html
import time
from typing import Optional

from database import db
from api.utils import (
    get_user_from_session,
    handle_errors,
    success_response,
    format_datetime_iso,
    error_response,
    get_resource_or_404
)

# Create router
router = APIRouter()

# Constants
SESSION_DURATION_DAYS = 7  # Reduced from 30 to 7 days for better security
PASSWORD_MIN_LENGTH = 10  # Increased from 8 to 10
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15
RATE_LIMIT_WINDOW_SECONDS = 60
MAX_REQUESTS_PER_WINDOW = 10

# In-memory rate limiting (in production, use Redis)
rate_limit_storage = {}
login_attempts_storage = {}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    password: str
    confirmPassword: str

    @validator('firstName', 'lastName')
    def validate_names(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters long')
        return v.strip()

    @validator('password')
    def validate_password(cls, v):
        if len(v) < PASSWORD_MIN_LENGTH:
            raise ValueError(f'Password must be at least {PASSWORD_MIN_LENGTH} characters long')

        # Check for at least one uppercase, one lowercase, one number, and one special character
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')

        return v

    @validator('confirmPassword')
    def validate_confirm_password(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v


def sanitize_input(text: str) -> str:
    """Sanitize user input to prevent XSS attacks"""
    if not text:
        return text
    # HTML escape and limit length
    sanitized = html.escape(text.strip())
    return sanitized[:100]  # Limit name length


def check_rate_limit(identifier: str) -> tuple[bool, str]:
    """Check if request is within rate limit"""
    current_time = time.time()

    # Clean up old entries
    expired_keys = [k for k, v in rate_limit_storage.items()
                   if current_time - v['timestamp'] > RATE_LIMIT_WINDOW_SECONDS]
    for key in expired_keys:
        del rate_limit_storage[key]

    if identifier in rate_limit_storage:
        data = rate_limit_storage[identifier]
        if current_time - data['timestamp'] < RATE_LIMIT_WINDOW_SECONDS:
            if data['count'] >= MAX_REQUESTS_PER_WINDOW:
                return False, 'Too many requests. Please try again later.'
            data['count'] += 1
        else:
            rate_limit_storage[identifier] = {'count': 1, 'timestamp': current_time}
    else:
        rate_limit_storage[identifier] = {'count': 1, 'timestamp': current_time}

    return True, ''


def check_account_lockout(email: str) -> tuple[bool, str]:
    """Check if account is locked due to failed login attempts"""
    current_time = time.time()

    if email in login_attempts_storage:
        data = login_attempts_storage[email]

        # Check if lockout period has expired
        if current_time - data['timestamp'] > LOCKOUT_DURATION_MINUTES * 60:
            del login_attempts_storage[email]
            return True, ''

        if data['attempts'] >= MAX_LOGIN_ATTEMPTS:
            remaining_time = int(LOCKOUT_DURATION_MINUTES - (current_time - data['timestamp']) / 60)
            return False, f'Account temporarily locked. Try again in {remaining_time} minutes.'

    return True, ''


def record_failed_login(email: str):
    """Record a failed login attempt"""
    current_time = time.time()

    if email in login_attempts_storage:
        data = login_attempts_storage[email]
        if current_time - data['timestamp'] > LOCKOUT_DURATION_MINUTES * 60:
            login_attempts_storage[email] = {'attempts': 1, 'timestamp': current_time}
        else:
            data['attempts'] += 1
    else:
        login_attempts_storage[email] = {'attempts': 1, 'timestamp': current_time}


def clear_failed_login(email: str):
    """Clear failed login attempts after successful login"""
    if email in login_attempts_storage:
        del login_attempts_storage[email]


def validate_email(email: str) -> bool:
    """Validate email format"""
    if not email or len(email) > 255:
        return False

    # Basic email regex
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


@router.post('/login')
@handle_errors
def login(login_data: LoginRequest):
    """User login endpoint"""
    email = login_data.email.lower()
    password = login_data.password

    # Rate limiting check
    allowed, message = check_rate_limit(f"login:{email}")
    if not allowed:
        raise HTTPException(status_code=429, detail=message)

    # Account lockout check
    allowed, message = check_account_lockout(email)
    if not allowed:
        raise HTTPException(status_code=423, detail=message)

    # Get user from database
    user = db.get_user_by_email(email)
    if not user:
        record_failed_login(email)
        raise HTTPException(status_code=401, detail='Invalid email or password')

    # Verify password
    if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
        record_failed_login(email)
        raise HTTPException(status_code=401, detail='Invalid email or password')

    if not user.get('is_active'):
        raise HTTPException(status_code=401, detail='Invalid email or password')

    # Clear failed login attempts
    clear_failed_login(email)

    # Generate session token
    session_token = secrets.token_urlsafe(32)

    # Calculate expiration
    expires_at = datetime.now() + timedelta(days=SESSION_DURATION_DAYS)

    # Save session to database
    session_id = db.create_session(user['id'], session_token, expires_at)
    if not session_id:
        raise HTTPException(status_code=500, detail='Failed to create session')

    return success_response(
        message='Login successful',
        user={
            'id': user['id'],
            'firstName': user['first_name'],
            'lastName': user['last_name'],
            'email': user['email'],
            'ai_enabled': user['ai_enabled'],
            'role': user.get('role', 'USER')
        },
        sessionToken=session_token,
        expiresAt=format_datetime_iso(expires_at)
    )

@router.post('/logout')
@handle_errors
def logout(authorization: str = Header(None)):
    """User logout endpoint"""
    if not authorization:
        raise error_response(401, 'Unauthorized')

    # Remove 'Bearer ' prefix if present
    if authorization.startswith('Bearer '):
        authorization = authorization[7:]
    session = db.get_session_by_token(authorization)
    if not session:
        raise error_response(401, 'Unauthorized')
    user_id = session.get('user_id')

    # Delete all sessions for user (logout from all devices)
    db.delete_user_sessions(user_id)

    return success_response(message='Logout successful')


@router.post('/register')
@handle_errors
def register(register_data: RegisterRequest):
    """User registration endpoint"""
    # Rate limiting check
    allowed, message = check_rate_limit(f"register:{register_data.email}")
    if not allowed:
        raise HTTPException(status_code=429, detail=message)

    first_name = sanitize_input(register_data.firstName)
    last_name = sanitize_input(register_data.lastName)
    email = register_data.email.lower()
    password = register_data.password

    # Validate email format
    if not validate_email(email):
        raise HTTPException(status_code=400, detail='Invalid email format')

    # Check if user already exists
    existing_user = db.get_user_by_email(email)
    if existing_user:
        raise HTTPException(status_code=409, detail='User with this email already exists')

    # Hash password
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    # Create user
    user_id = db.create_user(first_name, last_name, email, password_hash)
    if not user_id:
        raise HTTPException(status_code=500, detail='Failed to create user')

    # Generate session token
    session_token = secrets.token_urlsafe(32)
    expires_at = datetime.now() + timedelta(days=SESSION_DURATION_DAYS)

    # Create session
    session_id = db.create_session(user_id, session_token, expires_at)
    if not session_id:
        raise HTTPException(status_code=500, detail='Failed to create session')

    return success_response(
        message='Registration successful',
        user={
            'id': user_id,
            'firstName': first_name,
            'lastName': last_name,
            'email': email,
            'role': 'USER'
        },
        sessionToken=session_token,
        expiresAt=format_datetime_iso(expires_at)
    )


@router.get('/verify')
@handle_errors
def verify_token(user_id: Optional[str] = Depends(get_user_from_session)):
    """Verify session token and return user info"""
    if not user_id:
        raise error_response(401, 'Invalid or expired session')

    # Get user from database
    user = get_resource_or_404(db.get_user_by_id, user_id, "User")

    return success_response(
        user={
            'id': user['id'],
            'firstName': user['first_name'],
            'lastName': user['last_name'],
            'email': user['email'],
            'role': user.get('role', 'USER')
        }
    )


@router.get('/me')
@handle_errors
def get_current_user(user_id: Optional[str] = Depends(get_user_from_session)):
    """Get current user information"""
    if not user_id:
        raise error_response(401, 'Unauthorized')

    # Get user from database
    user = get_resource_or_404(db.get_user_by_id, user_id, "User")

    return success_response(
        user={
            'id': user['id'],
            'firstName': user['first_name'],
            'lastName': user['last_name'],
            'email': user['email'],
            'ai_enabled': user['ai_enabled'],
            'role': user.get('role', 'USER')
        }
    )
