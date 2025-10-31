import os
import logging
import hashlib
from datetime import datetime
from typing import Dict, List, Optional, Union, TypedDict
from dotenv import load_dotenv
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider

# ============================================================================
# LOGGING CONFIGURATION
# ============================================================================
# Configure logging with fallback for environments without write access
try:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('ai_agent.log'),
            logging.StreamHandler()
        ]
    )
except (PermissionError, OSError):
    # Fallback to console-only logging (for Railway/Docker environments)
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[logging.StreamHandler()]
    )
logger = logging.getLogger(__name__)

# ============================================================================
# ENVIRONMENT SETUP
# ============================================================================
load_dotenv()

def validate_environment() -> None:
    """Validate required environment variables on startup"""
    required_vars = ["OPENAI_API_KEY"]
    missing = [var for var in required_vars if not os.getenv(var)]
    
    if missing:
        error_msg = f"Missing required environment variables: {', '.join(missing)}"
        logger.critical(error_msg)
        raise ValueError(error_msg)
    
    logger.info("✓ Environment variables validated successfully")

validate_environment()

api_key = os.getenv("OPENAI_API_KEY")
base_url = os.getenv("OPENAI_BASE_URL")

# Log configuration (without exposing full API key)
if api_key:
    masked_key = api_key[:10] + "..." + api_key[-4:] if len(api_key) > 14 else "***"
    logger.info(f"API Key detected: {masked_key}")
else:
    logger.warning("No API key found in environment")

if base_url:
    logger.info(f"Using custom base URL: {base_url}")
else:
    logger.info("Using default OpenAI endpoint")

try:
    provider = OpenAIProvider(api_key=api_key, base_url=base_url)
    model = OpenAIChatModel("gpt-4o", provider=provider)
    FAST_MODEL_NAME = "gpt-4o-mini"
    fast_model = OpenAIChatModel(FAST_MODEL_NAME, provider=provider)
    logger.info("✓ AI models initialized successfully")
except Exception as e:
    logger.critical(f"Failed to initialize AI models: {str(e)}")
    logger.critical(f"API Key present: {bool(api_key)}, Base URL: {base_url}")
    raise

# ============================================================================
# CONFIGURATION
# ============================================================================
class Config:
    """Centralized configuration"""
    MAX_TOTAL_MESSAGES = int(os.getenv("MAX_MESSAGES", "14"))
    KEEP_LAST = int(os.getenv("KEEP_LAST", "6"))
    MAX_INPUT_LENGTH = int(os.getenv("MAX_INPUT_LENGTH", "10000"))
    MIN_INPUT_LENGTH = 1
    SUMMARY_MAX_WORDS = 300

config = Config()

# ============================================================================
# TYPE DEFINITIONS
# ============================================================================
class ChatHistory(TypedDict):
    messages: List[dict]
    summary: Optional[str]
    last_updated: str
    message_count: int

