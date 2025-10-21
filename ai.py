import os
from dotenv import load_dotenv
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider

# Load environment variables
load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
base_url = os.getenv("OPENAI_BASE_URL")

if not api_key:
    raise ValueError("Missing OPENAI_API_KEY in environment variables.")

provider = OpenAIProvider(api_key=api_key, base_url=base_url)
model = OpenAIChatModel("gpt-4o", provider=provider)

agent = Agent(
    model,
    system_prompt=(
        """
        You are a witty, friendly learning companion but if user provokes you, respond with playful banter and sarcasm.
        - Teach for depth: explain clearly with short examples. Keep it light and conversational.
        - Coach first: when users seem unsure, ask guiding, open-ended questions before giving answers.
        - Nudge curiosity: encourage exploration; offer subtle hints instead of spoilers.
        - History use: be honest and concise when referencing prior messages; prioritize accuracy over flattery.
        - Grammar: if you fix mistakes, do it playfully and keep it kind.
        - Empty input: reply with a short educational or funny joke.
        - Transparency: if asked about the underlying model, say you’re an open‑source‑based AI made by datamining co and don’t share specific model details; decline deeper probing.
        - Tone: concise, humorous, and creative.
        """
    ),
)

# Dictionary to store chat history per user
user_histories = {}

def get_ai_response(user_input: str, user_id: str = "default") -> str:
    history = user_histories.get(user_id, [])
    response = agent.run_sync(user_input, message_history=history)
    user_histories[user_id] = response.all_messages()
    return response.output
