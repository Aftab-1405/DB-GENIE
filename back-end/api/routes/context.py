# File: api/routes/context.py
"""User context and settings related API routes."""

import logging

from fastapi import APIRouter, Request, Depends
from fastapi.concurrency import run_in_threadpool

from dependencies import (
    get_current_user,
    require_db_config,
    get_session_data,
    update_session_data,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["context"])


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
