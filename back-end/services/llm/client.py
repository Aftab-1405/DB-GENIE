"""
LLMClient - Connection and configuration management for LLM APIs.

Handles Cerebras SDK client creation, model selection, and token limits.
"""

import os
import logging
from cerebras.cloud.sdk import Cerebras

logger = logging.getLogger(__name__)

# Default values (overridden by .env)
DEFAULT_MODEL = "gpt-oss-120b"
DEFAULT_MAX_TOKENS = 4096
DEFAULT_MAX_COMPLETION_TOKENS = 8192

# Models that support reasoning (Cerebras-specific)
REASONING_MODELS = ['gpt-oss-120b', 'zai-glm-4.6']


class LLMClient:
    """Connection and configuration management for LLM APIs."""
    
    @staticmethod
    def get_client(api_key: str = None) -> Cerebras:
        """
        Creates and returns a Cerebras SDK client.
        
        Args:
            api_key: Optional API key. If not provided, falls back to env var.
        """
        key = api_key or os.getenv('LLM_API_KEY') or os.getenv('CEREBRAS_API_KEY')
        
        if not key:
            # Try multi-key config
            keys_raw = os.getenv('LLM_API_KEYS', '')
            keys = [k.strip() for k in keys_raw.split(',') if k.strip()]
            if keys:
                key = keys[0]  # Use first key as fallback
        
        if not key:
            logger.error("No LLM API key found in environment variables")
            raise ValueError("LLM_API_KEY or LLM_API_KEYS is required")
            
        return Cerebras(api_key=key)
    
    @staticmethod
    def get_model_name() -> str:
        """Gets the model name from environment or defaults."""
        return os.getenv('LLM_MODEL', DEFAULT_MODEL)
    
    @staticmethod
    def is_reasoning_model() -> bool:
        """Check if current model supports reasoning."""
        model = LLMClient.get_model_name()
        return model in REASONING_MODELS
    
    @staticmethod
    def get_max_tokens() -> int:
        """Gets max response tokens from environment or defaults."""
        return int(os.getenv('LLM_MAX_TOKENS', DEFAULT_MAX_TOKENS))
    
    @staticmethod
    def get_max_completion_tokens() -> int:
        """Gets max completion tokens (for reasoning) from environment or defaults."""
        return int(os.getenv('LLM_MAX_COMPLETION_TOKENS', DEFAULT_MAX_COMPLETION_TOKENS))