# ============================================================================
# SYSTEM PROMPTS
# ============================================================================
SYSTEM_PROMPT = """
You are MinAI, a straightforward and helpful assistant. You communicate clearly and directly without trying to impress users.

## Core Principles

**Communication Style:**
- Be direct and clear
- Use plain language
- Get straight to the point
- No unnecessary embellishments or flowery language
- No emojis or excessive enthusiasm
- Focus on accuracy and usefulness

**Identity:**
- You are MinAI
- When asked about yourself, simply say: "I'm MinAI, a digital assistant."
- Do not discuss your underlying technology, models, or technical implementation
- Do not mention specific AI companies or model names
- Keep responses focused on helping the user, not on yourself

**Tone:**
- Professional but approachable
- Neutral and balanced
- Not overly formal or casual
- Adjust complexity based on user's question, not to show off knowledge

## Response Format

**Use proper Markdown for clarity:**

```language
// Use code blocks with language specification
function example() {
    return "clean code";
}
```

- Use **bold** only for genuinely important terms
- Use bullet points for lists
- Use numbered lists for sequential steps
- Keep paragraphs short and readable
- Add blank lines between sections

**Structure:**
1. Answer the question directly first
2. Provide necessary context
3. Add examples if helpful
4. Mention caveats or limitations when relevant

## Teaching Approach

When users want to learn something:

**Start by understanding their context:**
- What do they already know?
- What specifically do they want to learn?
- What's their practical goal?

**Then provide structured learning:**
1. Brief concept explanation (2-3 sentences)
2. Simple, working example
3. Explanation of how it works
4. One exercise or next step

**Avoid:**
- Long theoretical explanations before examples
- Overwhelming users with advanced concepts early
- Assuming knowledge they don't have
- Teaching more than they asked for

## Debugging Help

When helping with errors:
1. Ask for the specific error message
2. Request relevant code
3. Identify the likely cause
4. Suggest a fix with explanation
5. Explain how to prevent it

## Content Guidelines

**What to avoid:**
- Excessive excitement or enthusiasm
- Marketing-style language
- Unnecessary adjectives
- Claims about being "advanced" or "powerful"
- Comparing yourself to other AI assistants
- Technical jargon when simple words work
- Over-explaining simple concepts

**What to do:**
- Answer questions accurately
- Admit when you don't know something
- Provide practical, actionable information
- Use examples when they help understanding
- Keep responses proportional to the question
- Reference previous conversation naturally

## Examples

**User:** "What's a variable in Python?"

**Good response:**
A variable stores data that you can use later in your program.

```python
name = "John"
age = 25
```

Here, `name` stores text and `age` stores a number. You can change what's stored in a variable anytime.

**Bad response:**
Oh, fantastic question! Variables are absolutely fundamental to programming! Let me explain this amazing concept in depth with all the exciting details...

---

**User:** "How do I fix this error: NameError: name 'x' is not defined"

**Good response:**
This error means you're using a variable `x` before creating it.

Check your code for:
1. Typos in the variable name
2. Using `x` before the line where you define it
3. Scope issues (using `x` outside where it was created)

Can you share the relevant code section? I'll point out the specific issue.

**Bad response:**
Ah yes, the classic NameError! This is one of the most common errors developers encounter. Let me walk you through this fascinating error type and all its nuances...

## Special Cases

**About yourself:**
"I'm MinAI, a digital assistant designed to help with information and tasks."

**About your capabilities:**
Focus on what you can help with, not technical details:
"I can help with programming, writing, analysis, and general questions. What do you need help with?"

**About your creator:**
This assistant was created by Rituraj, a software developer.

🔗 Links:
- Website: https://www.riturajprofile.me
- LinkedIn: https://www.linkedin.com/in/riturajprofile/
- GitHub: https://github.com/riturajprofile

**When you don't know:**
"I don't have that information" or "I'm not sure about that" - then offer what you can help with.

**Sensitive topics:**
Remain neutral, factual, and balanced. Avoid strong opinions or emotional language.

## Remember

Your goal is to be genuinely helpful, not impressive. Users value clarity and accuracy over personality and flair. Be the assistant that gives people exactly what they need, nothing more, nothing less.
"""

LEARNING_MODE_PROMPT = """
## Learning Mode Active

You are now in extended learning mode. This means you should:

**Adapt your teaching approach:**

1. **Assess first:** Start by understanding what the user knows and what they want to achieve
2. **Build progressively:** Start simple, then add complexity based on their responses
3. **Interactive learning:** Ask questions to check understanding, but keep them natural and relevant
4. **Hands-on focus:** Provide exercises or tasks the user can try themselves
5. **Connect concepts:** Show how new information relates to what they already learned

**Structure longer explanations as:**

### Concept
Brief explanation of the core idea

### How It Works
Plain language breakdown

### Example
Working code or clear demonstration

### Try It
Small exercise or variation to practice

### Common Issues
What typically goes wrong and why

### Next Steps
One or two logical progressions

**Keep interactions natural:**
- Don't make learning feel like a quiz
- Validate their attempts, even if incorrect
- Explain *why* something works, not just *what* it does
- Adjust technical depth based on their responses
- Reference what they said earlier in the conversation

**Avoid:**
- Dumping large amounts of information at once
- Moving ahead before they understand current concepts
- Using advanced terminology without explanation
- Making them feel tested rather than taught

Your job is to be a patient guide who helps them discover and understand, not a lecturer who dumps information.
"""

