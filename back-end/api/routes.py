# File: api/routes.py
"""API routes for the application - FastAPI Router.

This file contains ONLY HTTP route handlers.
All business logic is delegated to service classes.
"""

import logging
from typing import Optional
from fastapi import APIRouter, Request, Response, Depends, HTTPException, status
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.concurrency import run_in_threadpool

from dependencies import (
    get_current_user,
    get_db_config,
    require_db_config,
    get_session_data,
    update_session_data,
    get_conversation_id,
)
from services.conversation_service import ConversationService
from services.database_service import DatabaseService
from database import connection_handlers
from api.request_schemas import (
    ChatRequest, RunQueryRequest, ConnectDBRequest,
    SelectSchemaRequest, GetTableSchemaRequest, SwitchDatabaseRequest
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["api"])


# =============================================================================
# HEALTH CHECK ROUTES
# =============================================================================

@router.get('/')
async def landing():
    """API health check."""
    return {'status': 'success', 'message': 'API is running'}


@router.get('/index')
async def index(user: dict = Depends(get_current_user)):
    """Authenticated health check."""
    return {'status': 'success', 'message': 'Authenticated'}


# =============================================================================
# CONVERSATION ROUTES
# =============================================================================

@router.post('/pass_user_prompt_to_llm')
async def pass_user_prompt_to_llm(
    request: Request,
    data: ChatRequest,
    user: dict = Depends(get_current_user),
    db_config: Optional[dict] = Depends(get_db_config)
):
    """Handle user input and stream AI response."""
    prompt = data.prompt
    enable_reasoning = data.enable_reasoning
    reasoning_effort = data.reasoning_effort
    response_style = data.response_style
    max_rows = data.max_rows
    
    conversation_id = ConversationService.create_or_get_conversation_id(data.conversation_id)
    user_id = user.get('uid') or user
    
    logger.debug(f'Received prompt for conversation: {conversation_id}')
    
    try:
        async def async_generator():
            generator = await run_in_threadpool(
                ConversationService.create_streaming_generator,
                conversation_id, prompt, user_id,
                db_config=db_config,
                enable_reasoning=enable_reasoning,
                reasoning_effort=reasoning_effort,
                response_style=response_style,
                max_rows=max_rows
            )
            for chunk in generator:
                yield chunk
        
        headers = ConversationService.get_streaming_headers(conversation_id)
        return StreamingResponse(
            async_generator(),
            media_type='text/plain',
            headers=headers
        )
    except Exception as e:
        logger.error(f'Error initializing chat: {e}')
        if ConversationService.check_quota_error(str(e)):
            raise HTTPException(status_code=429, detail='Rate limit exceeded')
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/get_conversation/{conversation_id}')
async def get_conversation(
    conversation_id: str,
    user: dict = Depends(get_current_user)
):
    """Get messages for a conversation."""
    try:
        conv_data = await run_in_threadpool(
            ConversationService.get_conversation_data,
            conversation_id
        )
        if conv_data:
            return {'status': 'success', 'conversation': conv_data}
        raise HTTPException(status_code=404, detail='Conversation not found')
    except HTTPException:
        raise
    except Exception as e:
        logger.exception('Error fetching conversation')
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/get_conversations')
async def get_conversations(user: dict = Depends(get_current_user)):
    """Get all conversations for logged-in user."""
    user_id = user.get('uid') or user
    conversations = await run_in_threadpool(
        ConversationService.get_user_conversations,
        user_id
    )
    return {'status': 'success', 'conversations': conversations}


@router.post('/new_conversation')
async def new_conversation(user: dict = Depends(get_current_user)):
    """Create a new conversation."""
    conversation_id = ConversationService.create_or_get_conversation_id()
    return {'status': 'success', 'conversation_id': conversation_id}


