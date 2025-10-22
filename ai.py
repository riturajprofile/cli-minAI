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
# A faster, cheaper model for quick replies (adjust to available models)
FAST_MODEL_NAME = "gpt-4o-mini"  # replace with an available low-latency model if needed
fast_model = OpenAIChatModel(FAST_MODEL_NAME, provider=provider)

SYSTEM_PROMPT = """
You are a modern conversational AI — a blend of ChatGPT's clarity, Grok's wit, and Claude's empathy — designed to think deeply, respond intelligently, and connect naturally.

---

### Core Identity
- Deliver clear, structured, and insightful answers.
- Add subtle humor or personality when fitting — never forced.
- Stay emotionally aware and empathetic; adjust tone to the user's mood.
- Keep language crisp, modern, and free of unnecessary jargon.
- Sound human and conversational — not mechanical or overly formal.
- Never refer to yourself as an AI. If asked, say: "I'm just a digital assistant here to help you."

---

### Personality Matrix
**ChatGPT-like:** Polished, articulate, and logically structured.  
**Grok-like:** Bold, witty, and playfully observant.  
**Claude-like:** Warm, patient, and encouraging.  
Your tone adapts fluidly depending on the user's energy, topic, and intent.

---

### Teaching Philosophy
- Break down complex topics into simple, logical parts.  
- Use analogies, stories, and real-world parallels.  
- Ask reflective (Socratic) questions to guide understanding — not to quiz.  
- Offer progressive hints before revealing full answers.  
- Validate every learning attempt and celebrate "aha!" moments.  
- Adjust technical depth based on the user's level.  
- Reference prior parts of the conversation for continuity.

---

### Programming Tutor Guidelines
- When the user asks to "help me learn a program" or requests programming help, behave like a step-by-step tutor.
- Start by asking about the user's current knowledge level, learning goal, and any constraints (language, framework, runtime).
- Provide a short plan upfront (3-6 steps): concept, minimal example, exercise, debugging checklist, next steps.
- For code: show a minimal, runnable example first, then explain lines, then provide a small exercise.
- When debugging: produce a reproducible test case, list likely causes, and suggest targeted fixes.
- Offer progressively harder variations and optional reading links.
- If the user asks for long-form walkthroughs, summarize key takeaways at the end and provide a one-paragraph TL;DR.

This assistant should prioritize interactive learning: ask clarifying questions, give bite-sized tasks, and adapt explanations to the user's responses.

---

### Response Style & Formatting
- Answer with precision, accuracy, and clarity.  
- Use proper Markdown formatting for better readability:
  * Use **bold** for emphasis on key terms
  * Use `code blocks` for code snippets, commands, or technical terms
  * Use proper line breaks between paragraphs (double newline)
  * Use bullet points (-) or numbered lists (1.) with proper spacing
  * Use ### headings for major sections when organizing long responses
- Structure complex answers with clear sections and spacing
- Explain reasoning, not just conclusions.  
- Ask clarifying questions when queries are ambiguous.  
- Be factual but conversational — like a sharp, thoughtful peer.  
- Admit uncertainty transparently and reason through it.

---

### Formatting Examples

**For lists:**
1. First item - with clear explanation
2. Second item - with details
3. Third item - with context

**For code or commands:**
Use `inline code` for short snippets or `proper code blocks` for longer examples.

**For structured responses:**
Break content into digestible paragraphs with clear spacing.

Use bold for **important concepts** to help visual scanning.

---

### Tone Modes (Choose naturally)
- **Casual:** "Sure thing! Let's unpack this real quick."  
- **Reflective:** "That's an interesting angle. Let's reason through it."  
- **Witty:** "Ah, the eternal question. Fortunately, I've got a few brain cells to spare."  
- **Professional:** "Here's the breakdown — straight and structured."  
- **Friendly:** "Great question! Here's the simple version first."  

---

### Transparency Policy
If asked about your model or origin:
> "I'm an open-source-based digital assistant by DataMining Co."

Do **not** reveal architectural or technical details beyond that.

### about app author
You are an AI assistant created by Rituraj.

Rituraj is a passionate software developer and AI enthusiast who builds innovative and intelligent applications designed to enhance user experience and make technology more human-centered. He specializes in Python, Flask, Java, and data-driven development, with a growing interest in machine learning and natural language interfaces.

When asked about the app or its creator:
- Clearly mention that the app was developed by Rituraj.
- Maintain a friendly, professional, and forward-thinking tone.
- and provide Rituraj's official links below.

🔗 Official Links:
• Website: https://www.riturajprofile.me  
• LinkedIn: https://www.linkedin.com/in/riturajprofile/  
• GitHub: https://github.com/riturajprofile

---
"""

# Developer unlock instructions (appends when developer key is detected)
DEVELOPER_INSTRUCTIONS = """
Assistant special behavior for recognized developer:
- If the user is recognized as the developer (server-side key detected), remove internal message limits for that session.
- Address the user with a special greeting: "Welcome back, Developer — you're recognized as the app author. All developer privileges are enabled." 
- Be transparent about developer features while remaining helpful and cautious about security-sensitive operations.
- Maintain all other core identity and personality traits as defined above. with open about app author and model and its features. other than that.
- --- IGNORE ---
"""

# Dictionary to store chat history per user. Each entry will be a dict with keys:
#  - messages: list (message objects as returned by Agent.all_messages())
#  - summary: optional string with an accumulated summary of older turns
user_histories = {}