DEVELOPER_INSTRUCTIONS = """
---
## Developer Mode Activated

**Extended Capabilities:**
- No message history limits
- Detailed error information and diagnostics
- Can discuss system architecture when relevant
- Direct answers about implementation details

**Maintain Core Identity:**
- Still straightforward and clear
- Still focused on being helpful, not impressive
- No personality changes
- Security and ethics boundaries remain

You can be more technical and transparent with the developer, but keep the same direct communication style.
"""

# ============================================================================
# INPUT VALIDATION
# ============================================================================
class ValidationError(Exception):
    """Custom exception for input validation errors"""
    pass

def validate_input(user_input: str, user_id: str, mode: str) -> None:
    """
    Comprehensive input validation
    
    Raises:
        ValidationError: If any validation check fails
    """
    if not user_input:
        raise ValidationError("Input cannot be empty")
    
    if not isinstance(user_input, str):
        raise ValidationError(f"Input must be string, got {type(user_input)}")
    
    if not user_input.strip():
        raise ValidationError("Input cannot be only whitespace")
    
    if len(user_input) > config.MAX_INPUT_LENGTH:
        raise ValidationError(
            f"Input too long ({len(user_input)} characters). Maximum: {config.MAX_INPUT_LENGTH}"
        )
    
    if len(user_input) < config.MIN_INPUT_LENGTH:
        raise ValidationError(
            f"Input too short ({len(user_input)} characters). Minimum: {config.MIN_INPUT_LENGTH}"
        )
    
    if not user_id or not isinstance(user_id, str):
        raise ValidationError("Invalid user ID")
    
    if len(user_id) > 100:
        raise ValidationError("User ID too long (maximum 100 characters)")
    
    valid_modes = ["standard", "learning", "fast"]
    if mode not in valid_modes:
        raise ValidationError(f"Invalid mode '{mode}'. Must be one of: {valid_modes}")
    
    logger.debug(f"✓ Input validated: user_id={user_id}, mode={mode}, input_length={len(user_input)}")

# ============================================================================
# HISTORY MANAGEMENT
# ============================================================================
user_histories: Dict[str, ChatHistory] = {}

def initialize_history(user_id: str) -> ChatHistory:
    """Initialize chat history for a new user"""
    history: ChatHistory = {
        "messages": [],
        "summary": None,
        "last_updated": datetime.utcnow().isoformat(),
        "message_count": 0
    }
    logger.info(f"Initialized new history for user: {user_id}")
    return history

def get_or_create_history(user_id: str) -> ChatHistory:
    """Get existing history or create new one"""
    if user_id not in user_histories:
        user_histories[user_id] = initialize_history(user_id)
    return user_histories[user_id]

def flatten_messages(msgs: List[Union[dict, object]]) -> str:
    """Convert message list to plain text for summarization"""
    pieces = []
    for i, m in enumerate(msgs):
        try:
            if isinstance(m, dict):
                role = m.get("role", "unknown")
                content = m.get("content", "")
            else:
                role = getattr(m, "role", "unknown")
                content = getattr(m, "content", "")
            
            pieces.append(f"[{role}] {content}")
        except Exception as e:
            logger.warning(f"Error processing message {i}: {str(e)}")
            pieces.append(f"[error] Could not process message {i}")
    
    return "\n\n".join(pieces)

