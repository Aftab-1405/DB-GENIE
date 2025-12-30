"""
Context Service - Pure FastAPI Version

Manages persistent AI context in Firestore.
Provides schema caching, connection state, and query history.
No Flask dependencies - context validation is done by caller.
"""

import hashlib
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)


class ContextService:
    """
    Manages AI context in Firestore.
    
    Firestore Structure:
        user_context/{user_id}
            ├── current_connection
            ├── database_schemas
            └── recent_queries
    """
    
    COLLECTION_NAME = 'user_context'
    MAX_RECENT_QUERIES = 10
    SCHEMA_CACHE_TTL_SECONDS = 300  # 5 minutes TTL for schema cache
    CONNECTION_TTL_SECONDS = 300  # 5 minutes - after this, verify connection
    
    # =========================================================================
    # Firestore Access (delegated to repository)
    # =========================================================================
    
    @staticmethod
    def _normalize_user_id(user_id) -> str:
        """Normalize user_id to string for Firestore document ID."""
        from repositories import ContextRepository
        return ContextRepository._normalize_user_id(user_id)
    
    @staticmethod
    def _get_context_ref(user_id):
        """Get Firestore document reference for user context."""
        from repositories import ContextRepository
        return ContextRepository.get_ref(user_id)
    
    @staticmethod
    def _get_context(user_id: str) -> Dict:
        """Get full context document, or empty dict if not exists."""
        from repositories import ContextRepository
        return ContextRepository.get(user_id)
    
    @staticmethod
    def _update_context(user_id: str, data: Dict) -> bool:
        """Update context document with merge."""
        from repositories import ContextRepository
        return ContextRepository.update(user_id, data)
    
    # =========================================================================
    # Connection State Management
    # =========================================================================
    
    @staticmethod
    def set_connection(user_id: str, db_type: str, database: str, 
                       host: str, is_remote: bool, schema: str = 'public') -> bool:
        """
        Set current connection state.
        
        Args:
            user_id: User ID
            db_type: 'mysql', 'postgresql', 'sqlite'
            database: Database name
            host: Host address
            is_remote: Whether it's a remote connection
            schema: PostgreSQL schema (default 'public')
        """
        connection_data = {
            'current_connection': {
                'connected': True,
                'db_type': db_type,
                'database': database,
                'host': host,
                'is_remote': is_remote,
                'schema': schema,
                'connected_at': datetime.now().isoformat()
            }
        }
        logger.info(f"Setting connection context for user {user_id}: {db_type}/{database}")
        return ContextService._update_context(user_id, connection_data)
    
    @staticmethod
    def clear_connection(user_id: str) -> bool:
        """Clear current connection state (user disconnected)."""
        connection_data = {
            'current_connection': {
                'connected': False,
                'db_type': None,
                'database': None,
                'host': None,
                'is_remote': False,
                'schema': None,
                'disconnected_at': datetime.now().isoformat()
            }
        }
        logger.info(f"Clearing connection context for user {user_id}")
        return ContextService._update_context(user_id, connection_data)
    
    @staticmethod
    def get_connection(user_id: str) -> Dict:
        """
        Get current connection state from Firestore.
        
        Note: In FastAPI, session validation is handled by the caller
        via Redis session. This method just returns Firestore data.
        
        Args:
            user_id: The user ID to check connection for
            
        Returns:
            Dict with connection state
        """
        context = ContextService._get_context(user_id)
        return context.get('current_connection', {'connected': False})
    
    @staticmethod
    def update_schema(user_id: str, schema_name: str) -> bool:
        """Update current schema (PostgreSQL)."""
        context = ContextService._get_context(user_id)
        connection = context.get('current_connection', {})
        connection['schema'] = schema_name
        return ContextService._update_context(user_id, {'current_connection': connection})
    
    # =========================================================================
    # Schema Caching
    # =========================================================================
    
    @staticmethod
    def compute_schema_hash(tables: List[str], columns: Dict[str, List]) -> str:
        """Compute hash of schema for change detection."""
        schema_str = json.dumps({
            'tables': sorted(tables),
            'columns': {k: sorted(v) if isinstance(v, list) else v for k, v in sorted(columns.items())}
        }, sort_keys=True)
        return hashlib.md5(schema_str.encode()).hexdigest()
    
    @staticmethod
    def get_cached_schema(user_id: str, database: str) -> Optional[Dict]:
        """
        Get cached schema for a database with TTL check.
        
        Returns None if cache is expired or doesn't exist.
        """
        context = ContextService._get_context(user_id)
        schemas = context.get('database_schemas', {})
        cached = schemas.get(database)
        
        if not cached:
            return None
        
        # Check TTL
        cached_at = cached.get('cached_at')
        if cached_at:
            try:
                cache_time = datetime.fromisoformat(cached_at.replace('Z', '+00:00'))
                if cache_time.tzinfo:
                    cache_time = cache_time.replace(tzinfo=None)
                age_seconds = (datetime.now() - cache_time).total_seconds()
                
                if age_seconds > ContextService.SCHEMA_CACHE_TTL_SECONDS:
                    logger.debug(f"Schema cache expired for {database} (age: {age_seconds:.0f}s)")
                    return None
            except (ValueError, TypeError) as e:
                logger.warning(f"Could not parse cached_at timestamp: {e}")
                return None
        
        return cached
    
    @staticmethod
    def cache_schema(user_id: str, database: str, tables: List[str], 
                     columns: Dict[str, List]) -> bool:
        """Cache schema for a database."""
        schema_data = {
            'tables': tables,
            'columns': columns,
            'schema_hash': ContextService.compute_schema_hash(tables, columns),
            'cached_at': datetime.now().isoformat()
        }
        
        context = ContextService._get_context(user_id)
        schemas = context.get('database_schemas', {})
        schemas[database] = schema_data
        
        logger.info(f"Caching schema for user {user_id}, database {database}: {len(tables)} tables")
        return ContextService._update_context(user_id, {'database_schemas': schemas})
    
    @staticmethod
    def is_schema_changed(user_id: str, database: str, 
                          current_tables: List[str], current_columns: Dict) -> bool:
        """Check if schema has changed since last cache."""
        cached = ContextService.get_cached_schema(user_id, database)
        if not cached:
            return True
        
        current_hash = ContextService.compute_schema_hash(current_tables, current_columns)
        return cached.get('schema_hash') != current_hash
    
    @staticmethod
    def invalidate_schema_cache(user_id: str, database: str) -> bool:
        """Invalidate schema cache for a database."""
        from repositories import ContextRepository
        
        success = ContextRepository.delete_field(user_id, f'database_schemas.{database}')
        if success:
            logger.info(f"Invalidated schema cache for {database}")
        return success
    
    @staticmethod
    def get_schema_summary(user_id: str) -> List[Dict]:
        """Get summary of cached schemas for UI display."""
        context = ContextService._get_context(user_id)
        schemas = context.get('database_schemas', {})
        
        summary = []
        for db_name, schema_data in schemas.items():
            summary.append({
                'database': db_name,
                'table_count': len(schema_data.get('tables', [])),
                'cached_at': schema_data.get('cached_at')
            })
        
        summary.sort(key=lambda x: x.get('cached_at') or '', reverse=True)
        return summary
    
    @staticmethod
    def get_all_cached_schemas(user_id: str) -> Dict:
        """Get all cached schemas for user."""
        context = ContextService._get_context(user_id)
        return context.get('database_schemas', {})
    
    # =========================================================================
    # Query History
    # =========================================================================
    
    @staticmethod
    def add_query(user_id: str, query: str, database: str, 
                  row_count: int = 0, status: str = 'success') -> bool:
        """Add a query to recent history."""
        query_entry = {
            'query': query[:500],  # Truncate long queries
            'database': database,
            'row_count': row_count,
            'status': status,
            'executed_at': datetime.now().isoformat()
        }
        
        context = ContextService._get_context(user_id)
        queries = context.get('recent_queries', [])
        queries.append(query_entry)
        queries = queries[-ContextService.MAX_RECENT_QUERIES:]
        
        return ContextService._update_context(user_id, {'recent_queries': queries})
    
    @staticmethod
    def get_recent_queries(user_id: str, limit: int = 10) -> List[Dict]:
        """Get recent queries for user."""
        context = ContextService._get_context(user_id)
        queries = context.get('recent_queries', [])
        return queries[-limit:]
    
    @staticmethod
    def clear_query_history(user_id: str) -> bool:
        """Clear query history."""
        return ContextService._update_context(user_id, {'recent_queries': []})
    
    # =========================================================================
    # Full Context for AI
    # =========================================================================
    
    @staticmethod
    def get_full_context(user_id: str) -> Dict:
        """Get complete context for AI tools."""
        context = ContextService._get_context(user_id)
        
        return {
            'connection': context.get('current_connection', {'connected': False}),
            'schemas': context.get('database_schemas', {}),
            'recent_queries': context.get('recent_queries', []),
            'updated_at': context.get('updated_at')
        }
    
    @staticmethod
    def clear_all_context(user_id: str) -> bool:
        """Clear all context for user."""
        from repositories import ContextRepository
        return ContextRepository.delete(user_id)
    
    # =========================================================================
    # User Preferences
    # =========================================================================
    
    @staticmethod
    def set_user_preference(user_id: str, key: str, value: Any) -> bool:
        """Set a user preference."""
        try:
            return ContextService._update_context(user_id, {
                f'preferences.{key}': value
            })
        except Exception as e:
            logger.error(f"Error setting preference {key} for user {user_id}: {e}")
            return False
    
    @staticmethod
    def get_user_preference(user_id: str, key: str, default: Any = None) -> Any:
        """Get a single user preference."""
        context = ContextService._get_context(user_id)
        preferences = context.get('preferences', {})
        return preferences.get(key, default)
    
    @staticmethod
    def get_user_preferences(user_id: str) -> Dict:
        """Get all user preferences."""
        context = ContextService._get_context(user_id)
        return context.get('preferences', {})