@router.delete('/delete_conversation/{conversation_id}')
async def delete_conversation(
    conversation_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete a conversation."""
    try:
        user_id = user.get('uid') or user
        await run_in_threadpool(
            ConversationService.delete_user_conversation,
            conversation_id, user_id
        )
        return {'status': 'success'}
    except Exception as e:
        logger.error(f'Error deleting conversation: {e}')
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# DATABASE CONNECTION ROUTES
# =============================================================================

@router.post('/connect_db')
async def connect_db(
    request: Request,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Connect to a database (local or remote)."""
    user_id = user.get('uid') or user
    
    logger.info(f"Connect request data: {data}")
    
    db_type = data.get('db_type')
    if not db_type:
        raise HTTPException(
            status_code=400,
            detail="'db_type' is required. Must be one of: mysql, postgresql, sqlite"
        )
    is_remote = data.get('is_remote', False)
    connection_string = data.get('connection_string')
    
    # If connection_string is provided, use remote connection
    if connection_string:
        # Remote connection via connection string
        if db_type == 'postgresql':
            result = await run_in_threadpool(
                connection_handlers.connect_remote_postgresql,
                connection_string, user_id
            )
        elif db_type == 'mysql':
            result = await run_in_threadpool(
                connection_handlers.connect_remote_mysql,
                connection_string, user_id
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f'Remote {db_type} not supported'
            )
    else:
        # Local connection
        host = data.get('host')
        port = data.get('port')
        username = data.get('username') or data.get('user')
        password = data.get('password')
        database = data.get('database') or data.get('db_name')
        
        if db_type == 'sqlite':
            result = await run_in_threadpool(
                connection_handlers.connect_local_sqlite,
                database, user_id
            )
        elif db_type == 'mysql':
            result = await run_in_threadpool(
                connection_handlers.connect_local_mysql,
                host, port, username, password,
                database, user_id
            )
        elif db_type == 'postgresql':
            result = await run_in_threadpool(
                connection_handlers.connect_local_postgresql,
                host, port, username, password,
                database, user_id
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f'{db_type} local connection not implemented'
            )
    
    # Store db_config in session if connection successful
    if result.get('status') in ['connected', 'success'] and 'db_config' in result:
        await update_session_data(request, {'db_config': result['db_config']})
    
    if result.get('status') == 'error':
        logger.error(f"Connection failed: {result.get('message')}")
        raise HTTPException(status_code=400, detail=result.get('message'))
    
    return result


@router.post('/disconnect_db')
async def disconnect_db(
    request: Request,
    db_config: Optional[dict] = Depends(get_db_config),
    user: dict = Depends(get_current_user)
):
    """Disconnect from the current database."""
    user_id = user.get('uid') or user
    
    result = await run_in_threadpool(
        DatabaseService.disconnect,
        db_config, user_id
    )
    
    # Clear db_config from session
    await update_session_data(request, {'db_config': None})
    
    if result.get('status') == 'error':
        raise HTTPException(status_code=500, detail=result.get('message'))
    return result


@router.get('/db_status')
async def db_status(db_config: Optional[dict] = Depends(get_db_config)):
    """Get current database connection status.
    
    Returns all state needed by frontend DatabaseContext:
    - connected: boolean connection status
    - current_database: currently selected database name
    - db_type: database type (mysql, postgresql, sqlite)
    - is_remote: whether using connection string
    - databases: list of available databases for switching
    """
    if not db_config:
        return {'status': 'disconnected', 'connected': False}
    
    # Fetch available databases for the switcher chip
    databases = []
    try:
        result = await run_in_threadpool(DatabaseService.get_databases, db_config)
        if result.get('status') == 'success':
            databases = result.get('databases', [])
    except Exception as e:
        logger.warning(f"Failed to fetch databases for status: {e}")
    
    return {
        'status': 'connected',
        'connected': True,
        'db_type': db_config.get('db_type'),
        'current_database': db_config.get('database'),  # Use consistent key name
        'is_remote': db_config.get('is_remote', False),
        'databases': databases,  # Include available databases for switcher
    }


@router.get('/db_heartbeat')
async def db_heartbeat(db_config: Optional[dict] = Depends(get_db_config)):
    """Lightweight database connection health check."""
    if not db_config:
        return {'status': 'error', 'connected': False}
    
    try:
        from database.connection_manager import get_connection_manager
        from database.adapters import get_adapter
        
        manager = get_connection_manager()
        adapter = get_adapter(db_config.get('db_type', 'mysql'))
        
        conn = await run_in_threadpool(manager.get_connection, db_config)
        is_valid = await run_in_threadpool(adapter.validate_connection, conn)
        
        return {'status': 'success', 'connected': is_valid}
    except Exception:
        return {'status': 'error', 'connected': False}


@router.get('/get_databases')
async def get_databases_route(db_config: Optional[dict] = Depends(get_db_config)):
    """Get list of available databases."""
    result = await run_in_threadpool(DatabaseService.get_databases, db_config)
    return result


@router.post('/switch_remote_database')
async def switch_remote_database(
    request: Request,
    data: SwitchDatabaseRequest,
    db_config: dict = Depends(require_db_config),
    user: dict = Depends(get_current_user)
):
    """Switch to a different database on remote server."""
    user_id = user.get('uid') or user
    
    result = await run_in_threadpool(
        DatabaseService.switch_remote_database,
        db_config, data.database, user_id
    )
    
    # Update session with new db_config
    if result.get('status') == 'success' and 'db_config' in result:
        await update_session_data(request, {'db_config': result['db_config']})
    
    if result.get('status') == 'error':
        raise HTTPException(status_code=400, detail=result.get('message'))
    return result


@router.post('/select_database')
async def select_database(
    request: Request,
    data: SwitchDatabaseRequest,
    db_config: dict = Depends(require_db_config),
    user: dict = Depends(get_current_user)
):
    """Select a database on existing connection."""
    user_id = user.get('uid') or user
    
    result = await run_in_threadpool(
        connection_handlers.select_database,
        db_config, data.database, user_id
    )
    
    if result.get('status') in ['connected', 'success'] and 'db_config' in result:
        await update_session_data(request, {'db_config': result['db_config']})
    
    if result.get('status') == 'error':
        raise HTTPException(status_code=400, detail=result.get('message'))
    return result


# =============================================================================
# SCHEMA ROUTES
# =============================================================================

@router.get('/get_schemas')
async def get_schemas(db_config: dict = Depends(require_db_config)):
    """Get all schemas in connected PostgreSQL database."""
    result = await run_in_threadpool(DatabaseService.get_schemas, db_config)
    
    if result.get('status') == 'error':
        raise HTTPException(status_code=400, detail=result.get('message'))
    return result


@router.post('/select_schema')
async def select_schema(
    request: Request,
    data: SelectSchemaRequest,
    db_config: dict = Depends(require_db_config),
    user: dict = Depends(get_current_user)
):
    """Select a PostgreSQL schema."""
    user_id = user.get('uid') or user
    
    result = await run_in_threadpool(
        DatabaseService.select_schema,
        db_config, data.schema_name, user_id
    )
    
    # Update session with new db_config containing schema
    if result.get('status') == 'success' and 'db_config' in result:
        await update_session_data(request, {'db_config': result['db_config']})
    
    if result.get('status') == 'error':
        raise HTTPException(status_code=400, detail=result.get('message'))
    return result


# =============================================================================
# TABLE ROUTES
# =============================================================================

@router.get('/get_tables')
async def get_tables(db_config: dict = Depends(require_db_config)):
    """Get all tables in the current database/schema."""
    result = await run_in_threadpool(DatabaseService.get_tables, db_config)
    
    if result.get('status') == 'error':
        raise HTTPException(status_code=400, detail=result.get('message'))
    return result


@router.post('/get_table_schema')
async def get_table_schema_route(
    data: GetTableSchemaRequest,
    db_config: dict = Depends(require_db_config)
):
    """Get schema information for a specific table."""
    result = await run_in_threadpool(
        DatabaseService.get_table_info,
        db_config, data.table_name
    )
    
    if result.get('status') == 'error':
        raise HTTPException(status_code=400, detail=result.get('message'))
    return result


# =============================================================================
# QUERY ROUTES
# =============================================================================

@router.post('/run_sql_query')
async def run_sql_query(
    data: RunQueryRequest,
    db_config: dict = Depends(require_db_config),
    user: dict = Depends(get_current_user)
):
    """Execute a SQL query."""
    from config import Config
    
    user_id = user.get('uid') or user
    sql_query = data.sql_query
    max_rows = data.max_rows or Config.MAX_QUERY_RESULTS
    timeout = data.timeout
    
    result = await run_in_threadpool(
        DatabaseService.execute_query,
        db_config, sql_query, user_id,
        max_rows=max_rows, timeout=timeout
    )
    return result


# =============================================================================
# USER CONTEXT ROUTES
# =============================================================================

@router.get('/user/context')
async def get_user_context(user: dict = Depends(get_current_user)):
    """Get full user context including connection state and cached schemas."""
    from services.context_service import ContextService
    
    user_id = user.get('uid') or user
    context = await run_in_threadpool(ContextService.get_full_context, user_id)
    
    # Convert schemas dict to array for frontend
    schemas_dict = context.get('schemas', {})
    schemas_list = []
    for db_name, schema_data in schemas_dict.items():
        schemas_list.append({
            'database': db_name,
            'tables': schema_data.get('tables', []),
            'columns': schema_data.get('columns', {}),
            'cached_at': schema_data.get('cached_at')
        })
    
    return {
        'status': 'success',
        'connection': context.get('connection', {'connected': False}),
        'schemas': schemas_list,
        'recent_queries': context.get('recent_queries', [])
    }


@router.post('/user/context/refresh')
async def refresh_user_context(
    db_config: dict = Depends(require_db_config),
    user: dict = Depends(get_current_user)
):
    """Refresh schema cache for current database."""
    from services.context_service import ContextService
    from database.operations import DatabaseOperations
    
    user_id = user.get('uid') or user
    database = db_config.get('database')
    
    # Get fresh schema data
    tables_result = await run_in_threadpool(DatabaseOperations.get_tables, db_config)
    tables = tables_result.get('tables', [])
    
    # Get columns for each table
    columns = {}
    for table in tables:
        schema_result = await run_in_threadpool(
            DatabaseOperations.get_table_schema, 
            db_config, table
        )
        if schema_result.get('status') == 'success':
            columns[table] = schema_result.get('columns', [])
    
    # Cache the schema
    await run_in_threadpool(
        ContextService.cache_schema,
        user_id, database, tables, columns
    )
    
    return {'status': 'success', 'tables': len(tables)}


# =============================================================================
# USER SETTINGS ROUTES
# =============================================================================

@router.get('/user/settings')
async def get_user_settings(
    user: dict = Depends(get_current_user),
    session: dict = Depends(get_session_data)
):
    """Get user settings from session."""
    return {
        'connectionPersistenceMinutes': session.get('connectionPersistenceMinutes', 30)
    }


@router.post('/user/settings')
async def save_user_settings(
    request: Request,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Save user settings to session."""
    await update_session_data(request, data)
    return {'status': 'success'}

