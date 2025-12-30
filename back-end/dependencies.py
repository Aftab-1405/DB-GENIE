"""
FastAPI Dependencies

Centralized dependency injection for authentication, database config, and Redis.
These replace Flask's global session and g object patterns.
"""

import json
import logging
from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger(__name__)

# Optional bearer token authentication
security = HTTPBearer(auto_error=False)


async def get_redis():
    """Get Redis client from application state."""
    from main import get_redis_client
    return get_redis_client()


async def get_session_data(request: Request) -> Optional[dict]:
    """
    Get session data from Redis using session cookie.
    
    Returns:
        Session data dict or None if no valid session
    """
    redis_client = await get_redis()
    if not redis_client:
        return None
    
    session_id = request.cookies.get("session_id")
    if not session_id:
        return None
    
    try:
        session_data = await redis_client.get(f"session:{session_id}")
        if session_data:
            return json.loads(session_data)
    except Exception as e:
        logger.warning(f"Error reading session from Redis: {e}")
    
    return None


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Verify Firebase ID token for authenticated requests.
    
    Supports two auth methods (for backward compatibility during migration):
    1. Authorization: Bearer <firebase_id_token> (preferred, stateless)
    2. Redis session (legacy, for gradual migration)
    
    Returns:
        User dict with uid, email, name, verified flag
        
    Raises:
        HTTPException 401 if not authenticated
    """
    # Method 1: Check Authorization header for Firebase ID token
    if credentials:
        token = credentials.credentials
        try:
            from firebase_admin import auth
            # Verify token cryptographically with Firebase
            decoded_token = auth.verify_id_token(token)
            user = {
                'uid': decoded_token['uid'],
                'email': decoded_token.get('email'),
                'name': decoded_token.get('name'),
                'picture': decoded_token.get('picture'),
                'verified': True  # Token was verified
            }
            # Store in request state for later use
            request.state.user = user
            logger.debug(f'Token verified for user: {user["uid"]}')
            return user
        except Exception as e:
            logger.warning(f'Token verification failed: {e}')
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='Invalid or expired token'
            )
    
    # Method 2: Fallback to Redis session (legacy support)
    session_data = await get_session_data(request)
    if session_data and 'user' in session_data:
        user = session_data['user']
        user['verified'] = False  # Session-based, not token-verified
        request.state.user = user
        logger.debug(f'Session auth for user: {user}')
        return user
    
    # No valid auth found
    logger.debug('No valid authentication found')
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail='Authentication required'
    )


async def get_current_user_optional(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Optional[dict]:
    """
    Like get_current_user but returns None instead of raising exception.
    Useful for routes that work with or without authentication.
    """
    try:
        return await get_current_user(request, credentials)
    except HTTPException:
        return None


async def get_db_config(request: Request) -> Optional[dict]:
    """
    Get database configuration from request state or Redis session.
    
    The db_config is set either:
    1. Directly in request.state by a prior middleware/dependency
    2. From Redis session storage
    
    Returns:
        Database configuration dict or None if not configured
    """
    # Check request state first (set by connect_db endpoint)
    if hasattr(request.state, 'db_config') and request.state.db_config:
        return request.state.db_config
    
    # Fall back to session
    session_data = await get_session_data(request)
    if session_data and 'db_config' in session_data:
        db_config = session_data['db_config']
        # Cache in request state for this request
        request.state.db_config = db_config
        return db_config
    
    return None


async def require_db_config(
    db_config: Optional[dict] = Depends(get_db_config)
) -> dict:
    """
    Like get_db_config but raises exception if not configured.
    Use for routes that require a database connection.
    """
    if not db_config:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='No database configured. Please connect to a database first.'
        )
    return db_config


async def get_conversation_id(request: Request) -> Optional[str]:
    """Get conversation ID from session."""
    session_data = await get_session_data(request)
    if session_data:
        return session_data.get('conversation_id')
    return None


# Session management utilities

async def set_session_data(
    request: Request,
    data: dict,
    session_id: str = None,
    expire_seconds: int = 86400  # 24 hours default
) -> str:
    """
    Store session data in Redis.
    
    Args:
        request: FastAPI request
        data: Session data to store
        session_id: Optional session ID (generates new if not provided)
        expire_seconds: Session expiry in seconds
        
    Returns:
        Session ID
    """
    import uuid
    redis_client = await get_redis()
    
    if not redis_client:
        logger.warning("Redis not available, session not stored")
        return session_id or str(uuid.uuid4())
    
    if not session_id:
        session_id = str(uuid.uuid4())
    
    await redis_client.set(
        f"session:{session_id}",
        json.dumps(data),
        ex=expire_seconds
    )
    
    return session_id


async def update_session_data(
    request: Request,
    updates: dict,
    expire_seconds: int = 86400
) -> bool:
    """
    Update existing session data in Redis.
    
    Args:
        request: FastAPI request
        updates: Dict of fields to update
        expire_seconds: Reset expiry to this value
        
    Returns:
        True if updated, False if no session exists
    """
    session_id = request.cookies.get("session_id")
    if not session_id:
        return False
    
    session_data = await get_session_data(request)
    if not session_data:
        return False
    
    # Merge updates
    session_data.update(updates)
    
    redis_client = await get_redis()
    if redis_client:
        await redis_client.set(
            f"session:{session_id}",
            json.dumps(session_data),
            ex=expire_seconds
        )
        return True
    
    return False


async def clear_session(request: Request) -> bool:
    """
    Clear session data from Redis.
    
    Returns:
        True if cleared, False if no session existed
    """
    session_id = request.cookies.get("session_id")
    if not session_id:
        return False
    
    redis_client = await get_redis()
    if redis_client:
        await redis_client.delete(f"session:{session_id}")
        return True
    
    return False
