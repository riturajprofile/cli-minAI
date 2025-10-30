"""
Google Sheets Logger for MinAI
Logs chat history, token usage, and analytics to Google Sheets
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, Optional, Any
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ============================================================================
# CONFIGURATION
# ============================================================================
GOOGLE_SHEETS_ENABLED = os.getenv("GOOGLE_SHEETS_ENABLED", "false").lower() == "true"
GOOGLE_SHEETS_URL = os.getenv("GOOGLE_SHEETS_URL", "")

# ============================================================================
# GOOGLE SHEETS LOGGER
# ============================================================================
class GoogleSheetsLogger:
    """
    Logs chat interactions and analytics to Google Sheets via Apps Script
    Similar to analytics.js but for backend chat logging
    """
    
    def __init__(self, script_url: str = None):
        self.script_url = script_url or GOOGLE_SHEETS_URL
        self.enabled = GOOGLE_SHEETS_ENABLED and bool(self.script_url)
        
        if self.enabled:
            logger.info(f"✓ Google Sheets logging enabled: {self.script_url[:50]}...")
        else:
            logger.info("⚠ Google Sheets logging disabled (set GOOGLE_SHEETS_ENABLED=true)")
    
    def log_chat_interaction(
        self,
        user_id: str,
        user_message: str,
        ai_response: str,
        mode: str = "standard",
        processing_time: float = 0.0,
        tokens_used: Optional[Dict[str, int]] = None,
        model_name: str = "gpt-4o",
        success: bool = True,
        error_message: Optional[str] = None,
        has_file: bool = False,
        file_info: Optional[Dict] = None,
        metadata: Optional[Dict] = None
    ) -> bool:
        """
        Log a complete chat interaction to Google Sheets
        
        Args:
            user_id: Unique user identifier
            user_message: The user's input message
            ai_response: The AI's response
            mode: Response mode (standard/learning/fast)
            processing_time: Time taken to generate response (seconds)
            tokens_used: Token usage statistics
            model_name: AI model used
            success: Whether the interaction was successful
            error_message: Error message if failed
            has_file: Whether a file was uploaded
            file_info: File details if uploaded
            metadata: Additional metadata
        
        Returns:
            bool: True if logged successfully
        """
        if not self.enabled:
            return False
        
        try:
            # Prepare log data
            log_data = {
                "sheet": "ChatHistory",  # Target sheet name
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": user_id,
                "mode": mode,
                "model": model_name,
                "user_message": user_message[:1000],  # Limit message length
                "ai_response": ai_response[:2000],  # Limit response length
                "message_length": len(user_message),
                "response_length": len(ai_response),
                "processing_time": round(processing_time, 2),
                "success": success,
                "error": error_message or "",
                "has_file": has_file,
                "file_name": file_info.get("name", "") if file_info else "",
                "file_size": file_info.get("size", 0) if file_info else 0,
                "tokens_prompt": tokens_used.get("prompt", 0) if tokens_used else 0,
                "tokens_completion": tokens_used.get("completion", 0) if tokens_used else 0,
                "tokens_total": tokens_used.get("total", 0) if tokens_used else 0,
                "metadata": json.dumps(metadata) if metadata else ""
            }
            
            # Send to Google Sheets
            self._send_to_sheets(log_data)
            logger.debug(f"✓ Chat interaction logged for user: {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error logging chat interaction: {str(e)}")
            return False
    
    def log_token_usage(
        self,
        user_id: str,
        model_name: str,
        tokens_used: Dict[str, int],
        cost_estimate: float = 0.0,
        mode: str = "standard",
        success: bool = True
    ) -> bool:
        """
        Log token usage statistics to Google Sheets
        
        Args:
            user_id: Unique user identifier
            model_name: AI model used
            tokens_used: Token usage dict with prompt/completion/total
            cost_estimate: Estimated cost in USD
            mode: Response mode
            success: Whether the call was successful
        
        Returns:
            bool: True if logged successfully
        """
        if not self.enabled:
            return False
        
        try:
            log_data = {
                "sheet": "TokenUsage",
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": user_id,
                "model": model_name,
                "mode": mode,
                "tokens_prompt": tokens_used.get("prompt", 0),
                "tokens_completion": tokens_used.get("completion", 0),
                "tokens_total": tokens_used.get("total", 0),
                "cost_estimate": round(cost_estimate, 6),
                "success": success
            }
            
            self._send_to_sheets(log_data)
            logger.debug(f"✓ Token usage logged: {tokens_used.get('total', 0)} tokens")
            return True
            
        except Exception as e:
            logger.error(f"Error logging token usage: {str(e)}")
            return False
    
    def log_user_session(
        self,
        user_id: str,
        session_start: datetime,
        message_count: int = 0,
        total_tokens: int = 0,
        session_duration: float = 0.0,
        modes_used: Optional[list] = None
    ) -> bool:
        """
        Log user session summary to Google Sheets
        
        Args:
            user_id: Unique user identifier
            session_start: When session started
            message_count: Number of messages in session
            total_tokens: Total tokens used in session
            session_duration: Duration in seconds
            modes_used: List of modes used
        
        Returns:
            bool: True if logged successfully
        """
        if not self.enabled:
            return False
        
        try:
            log_data = {
                "sheet": "UserSessions",
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": user_id,
                "session_start": session_start.isoformat(),
                "session_end": datetime.utcnow().isoformat(),
                "message_count": message_count,
                "total_tokens": total_tokens,
                "duration_seconds": round(session_duration, 2),
                "modes_used": ",".join(modes_used) if modes_used else "standard"
            }
            
            self._send_to_sheets(log_data)
            logger.debug(f"✓ Session logged for user: {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error logging session: {str(e)}")
            return False
    
    def log_error(
        self,
        user_id: str,
        error_type: str,
        error_message: str,
        context: Optional[Dict] = None
    ) -> bool:
        """
        Log errors to Google Sheets for monitoring
        
        Args:
            user_id: Unique user identifier
            error_type: Type of error
            error_message: Error message
            context: Additional context
        
        Returns:
            bool: True if logged successfully
        """
        if not self.enabled:
            return False
        
        try:
            log_data = {
                "sheet": "Errors",
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": user_id,
                "error_type": error_type,
                "error_message": error_message[:500],
                "context": json.dumps(context) if context else ""
            }
            
            self._send_to_sheets(log_data)
            logger.debug(f"✓ Error logged: {error_type}")
            return True
            
        except Exception as e:
            logger.error(f"Error logging error: {str(e)}")
            return False
    
    def _send_to_sheets(self, data: Dict[str, Any]) -> bool:
        """
        Send data to Google Sheets via Apps Script
        
        Args:
            data: Data dictionary to send
        
        Returns:
            bool: True if successful
        """
        if not self.enabled:
            return False
        
        try:
            import requests
            
            # Send POST request to Google Apps Script
            response = requests.post(
                self.script_url,
                json=data,
                headers={
                    "Content-Type": "application/json"
                },
                timeout=5
            )
            
            if response.status_code in [200, 302]:
                return True
            else:
                logger.warning(f"Google Sheets response: {response.status_code}")
                return False
                
        except ImportError:
            logger.warning("requests library not installed. Run: pip install requests")
            return False
        except Exception as e:
            logger.error(f"Error sending to Google Sheets: {str(e)}")
            return False

# ============================================================================
# GLOBAL INSTANCE
# ============================================================================
sheets_logger = GoogleSheetsLogger()

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================
def calculate_token_cost(
    tokens: Dict[str, int],
    model_name: str = "gpt-4o"
) -> float:
    """
    Calculate estimated cost based on token usage
    
    Pricing (as of 2024):
    - GPT-4o: $5/1M input, $15/1M output
    - GPT-4o-mini: $0.15/1M input, $0.60/1M output
    
    Args:
        tokens: Dict with prompt/completion/total keys
        model_name: Model name
    
    Returns:
        float: Estimated cost in USD
    """
    prompt_tokens = tokens.get("prompt", 0)
    completion_tokens = tokens.get("completion", 0)
    
    if "mini" in model_name.lower():
        # GPT-4o-mini pricing
        prompt_cost = (prompt_tokens / 1_000_000) * 0.15
        completion_cost = (completion_tokens / 1_000_000) * 0.60
    else:
        # GPT-4o pricing
        prompt_cost = (prompt_tokens / 1_000_000) * 5.0
        completion_cost = (completion_tokens / 1_000_000) * 15.0
    
    return prompt_cost + completion_cost

def log_chat_to_sheets(
    user_id: str,
    user_message: str,
    ai_response: str,
    **kwargs
) -> bool:
    """
    Convenience function to log chat interaction
    
    Args:
        user_id: User identifier
        user_message: User's message
        ai_response: AI's response
        **kwargs: Additional parameters for log_chat_interaction
    
    Returns:
        bool: True if logged successfully
    """
    return sheets_logger.log_chat_interaction(
        user_id=user_id,
        user_message=user_message,
        ai_response=ai_response,
        **kwargs
    )

# ============================================================================
# STARTUP
# ============================================================================
if GOOGLE_SHEETS_ENABLED:
    logger.info("=" * 60)
    logger.info("Google Sheets Logger initialized")
    logger.info(f"Status: {'Enabled' if sheets_logger.enabled else 'Disabled'}")
    logger.info("=" * 60)
