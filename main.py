from fastapi import FastAPI, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from ai import get_ai_response
from dotenv import load_dotenv
import os
from typing import Optional

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
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

class Message(BaseModel):
    text: str
    mode: str = "learning"

class ResponseModel(BaseModel):
    reply: str

# ---- UI ROUTE ----
@app.get("/")
async def root():
    """Serve the main HTML page"""
    # Try multiple possible paths
    possible_paths = [
        os.path.join(static_dir, "index.html"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "index.html"),
        "static/index.html",
        "/app/static/index.html"  # Railway typical path
    ]
    
    for static_file in possible_paths:
        if os.path.exists(static_file):
            return FileResponse(static_file)
    
    # Debug info
    return {
        "message": "Static file not found",
        "static_dir": static_dir,
        "cwd": os.getcwd(),
        "file_location": os.path.abspath(__file__),
        "tried_paths": possible_paths
    }

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
    
    return ResponseModel(reply=response_data["reply"])


@app.post("/chat-with-file", response_model=ResponseModel)
async def chat_with_file_endpoint(
    request: Request,
    text: str = Form(...),
    mode: str = Form(default="learning"),
    file: Optional[UploadFile] = File(None)
):
    """
    Handle chat with optional file upload.
    Supports text files (.txt, .py, .js, .md, etc.) and PDFs.
    """
    user_id = request.client.host
    file_content = ""
    
    if file:
        # Read file content
        content = await file.read()
        filename = file.filename.lower()
        
        # Handle text-based files
        if filename.endswith(('.txt', '.py', '.js', '.jsx', '.ts', '.tsx', '.md', 
                              '.json', '.xml', '.html', '.css', '.java', '.cpp', 
                              '.c', '.h', '.go', '.rs', '.rb', '.php', '.swift', 
                              '.kt', '.scala', '.sh', '.yml', '.yaml', '.toml', 
                              '.ini', '.cfg', '.conf', '.log', '.csv')):
            try:
                file_content = content.decode('utf-8')
                file_context = f"\n\n--- File: {file.filename} ---\n{file_content}\n--- End of File ---\n\n"
            except UnicodeDecodeError:
                return ResponseModel(reply="Error: Could not decode text file. Please ensure it's UTF-8 encoded.")
        
        # Handle PDF files
        elif filename.endswith('.pdf'):
            try:
                import PyPDF2
                from io import BytesIO
                
                pdf_reader = PyPDF2.PdfReader(BytesIO(content))
                pdf_text = ""
                for page in pdf_reader.pages:
                    pdf_text += page.extract_text() + "\n"
                
                file_context = f"\n\n--- PDF File: {file.filename} ---\n{pdf_text}\n--- End of PDF ---\n\n"
            except ImportError:
                return ResponseModel(reply="Error: PDF support not installed. Please install PyPDF2: pip install PyPDF2")
            except Exception as e:
                return ResponseModel(reply=f"Error reading PDF: {str(e)}")
        
        else:
            return ResponseModel(reply=f"Error: Unsupported file type. Supported: text files and PDFs.")
        
        # Combine user message with file content
        combined_message = f"{text}\n{file_context}"
    else:
        combined_message = text
    
    # Get AI response
    response_data = await run_in_threadpool(
        get_ai_response,
        combined_message,
        user_id=user_id,
        mode=mode
    )
    
    return ResponseModel(reply=response_data["reply"])

