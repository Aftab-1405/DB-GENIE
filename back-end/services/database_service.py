"""
Database Service

High-level database operations with Gemini integration.
Centralizes all database business logic that involves AI notification.
"""

import re
import time
import logging
from typing import Dict, Optional, List
from flask import session

logger = logging.getLogger(__name__)


class DatabaseService:
    """Service for database operations with AI integration."""
    
    @staticmethod
    def switch_remote_database(new_db_name: str, conversation_id: str = None) -> dict:
        """
        Switch to different database on remote server.
        
        Args:
            new_db_name: Name of database to switch to
            conversation_id: Optional conversation ID for Gemini notification
            
        Returns:
            Dict with status, message, tables, selectedDatabase
        """
        from database.session_utils import (
            get_db_config_from_session, 
            set_connection_string_in_session, 
            get_db_cursor,
            get_db_connection
        )
        from database.operations import DatabaseOperations
        from database.adapters import get_adapter
        from services.gemini_service import GeminiService
        
        # Validate request
        if not new_db_name:
            return {'status': 'error', 'message': 'Database name is required'}
        
        # Get current config from session
        config = get_db_config_from_session()
        if not config:
            return {'status': 'error', 'message': 'No database connected'}
        
        connection_string = config.get('connection_string')
        if not connection_string:
            return {'status': 'error', 'message': 'This feature is only for connection string based connections'}
        
        # Modify connection string to use new database
        # Pattern: postgresql://user:pass@host/OLD_DB?params -> postgresql://user:pass@host/NEW_DB?params
        new_connection_string = re.sub(
            r'(/[^/?]+)(\?|$)',  # Match /database_name followed by ? or end
            f'/{new_db_name}\\2',  # Replace with /new_database_name
            connection_string
        )
        
        # Clear old connection pool
        DatabaseService._clear_connection_cache()
        
        # Store new connection string in session
        set_connection_string_in_session(new_connection_string, 'postgresql', new_db_name)
        
        # Test new connection and get schema info
        try:
            conn = get_db_connection()
            adapter = get_adapter('postgresql')
            
            if adapter.validate_connection(conn):
                tables = DatabaseService._fetch_and_notify_schema(
                    get_db_cursor, 
                    new_db_name, 
                    conversation_id, 
                    action="Switched"
                )
                
                logger.info(f"User switched to database: {new_db_name}")
                return {
                    'status': 'connected',
                    'message': f'Switched to database: {new_db_name}',
                    'selectedDatabase': new_db_name,
                    'tables': tables
                }
            
            return {'status': 'error', 'message': 'Failed to connect to the new database'}
        except Exception as err:
            logger.exception('Error switching remote database')
            return {'status': 'error', 'message': str(err)}
    
    @staticmethod
    def select_schema_with_notification(schema_name: str, conversation_id: str = None) -> dict:
        """
        Select PostgreSQL schema + notify Gemini.
        
        Args:
            schema_name: Name of schema to select
            conversation_id: Optional conversation ID for Gemini notification
            
        Returns:
            Dict with status, schema, tables, message
        """
        from database.session_utils import (
            get_db_config_from_session, 
            set_schema_in_session, 
            get_db_cursor
        )
        from database.adapters import get_adapter
        from services.gemini_service import GeminiService
        
        if not schema_name:
            return {'status': 'error', 'message': 'Schema name is required'}
        
        config = get_db_config_from_session()
        if not config:
            return {'status': 'error', 'message': 'No database connected'}
        
        db_type = config.get('db_type', 'mysql')
        if db_type != 'postgresql':
            return {'status': 'error', 'message': 'Schema selection is only available for PostgreSQL'}
        
        # Update session with selected schema
        set_schema_in_session(schema_name)
        
        # Get tables in the selected schema
        adapter = get_adapter(db_type)
        tables = []
        try:
            with get_db_cursor() as cursor:
                cursor.execute(adapter.get_tables_query(schema_name))
                tables = [row[0] for row in cursor.fetchall()]
        except Exception as err:
            logger.error(f"Error fetching tables for schema {schema_name}: {err}")
        
        # Notify Gemini about the schema and its tables
        if conversation_id:
            db_name = config.get('database', 'unknown')
            schema_info = f"User selected PostgreSQL schema: {schema_name} in database {db_name}. Tables in this schema: {', '.join(tables) if tables else 'No tables found'}."
            GeminiService.notify_gemini(conversation_id, schema_info)
        
        logger.info(f"User selected schema: {schema_name} with {len(tables)} tables")
        
        return {
            'status': 'success',
            'message': f'Selected schema: {schema_name}',
            'schema': schema_name,
            'tables': tables
        }
    
    @staticmethod
    def get_schemas() -> dict:
        """
        Get all schemas in the currently connected PostgreSQL database.
        
        Returns:
            Dict with status, schemas list, and current_schema
        """
        from database.session_utils import get_db_config_from_session, get_db_cursor
        from database.adapters import get_adapter
        
        config = get_db_config_from_session()
        if not config:
            return {'status': 'error', 'message': 'No database connected'}
        
        db_type = config.get('db_type', 'mysql')
        if db_type != 'postgresql':
            return {'status': 'error', 'message': 'Schema selection is only available for PostgreSQL'}
        
        adapter = get_adapter(db_type)
        
        schemas = []
        with get_db_cursor() as cursor:
            cursor.execute(adapter.get_schemas_query())
            schemas = [row[0] for row in cursor.fetchall()]
        
        return {
            'status': 'success', 
            'schemas': schemas,
            'current_schema': config.get('schema', 'public')
        }
    
    @staticmethod
    def get_tables() -> dict:
        """
        Get all tables in the currently selected database/schema.
        
        Returns:
            Dict with status, tables, database, schema
        """
        from database.operations import DatabaseOperations
        from database.session_utils import get_db_config_from_session, get_current_database
        
        db_name = get_current_database()
        if not db_name:
            return {'status': 'error', 'message': 'No database selected'}
        
        config = get_db_config_from_session()
        schema = config.get('schema', 'public') if config else 'public'
        
        tables = DatabaseOperations.get_tables(db_name, schema=schema)
        return {'status': 'success', 'tables': tables, 'database': db_name, 'schema': schema}
    
    @staticmethod
    def get_table_info_with_schema(table_name: str) -> dict:
        """
        Get table schema + row count.
        
        Args:
            table_name: Name of table to get info for
            
        Returns:
            Dict with status, table_name, schema, row_count
        """
        from database.operations import DatabaseOperations
        from database.session_utils import get_current_database
        
        if not table_name:
            return {'status': 'error', 'message': 'Table name is required'}
        
        db_name = get_current_database()
        if not db_name:
            return {'status': 'error', 'message': 'No database selected'}
        
        schema = DatabaseOperations.get_table_schema(table_name, db_name)
        row_count = DatabaseOperations.get_table_row_count(table_name, db_name)
        
        return {
            'status': 'success',
            'table_name': table_name,
            'schema': schema,
            'row_count': row_count
        }
    
    @staticmethod
    def disconnect_database() -> dict:
        """
        Close connection pool + clear session.
        
        Returns:
            Dict with status and message
        """
        from database.session_utils import clear_db_config_from_session, close_user_pool
        from database.operations import DatabaseOperations
        
        try:
            # Close this user's connection pool
            closed = close_user_pool()
            
            # Clear database config from session
            clear_db_config_from_session()
            
            # Clear any cached DB metadata
            try:
                DatabaseOperations.clear_cache()
            except Exception:
                logger.debug('Failed to clear DatabaseOperations cache after disconnect')
            
            logger.info(f"User disconnected from database (pool closed: {closed})")
            return {'status': 'success', 'message': 'Disconnected from database server.'}
        except Exception as e:
            logger.exception('Error disconnecting DB')
            return {'status': 'error', 'message': str(e)}
    
    @staticmethod
    def execute_query_with_notification(sql_query: str, conversation_id: str = None, 
                                         max_rows: int = 1000, timeout: int = 30) -> dict:
        """
        Execute SQL query + notify Gemini about results.
        
        Args:
            sql_query: SQL query to execute
            conversation_id: Optional conversation ID for Gemini notification
            max_rows: Maximum rows to return
            timeout: Query timeout in seconds
            
        Returns:
            Query result dict
        """
        from database.operations import execute_sql_query
        from database.session_utils import get_current_database
        from services.gemini_service import GeminiService
        
        result = execute_sql_query(sql_query, max_rows=max_rows, timeout_seconds=timeout)
        
        # Notify Gemini about the query execution
        db_name = get_current_database()
        
        if result['status'] == 'success':
            if 'result' in result:  # SELECT query
                notify_msg = f'SELECT query executed on {db_name}. Retrieved {result["row_count"]} rows.'
            else:  # Other queries
                notify_msg = f'Query executed on {db_name} in table {result.get("table_name", "unknown")}. Affected rows: {result["affected_rows"]}. Query: {sql_query}'
            GeminiService.notify_gemini(conversation_id, notify_msg)
        else:
            notify_msg = f'Error executing query on {db_name}: {result["message"]}. Query: {sql_query}'
            GeminiService.notify_gemini(conversation_id, notify_msg)
        
        return result
    
    @staticmethod
    def get_databases_with_remote_flag() -> dict:
        """
        Get list of databases with is_remote flag.
        
        Returns:
            Dict with status, databases list, and is_remote flag
        """
        from database.operations import DatabaseOperations
        from database.session_utils import is_remote_connection
        
        result = DatabaseOperations.get_databases()
        
        # Add is_remote flag for frontend
        if is_remote_connection():
            result['is_remote'] = True
        
        return result
    
    @staticmethod
    def _clear_connection_cache():
        """Clear connection pools and caches."""
        from database.operations import DatabaseOperations
        from database.session_utils import close_user_pool
        
        try:
            DatabaseOperations.clear_cache()
            close_user_pool()
        except Exception:
            pass
    
    @staticmethod
    def _fetch_and_notify_schema(get_db_cursor, db_name: str, conversation_id: str, action: str = "Connected") -> List[str]:
        """
        Fetch schema info and notify Gemini.
        
        Args:
            get_db_cursor: Context manager for getting cursor
            db_name: Database name
            conversation_id: Conversation ID for notification
            action: Action verb for notification (e.g., "Switched", "Connected")
            
        Returns:
            List of table names
        """
        from services.gemini_service import GeminiService
        
        tables = []
        try:
            with get_db_cursor() as cursor:
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                    ORDER BY table_name
                """)
                tables = [row[0] for row in cursor.fetchall()]
                
                if tables:
                    schema_info = f"{action} to PostgreSQL database: {db_name}\n\n"
                    schema_info += f"Database contains {len(tables)} tables in the 'public' schema:\n\n"
                    
                    for table in tables:
                        cursor.execute("""
                            SELECT column_name, data_type, is_nullable
                            FROM information_schema.columns
                            WHERE table_schema = 'public' AND table_name = %s
                            ORDER BY ordinal_position
                        """, (table,))
                        columns = cursor.fetchall()
                        
                        schema_info += f"Table: {table}\n"
                        for col_name, col_type, nullable in columns:
                            null_str = "NULL" if nullable == 'YES' else "NOT NULL"
                            schema_info += f"  - {col_name}: {col_type} ({null_str})\n"
                        schema_info += "\n"
                    
                    if conversation_id:
                        GeminiService.notify_gemini(conversation_id, schema_info)
                else:
                    schema_info = f"{action} to PostgreSQL database: {db_name}. No tables found in public schema."
                    if conversation_id:
                        GeminiService.notify_gemini(conversation_id, schema_info)
                        
        except Exception as schema_err:
            logger.warning(f"Failed to fetch schema: {schema_err}")
        
        return tables