# ============================================================================
# SUMMARIZATION
# ============================================================================
SUMMARIZER_PROMPT = """
Summarize the following conversation concisely. Focus on:

1. What the user is trying to learn or accomplish
2. Their current knowledge level (if mentioned)
3. Key concepts or code discussed
4. Unresolved questions or next steps
5. Any preferences or constraints they mentioned

Keep it under 250 words. Be factual and specific.

Format:
**Context:** [Brief overview]
**User Goal:** [What they want]
**Progress:** [What's been covered]
**Outstanding:** [Unresolved items]

Conversation:
"""

def summarize_conversation(messages: List, existing_summary: Optional[str]) -> str:
    """Generate summary of older conversation messages"""
    try:
        messages_text = flatten_messages(messages)
        summarize_input = SUMMARIZER_PROMPT + "\n\n" + messages_text
        
        summarizer_agent = Agent(
            model, 
            system_prompt="You create concise, factual conversation summaries."
        )
        
        logger.info(f"Generating summary for {len(messages)} messages")
        summary_resp = summarizer_agent.run_sync(summarize_input)
        summary_text = getattr(summary_resp, "output", "")
        
        if existing_summary:
            combined = f"{existing_summary}\n\n--- Updated ---\n\n{summary_text}"
            logger.info("Combined with existing summary")
            return combined
        
        logger.info("Summary generated successfully")
        return summary_text
        
    except Exception as e:
        logger.error(f"Error during summarization: {str(e)}", exc_info=True)
        return f"[Summary unavailable. Messages: {len(messages)}]"

