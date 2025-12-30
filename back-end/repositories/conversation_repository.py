"""
Conversation Repository

Encapsulates Firestore data access for conversation documents.
Collection: conversations/{conversation_id}
"""

import re
import logging
from datetime import datetime
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class ConversationRepository:
    """Data access layer for conversations in Firestore."""
    
    COLLECTION_NAME = 'conversations'
    
    @staticmethod
    def _strip_markers(text: str) -> str:
        """
        Strip streaming markers from message before storing.
        
        These markers ([[THINKING:...]], [[TOOL:...]]) are for real-time UI rendering.
        Stored messages should contain only the clean content.
        """
        if not text:
            return text
        
        # Strip thinking markers
        text = re.sub(r'\[\[THINKING:start\]\]', '', text)
        text = re.sub(r'\[\[THINKING:chunk:.*?\]\]', '', text)
        text = re.sub(r'\[\[THINKING:end\]\]', '', text)
        
        # Strip tool markers (keep result data separate in 'tools' field)
        text = re.sub(r'\[\[TOOL:[^\]]+\]\]', '', text)
        
        return text.strip()
    
    @staticmethod
    def get(conversation_id: str) -> Optional[Dict]:
        """
        Get conversation by ID.
        
        Args:
            conversation_id: The conversation ID
            
        Returns:
            Conversation document as dict, or None if not exists
        """
        from services.firestore_service import FirestoreService
        try:
            db = FirestoreService.get_db()
            doc = db.collection(ConversationRepository.COLLECTION_NAME).document(conversation_id).get()
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            logger.error(f"Error retrieving conversation {conversation_id}: {e}")
            raise
    
    @staticmethod
    def get_by_user(user_id: str) -> List[Dict]:
        """
        Get all conversations for a user.
        
        Args:
            user_id: The user ID
            
        Returns:
            List of conversation summaries (id, timestamp, title, preview)
        """
        from services.firestore_service import FirestoreService
        from google.cloud.firestore_v1 import FieldFilter
        
        try:
            db = FirestoreService.get_db()
            conversations = (
                db.collection(ConversationRepository.COLLECTION_NAME)
                .where(filter=FieldFilter('user_id', '==', user_id))
                .get()
            )
            
            conversation_list = []
            for conv in conversations:
                conv_data = conv.to_dict()
                if conv_data.get('messages'):
                    first_msg = conv_data['messages'][0]['content']
                    conversation_list.append({
                        'id': conv.id,
                        'timestamp': conv_data['timestamp'],
                        'title': first_msg[:40] + ('...' if len(first_msg) > 40 else ''),
                        'preview': first_msg[:50] + '...'
                    })
            
            # Sort by timestamp descending (newest first)
            conversation_list.sort(key=lambda x: x['timestamp'], reverse=True)
            return conversation_list
        except Exception as e:
            logger.error(f"Error retrieving conversations for user {user_id}: {e}")
            raise
    
    @staticmethod
    def store_message(
        conversation_id: str, 
        sender: str, 
        message: str, 
        user_id: str, 
        tools: List[Dict] = None
    ) -> None:
        """
        Store a message in a conversation.
        
        Creates the conversation document if it doesn't exist.
        AI messages have streaming markers stripped before storage.
        
        Args:
            conversation_id: The conversation ID
            sender: 'user' or 'ai'
            message: The message content
            user_id: The user ID (owner)
            tools: Optional list of tools used (for AI messages)
        """
        from services.firestore_service import FirestoreService
        from firebase_admin import firestore
        
        try:
            db = FirestoreService.get_db()
            conversation_ref = db.collection(ConversationRepository.COLLECTION_NAME).document(conversation_id)
            
            # Create conversation if it doesn't exist
            if not conversation_ref.get().exists:
                conversation_ref.set({
                    'user_id': user_id,
                    'timestamp': datetime.now(),
                    'messages': []
                })
            
            # Clean the message content for storage
            clean_message = ConversationRepository._strip_markers(message) if sender == 'ai' else message
            
            # Build the message object
            message_data = {
                'sender': sender,
                'content': clean_message,
                'timestamp': datetime.now()
            }
            
            # Add tools info if provided (for AI messages)
            if tools:
                message_data['tools'] = tools
            
            conversation_ref.update({
                'messages': firestore.ArrayUnion([message_data])
            })
            logger.debug(f"Conversation {conversation_id} updated successfully")
        except Exception as e:
            logger.error(f"Error storing message in conversation {conversation_id}: {e}")
            raise
    
    @staticmethod
    def delete(conversation_id: str, user_id: str) -> bool:
        """
        Delete a conversation. Verifies user ownership.
        
        Args:
            conversation_id: The conversation ID
            user_id: The user ID (must own the conversation)
            
        Returns:
            True if deleted successfully
            
        Raises:
            PermissionError: If user doesn't own the conversation
            ValueError: If conversation not found
        """
        from services.firestore_service import FirestoreService
        
        try:
            db = FirestoreService.get_db()
            conversation_ref = db.collection(ConversationRepository.COLLECTION_NAME).document(conversation_id)
            conversation = conversation_ref.get()
            
            if not conversation.exists:
                raise ValueError("Conversation not found")
            
            conv_data = conversation.to_dict()
            if conv_data['user_id'] != user_id:
                raise PermissionError("User does not own this conversation")
            
            conversation_ref.delete()
            logger.info(f"Conversation {conversation_id} deleted successfully")
            return True
        except (ValueError, PermissionError):
            raise
        except Exception as e:
            logger.error(f"Error deleting conversation {conversation_id}: {e}")
            raise