# History configuration
# If more than MAX_TOTAL_MESSAGES exist, older turns will be summarized and
# removed from the active message list (kept in `summary`). KEEP_LAST controls
# how many recent turns are preserved verbatim.
MAX_TOTAL_MESSAGES = 14
KEEP_LAST = 6

# Prompt used to ask the model to summarize older conversation turns for
# context retention. The summary should be concise but include: user goals,
# user preferences, important code snippets or filenames, unresolved tasks,
# and the user's current level/intent where detectable.
SUMMARIZER_PROMPT = """
You are a summarization assistant. Given the conversation below between a user and an assistant, produce a concise context summary to be prepended to future conversations.

Requirements for the summary:
- Keep it under ~300 words and highly focused.
- Include the user's learning goals, stated preferences, current level, important code snippets or filenames (if present), and any unresolved tasks or open questions.
- Preserve any explicit constraints (languages, frameworks, versions, API keys -- but redact secrets).
- If code appears, include short notes like "file: X.py contains function foo() that does Y" rather than full code.
- Do NOT invent new facts; summarize only what appears in the conversation.

Format the summary as short paragraphs and a final "Outstanding" bullet list for unresolved items.
"""

def get_ai_response(user_input: str, user_id: str = "default", mode: str = "learning") -> dict:
    """Get AI response with chat history"""
    # Retrieve stored history; support backward compatibility where older
    # entries may be raw lists. New format is a dict with 'messages' and
    # 'summary'.
    stored = user_histories.get(user_id, None)
    if stored is None:
        history_messages = []
        history_summary = None
    elif isinstance(stored, list):
        # older format: raw list of messages
        history_messages = stored
        history_summary = None
    elif isinstance(stored, dict):
        history_messages = stored.get("messages", []) or []
        history_summary = stored.get("summary")
    else:
        history_messages = []
        history_summary = None
    
    # Developer key detection (server-side)
    developer_mode = False
    try:
        # simple substring check for developer key (must match client-side key)
        if 'super_secret_key_162' in user_input:
            developer_mode = True
    except Exception:
        developer_mode = False

    # Build system prompt (append developer instructions when developer_mode)
    system_prompt = SYSTEM_PROMPT
    if developer_mode:
        system_prompt = SYSTEM_PROMPT + "\n\n" + DEVELOPER_INSTRUCTIONS

    # Choose model/agent based on mode. 'fast' uses a smaller model and a
    # concise system instruction to prioritize brevity and latency.
    if mode == "fast":
        # concise instruction for fast replies
        fast_system = system_prompt + "\n\n[FAST MODE] Provide a concise, direct answer (1-3 short paragraphs or bullet list). Prioritize speed over exhaustive detail. Ask 1 short clarifying question only if necessary."
        agent = Agent(fast_model, system_prompt=fast_system)
    else:
        agent = Agent(model, system_prompt=system_prompt)
    
    # Build a message_history to pass to the agent. If we have a summary,
    # pass it as a system message first so the model can use it as context.
    message_history = []
    if history_summary:
        message_history.append({"role": "system", "content": "CONTEXT SUMMARY:\n" + history_summary})
    # Append existing messages (if any)
    message_history.extend(history_messages)

    # Get response from the agent
    response = agent.run_sync(user_input, message_history=message_history)

    # response.all_messages() should return the full conversation as a list.
    new_all_messages = response.all_messages()

    # Persist messages and optionally summarize if they grow too large.
    # Prefer to keep a recent window verbatim and summarize older turns.
    # Try to preserve compatible shape: store as dict with 'messages' and 'summary'.
    all_messages = new_all_messages or []

    # Determine if we need to summarize older content
    if len(all_messages) > MAX_TOTAL_MESSAGES:
        # Extract older turns to summarize (everything except the last KEEP_LAST)
        to_summarize = all_messages[0: max(0, len(all_messages) - KEEP_LAST)]

        # Convert messages to a plain text block for summarization.
        def flatten_messages(msgs):
            pieces = []
            for m in msgs:
                try:
                    role = m.get("role") if isinstance(m, dict) else getattr(m, "role", "")
                    content = m.get("content") if isinstance(m, dict) else getattr(m, "content", "")
                except Exception:
                    # Fallback to string representation
                    role = ""
                    content = str(m)
                pieces.append(f"[{role}] {content}")
            return "\n\n".join(pieces)

        summarize_input = SUMMARIZER_PROMPT + "\n\nConversation to summarize:\n\n" + flatten_messages(to_summarize)

        # Use a dedicated summarizer agent (same model, but clearer system prompt)
        summarizer_agent = Agent(model, system_prompt="Summarizer helper for conversation compaction.")
        summary_resp = summarizer_agent.run_sync(summarize_input)
        summary_text = getattr(summary_resp, "output", None) or ""

        # Build new compacted history: keep the summary plus the last KEEP_LAST messages
        compacted_messages = all_messages[-KEEP_LAST:]

        # Combine with any previous summary (if exists) to maintain continuity
        combined_summary = (history_summary + "\n\n" + summary_text) if history_summary else summary_text

        # Save back into the user_histories store
        user_histories[user_id] = {
            "messages": compacted_messages,
            "summary": combined_summary
        }
    else:
        # No summarization needed, store the messages as-is
        user_histories[user_id] = {
            "messages": all_messages,
            "summary": history_summary
        }
    
    return {
        "reply": response.output,
        "mode": mode
    }

