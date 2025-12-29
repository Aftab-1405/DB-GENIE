/**
 * API Endpoints - Single Source of Truth
 * 
 * All API endpoint paths are defined here. This enables:
 * - Easy endpoint changes (modify once, update everywhere)
 * - Clear visibility of all API contracts
 * - Simple mocking for tests
 * 
 * Naming convention: DOMAIN_ACTION
 * 
 * @module api/endpoints
 */

// =============================================================================
// AUTH ENDPOINTS (no /api prefix - served by auth_bp)
// =============================================================================

export const AUTH = {
  FIREBASE_CONFIG: '/firebase-config',
  SET_SESSION: '/set_session',
  CHECK_SESSION: '/check_session',
  LOGOUT: '/logout',
};

// =============================================================================
// CONVERSATION ENDPOINTS
// =============================================================================

export const CONVERSATIONS = {
  LIST: '/api/get_conversations',
  GET: (id) => `/api/get_conversation/${id}`,
  CREATE: '/api/new_conversation',
  DELETE: (id) => `/api/delete_conversation/${id}`,
  SEND_MESSAGE: '/api/pass_user_prompt_to_llm',
};

// =============================================================================
// DATABASE ENDPOINTS
// =============================================================================

export const DATABASE = {
  STATUS: '/api/db_status',
  CONNECT: '/api/connect_db',
  DISCONNECT: '/api/disconnect_db',
  LIST_DATABASES: '/api/get_databases',
  LIST_TABLES: '/api/get_tables',
  SWITCH_DATABASE: '/api/switch_remote_database',
  GET_SCHEMAS: '/api/get_schemas',
  SELECT_SCHEMA: '/api/select_schema',
};

// =============================================================================
// QUERY ENDPOINTS
// =============================================================================

export const QUERY = {
  RUN: '/api/run_sql_query',
};

// =============================================================================
// USER ENDPOINTS
// =============================================================================

export const USER = {
  CONTEXT: '/api/user/context',
  CONTEXT_REFRESH: '/api/user/context/refresh',
  SETTINGS: '/api/user/settings',
};

// =============================================================================
// LEGACY EXPORT (for backwards compatibility during migration)
// =============================================================================

export default {
  AUTH,
  CONVERSATIONS,
  DATABASE,
  QUERY,
  USER,
};
