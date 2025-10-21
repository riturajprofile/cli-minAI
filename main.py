from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from ai import get_ai_response, user_histories
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

app = FastAPI()

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

class Message(BaseModel):
    text: str
    mode: str = "learning"

class ResponseModel(BaseModel):
    reply: str
    mode: str

# ---- UI ROUTE ----
@app.get("/")
async def root():
    """Serve the main HTML page"""
    static_file = os.path.join(static_dir, "index.html")
    if os.path.exists(static_file):
        return FileResponse(static_file)
    return {"message": "Create static/index.html file"}

# ---- API ROUTES ----
@app.post("/chat", response_model=ResponseModel)
async def chat_endpoint(message: Message, request: Request):
    user_id = request.client.host
    
    # Run in thread-safe manner
    response_data = await run_in_threadpool(
        get_ai_response, 
        message.text, 
        user_id=user_id, 
        mode=message.mode
    )
    
    return ResponseModel(**response_data)

@app.get("/history/{user_id}")
async def get_history(user_id: str):
    """Get chat history for a user"""
    history = user_histories.get(user_id, [])
    formatted_history = []
    for msg in history:
        formatted_history.append({
            "role": msg.role if hasattr(msg, 'role') else "unknown",
            "content": msg.content if hasattr(msg, 'content') else str(msg)
        })
    return {"history": formatted_history}
