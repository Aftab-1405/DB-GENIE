/**
 * Conversations API Module
 * 
 * Handles conversation-related API calls:
 * - List conversations
 * - Get single conversation
 * - Create new conversation
 * - Delete conversation
 * - Send message to LLM (streaming)
 * 
 * @module api/conversations
 */

import { get, post, del, postRaw } from './client';
import { CONVERSATIONS } from './endpoints';

/**
 * Get all conversations for current user.
 * 
 * @returns {Promise<{status: string, conversations: Array}>}
 */
export async function getConversations() {
  return get(CONVERSATIONS.LIST);
}

/**
 * Get a single conversation by ID.
 * 
 * @param {string} id - Conversation ID
 * @returns {Promise<{status: string, conversation: Object}>}
 */
export async function getConversation(id) {
  return get(CONVERSATIONS.GET(id));
}

/**
 * Create a new conversation.
 * 
 * @returns {Promise<{status: string, conversation_id: string}>}
 */
export async function createConversation() {
  return post(CONVERSATIONS.CREATE);
}

/**
 * Delete a conversation by ID.
 * 
 * @param {string} id - Conversation ID
 * @returns {Promise<{status: string}>}
 */
export async function deleteConversation(id) {
  return del(CONVERSATIONS.DELETE(id));
}

/**
 * Send a message to the LLM and receive streaming response.
 * 
 * @param {Object} params - Message parameters
 * @param {string} params.prompt - User message
 * @param {string|null} params.conversationId - Current conversation ID
 * @param {boolean} params.enableReasoning - Enable AI reasoning
 * @param {string} params.reasoningEffort - Reasoning effort level
 * @param {string} params.responseStyle - Response style preference
 * @param {number|null} params.maxRows - Max rows for query results
 * @param {AbortSignal} [signal] - Optional abort signal for cancellation
 * @returns {Promise<Response>} Raw response for streaming
 */
export async function sendMessage({
  prompt,
  conversationId = null,
  enableReasoning = true,
  reasoningEffort = 'medium',
  responseStyle = 'balanced',
  maxRows = 1000,
}, signal) {
  return postRaw(
    CONVERSATIONS.SEND_MESSAGE,
    {
      prompt,
      conversation_id: conversationId,
      enable_reasoning: enableReasoning,
      reasoning_effort: reasoningEffort,
      response_style: responseStyle,
      max_rows: maxRows === 0 ? null : maxRows,
    },
    { signal }
  );
}

export default {
  getConversations,
  getConversation,
  createConversation,
  deleteConversation,
  sendMessage,
};