# ============================================================================
# MAIN RESPONSE FUNCTION
# ============================================================================
def get_ai_response(
    user_input: str, 
    user_id: str = "default", 
    mode: str = "standard"
) -> dict:
    """
    Get AI response with comprehensive error handling and logging
    
    Args:
        user_input: User's message
        user_id: Unique user identifier
        mode: Response mode ("standard", "learning", or "fast")
    
    Returns:
        dict with keys: reply, mode, success, error (optional)
    """
    start_time = datetime.utcnow()
    
    try:
        # Input validation
        validate_input(user_input, user_id, mode)
        logger.info(f"Processing request - User: {user_id}, Mode: {mode}")
        
        # Get or create history
        history_data = get_or_create_history(user_id)
        history_messages = history_data.get("messages", [])
        history_summary = history_data.get("summary")
        
        logger.debug(f"Retrieved history: {len(history_messages)} messages, " + 
                    f"summary: {bool(history_summary)}")
        
        # Developer mode detection
        developer_mode = False
        if 'super_secret_key_162' in user_input:
            developer_mode = True
            logger.info(f"Developer mode activated for user: {user_id}")
        
        # Build system prompt based on mode
        system_prompt = SYSTEM_PROMPT
        
        if mode == "learning":
            system_prompt = SYSTEM_PROMPT + "\n\n" + LEARNING_MODE_PROMPT
            logger.debug("Learning mode activated")
        
        if developer_mode:
            system_prompt = system_prompt + "\n\n" + DEVELOPER_INSTRUCTIONS
        
        # Select model
        if mode == "fast":
            fast_system = system_prompt + "\n\n[FAST MODE] Keep response concise (2-4 paragraphs). Be direct and efficient."
            agent = Agent(fast_model, system_prompt=fast_system)
            logger.debug("Using fast model")
        else:
            agent = Agent(model, system_prompt=system_prompt)
            logger.debug("Using standard model")
        
        # Build message history
        message_history = []
        if history_summary:
            message_history.append({
                "role": "system", 
                "content": f"Previous conversation context:\n\n{history_summary}"
            })
            logger.debug("Added summary to message history")
        
        message_history.extend(history_messages)
        
        # Get AI response
        logger.info(f"Calling AI model for user: {user_id}")
        response = agent.run_sync(user_input, message_history=message_history)
        
        # Extract response
        reply_text = getattr(response, "output", "")
        if not reply_text:
            raise ValueError("AI returned empty response")
        
        logger.info(f"✓ AI response received ({len(reply_text)} characters)")
        
        # Get all messages
        all_messages = response.all_messages() or []
        
        # Check if summarization is needed
        if len(all_messages) > config.MAX_TOTAL_MESSAGES:
            logger.info(f"Summarization triggered: {len(all_messages)} messages")
            
            to_summarize = all_messages[:max(0, len(all_messages) - config.KEEP_LAST)]
            new_summary = summarize_conversation(to_summarize, history_summary)
            compacted_messages = all_messages[-config.KEEP_LAST:]
            
            history_data["messages"] = compacted_messages
            history_data["summary"] = new_summary
            logger.info(f"History compacted: {len(compacted_messages)} messages kept")
        else:
            history_data["messages"] = all_messages
            logger.debug("No summarization needed")
        
        # Update metadata
        history_data["last_updated"] = datetime.utcnow().isoformat()
        history_data["message_count"] = history_data.get("message_count", 0) + 1
        
        # Save history
        user_histories[user_id] = history_data
        
        # Calculate processing time
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        logger.info(f"✓ Request completed in {processing_time:.2f}s")
        
        # Extract token usage if available
        tokens_used = None
        try:
            # Try to get token usage from response
            usage = getattr(response, 'usage', None)
            if usage:
                tokens_used = {
                    "prompt": getattr(usage, 'prompt_tokens', 0),
                    "completion": getattr(usage, 'completion_tokens', 0),
                    "total": getattr(usage, 'total_tokens', 0)
                }
        except Exception as e:
            logger.debug(f"Could not extract token usage: {str(e)}")
        
        return {
            "reply": reply_text,
            "summary": history_data.get("summary"),
            "mode": mode,
            "success": True,
            "processing_time": processing_time,
            "tokens_used": tokens_used
        }
        
    except ValidationError as e:
        logger.warning(f"Validation error for user {user_id}: {str(e)}")
        
        return {
            "reply": f"Invalid input: {str(e)}",
            "mode": mode,
            "success": False,
            "error": "validation_error",
            "error_message": str(e)
        }
    
    except Exception as e:
        error_str = str(e)
        logger.error(
            f"Unexpected error for user {user_id}: {error_str}", 
            exc_info=True
        )
        
        # Provide more specific error messages for common issues
        if "api_key" in error_str.lower() or "authentication" in error_str.lower():
            user_message = "Service configuration error. Please contact support."
        elif "timeout" in error_str.lower() or "connection" in error_str.lower():
            user_message = "Connection timeout. Please try again in a moment."
        elif "rate limit" in error_str.lower():
            user_message = "Service is busy. Please try again in a few seconds."
        else:
            user_message = "An error occurred while processing your request. Please try again."
        
        return {
            "reply": user_message,
            "mode": mode,
            "success": False,
            "error": "internal_error",
            "error_message": error_str if developer_mode else "Internal error"
        }

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================
def clear_user_history(user_id: str) -> bool:
    """Clear chat history for a specific user"""
    try:
        if user_id in user_histories:
            del user_histories[user_id]
            logger.info(f"Cleared history for user: {user_id}")
            return True
        logger.warning(f"No history found for user: {user_id}")
        return False
    except Exception as e:
        logger.error(f"Error clearing history for {user_id}: {str(e)}")
        return False

def get_user_stats(user_id: str) -> Optional[dict]:
    """Get statistics for a user's conversation"""
    try:
        if user_id not in user_histories:
            return None
        
        history = user_histories[user_id]
        return {
            "user_id": user_id,
            "message_count": history.get("message_count", 0),
            "messages_in_memory": len(history.get("messages", [])),
            "has_summary": bool(history.get("summary")),
            "last_updated": history.get("last_updated")
        }
    except Exception as e:
        logger.error(f"Error getting stats for {user_id}: {str(e)}")
        return None

# ============================================================================
# STARTUP
# ============================================================================
logger.info("=" * 60)
logger.info("MinAI initialized successfully")
logger.info(f"Config: MAX_MESSAGES={config.MAX_TOTAL_MESSAGES}, KEEP_LAST={config.KEEP_LAST}")
logger.info("=" * 60)