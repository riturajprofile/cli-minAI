import os
import json
import re
from dotenv import load_dotenv
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from prompts import MODE_PROMPTS

# Load environment variables
load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
base_url = os.getenv("OPENAI_BASE_URL")

if not api_key:
    raise ValueError("Missing OPENAI_API_KEY in environment variables.")

provider = OpenAIProvider(api_key=api_key, base_url=base_url)
model = OpenAIChatModel("gpt-4o", provider=provider)

# Dictionary to store chat history per user
user_histories = {}

def get_ai_response(user_input: str, user_id: str = "default", mode: str = "learning") -> dict:
    """Get AI response with mode support and visualization extraction"""
    # Get or initialize history
    history = user_histories.get(user_id, [])
    
    # Create agent with mode-specific prompt
    mode_prompt = MODE_PROMPTS.get(mode, MODE_PROMPTS["learning"])
    mode_agent = Agent(model, system_prompt=mode_prompt)
    
    # Get response
    response = mode_agent.run_sync(user_input, message_history=history)
    
    # Update history
    user_histories[user_id] = response.all_messages()
    
    # Extract visualization data if present
    reply_text = response.output
    viz_data = None
    
    # Look for VIZDATA block in response
    viz_pattern = r'```VIZDATA\s*(\{.*?\})\s*```'
    match = re.search(viz_pattern, reply_text, re.DOTALL)
    
    if match:
        try:
            viz_data = json.loads(match.group(1))
            # Remove VIZDATA block from reply text for clean display
            reply_text = re.sub(viz_pattern, '', reply_text, flags=re.DOTALL).strip()
        except json.JSONDecodeError:
            # If JSON parsing fails, keep original text
            pass
    
    return {
        "reply": reply_text,
        "mode": mode,
        "visualization": viz_data
    }

