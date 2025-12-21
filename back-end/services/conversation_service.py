"""
Conversation Service

Handles conversation management, AI streaming responses, and Firestore persistence.
Centralizes all conversation-related business logic.
"""

import uuid
import logging
from typing import Optional, Generator
from flask import session

logger = logging.getLogger(__name__)


class ConversationService:
    """Service for managing conversations and AI interactions."""
    
    @staticmethod
    def create_or_get_conversation_id(provided_id: Optional[str] = None) -> str:
        """
        Generate new conversation ID or return provided one.
        Single source of truth for conversation ID logic.
        
        Args:
            provided_id: Optional conversation ID from client
            
        Returns:
            A valid conversation ID (either provided or newly generated)
        """
        if provided_id:
            return provided_id
        
        # Generate new ID and store in session
        new_id = str(uuid.uuid4())
        session['conversation_id'] = new_id
        return new_id
    
    @staticmethod
    def initialize_conversation(conversation_id: str, history: list = None) -> None:
        """
        Initialize or restore Gemini chat session with history.
        
        Args:
            conversation_id: The conversation to initialize
            history: Optional list of message history to restore
        """
        from services.gemini_service import GeminiService
        GeminiService.get_or_create_chat_session(conversation_id, history)
    
    @staticmethod
    def get_conversation_data(conversation_id: str) -> Optional[dict]:
        """
        Fetch conversation from Firestore + initialize Gemini session with history.
        
        Args:
            conversation_id: The conversation to fetch
            
        Returns:
            Conversation data dict or None if not found
        """
        from services.firestore_service import FirestoreService
        from services.gemini_service import GeminiService
        
        conv_data = FirestoreService.get_conversation(conversation_id)
        
        if conv_data:
            # Store conversation ID in session
            session['conversation_id'] = conversation_id
            
            # Convert message history to Gemini format
            history = [
                {"role": "user" if msg["sender"] == "user" else "model", "parts": [msg["content"]]}
                for msg in conv_data.get('messages', [])
            ]
            
            # Initialize Gemini session with history
            GeminiService.get_or_create_chat_session(conversation_id, history)
            
        return conv_data
    
    @staticmethod
    def delete_user_conversation(conversation_id: str, user_id: str) -> None:
        """
        Delete conversation from Firestore.
        
        Args:
            conversation_id: The conversation to delete
            user_id: Owner of the conversation
            
        Raises:
            Exception on failure
        """
        from services.firestore_service import FirestoreService
        FirestoreService.delete_conversation(conversation_id, user_id)
        
        # Clear from session if it's the current conversation
        if session.get('conversation_id') == conversation_id:
            session.pop('conversation_id', None)
    
    @staticmethod
    def get_user_conversations(user_id: str) -> list:
        """
        Get all conversations for a user.
        
        Args:
            user_id: The user ID
            
        Returns:
            List of conversation summaries
        """
        from services.firestore_service import FirestoreService
        return FirestoreService.get_conversations(user_id)
    
    @staticmethod
    def create_streaming_generator(conversation_id: str, prompt: str, user_id: str) -> Generator:
        """
        Create a generator for streaming AI responses.
        
        Handles:
        - Streaming from Gemini
        - Storing user prompt on first successful chunk
        - Storing complete AI response after streaming
        - Error handling for quota/API errors
        
        CRITICAL: Doesn't store anything in Firestore if API errors occur
        
        Args:
            conversation_id: The conversation ID
            prompt: User's prompt
            user_id: The user ID for Firestore
            
        Yields:
            Text chunks from AI response or error messages
        """
        from services.gemini_service import GeminiService
        from services.firestore_service import FirestoreService
        from google.api_core.exceptions import ResourceExhausted, GoogleAPIError
        
        prompt_stored = False
        full_response_content = []
        
        try:
            responses = GeminiService.send_message(conversation_id, prompt)
            
            for chunk in responses:
                # Store user prompt only when we get the first successful chunk
                if not prompt_stored:
                    FirestoreService.store_conversation(conversation_id, 'user', prompt, user_id)
                    prompt_stored = True
                
                text_chunk = chunk.text
                full_response_content.append(text_chunk)
                yield text_chunk

            # Store the complete AI response after streaming
            if prompt_stored and full_response_content:
                FirestoreService.store_conversation(conversation_id, 'ai', "".join(full_response_content), user_id)
                    
        except ResourceExhausted as quota_err:
            # Handle quota exceeded - don't store anything
            logger.warning(f'Gemini quota exceeded: {quota_err}')
            error_msg = "⚠️ **API Rate Limit Exceeded**\n\nThe AI service is temporarily unavailable due to high usage. Please wait a moment and try again.\n\n_This message was not saved to your conversation._"
            yield error_msg
            
        except GoogleAPIError as api_err:
            # Handle other Google API errors
            logger.error(f'Gemini API error: {api_err}')
            error_msg = "⚠️ **AI Service Error**\n\nThere was a problem connecting to the AI service. Please try again.\n\n_This message was not saved to your conversation._"
            yield error_msg
            
        except Exception as stream_err:
            # Handle any other streaming errors
            logger.error(f'Streaming error: {stream_err}')
            error_msg = "⚠️ **Unexpected Error**\n\nSomething went wrong. Please try again.\n\n_This message was not saved to your conversation._"
            yield error_msg
    
    @staticmethod
    def get_streaming_headers(conversation_id: str) -> dict:
        """
        Get HTTP headers for streaming responses.
        
        Args:
            conversation_id: The conversation ID to include in headers
            
        Returns:
            Dict of HTTP headers optimized for streaming
        """
        return {
            'X-Conversation-Id': conversation_id,
            'Cache-Control': 'no-cache, no-transform',
            # Some reverse proxies buffer streamed responses; this header helps disable that behavior
            'X-Accel-Buffering': 'no'
        }
    
    @staticmethod
    def check_quota_error(error_message: str) -> bool:
        """
        Check if an error message indicates quota exceeded.
        
        Args:
            error_message: The error message to check
            
        Returns:
            True if it's a quota error, False otherwise
        """
        error_lower = error_message.lower()
        return 'quota' in error_lower or '429' in error_lower or 'rate' in error_lower
