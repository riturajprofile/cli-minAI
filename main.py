from fastapi import FastAPI, Request, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, validator
from ai import get_ai_response, clear_user_history, get_user_stats
from dotenv import load_dotenv
import os
import logging
from typing import Optional, Dict, Any
from datetime import datetime
import mimetypes

# Import Google Sheets logger
try:
    from google_sheets_logger import sheets_logger, calculate_token_cost
    SHEETS_LOGGING_AVAILABLE = True
except ImportError:
    SHEETS_LOGGING_AVAILABLE = False

# ============================================================================
# LOGGING CONFIGURATION
# ============================================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('server.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ============================================================================
# ENVIRONMENT SETUP
# ============================================================================
load_dotenv()

# Validate required environment variables
REQUIRED_ENV_VARS = ["OPENAI_API_KEY"]
missing_vars = [var for var in REQUIRED_ENV_VARS if not os.getenv(var)]
if missing_vars:
    logger.critical(f"Missing environment variables: {', '.join(missing_vars)}")
    raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

# ============================================================================
# APP CONFIGURATION
# ============================================================================
app = FastAPI(
    title="MinAI API",
    description="Straightforward AI assistant API",
    version="1.0.0"
)

# CORS Configuration
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)

# Static files setup
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
    logger.info(f"✓ Static files mounted from: {static_dir}")
else:
    logger.warning(f"⚠ Static directory not found: {static_dir}")

# ============================================================================
# CONFIGURATION
# ============================================================================
class Config:
    """Application configuration"""
    MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", str(10 * 1024 * 1024)))  # 10MB default
    MAX_MESSAGE_LENGTH = int(os.getenv("MAX_MESSAGE_LENGTH", "10000"))
    SUPPORTED_TEXT_EXTENSIONS = (
        '.txt', '.py', '.js', '.jsx', '.ts', '.tsx', '.md', '.json', 
        '.xml', '.html', '.css', '.java', '.cpp', '.c', '.h', '.go', 
        '.rs', '.rb', '.php', '.swift', '.kt', '.scala', '.sh', 
        '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf', '.log', 
        '.csv', '.sql', '.r', '.lua', '.dart', '.vim', '.el'
    )
    SUPPORTED_PDF_EXTENSIONS = ('.pdf',)

config = Config()

# ============================================================================
# PYDANTIC MODELS
# ============================================================================
class Message(BaseModel):
    """Chat message model"""
    text: str = Field(..., min_length=1, max_length=config.MAX_MESSAGE_LENGTH)
    mode: str = Field(default="standard", pattern="^(standard|learning|fast)$")
    
    @validator('text')
    def validate_text(cls, v):
        if not v.strip():
            raise ValueError("Message cannot be empty or only whitespace")
        return v.strip()

class ResponseModel(BaseModel):
    """Standard API response model"""
    reply: str
    summary: Optional[str] = None
    success: bool = True
    mode: Optional[str] = None
    processing_time: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None

class ErrorResponse(BaseModel):
    """Error response model"""
    error: str
    detail: Optional[str] = None
    success: bool = False

class HistoryStatsResponse(BaseModel):
    """User history statistics response"""
    user_id: str
    message_count: int
    messages_in_memory: int
    has_summary: bool
    last_updated: Optional[str]

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================
def get_client_id(request: Request) -> str:
    """
    Extract a unique client identifier from the request.
    Uses X-Forwarded-For header if available (for proxy/load balancer scenarios)
    """
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For can contain multiple IPs, take the first one
        client_ip = forwarded_for.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "unknown"
    
    logger.debug(f"Client identified as: {client_ip}")
    return client_ip

def validate_file_size(file_size: int) -> None:
    """Validate file size"""
    if file_size > config.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {config.MAX_FILE_SIZE / (1024*1024):.1f}MB"
        )

def get_file_extension(filename: str) -> str:
    """Get lowercase file extension"""
    return os.path.splitext(filename.lower())[1]

def is_supported_text_file(filename: str) -> bool:
    """Check if file is a supported text format"""
    return get_file_extension(filename) in config.SUPPORTED_TEXT_EXTENSIONS

def is_supported_pdf_file(filename: str) -> bool:
    """Check if file is a PDF"""
    return get_file_extension(filename) in config.SUPPORTED_PDF_EXTENSIONS

async def extract_text_from_file(file: UploadFile) -> tuple[str, Optional[str]]:
    """
    Extract text content from uploaded file.
    
    Returns:
        tuple: (file_content, error_message)
    """
    try:
        content = await file.read()
        filename = file.filename.lower()
        
        # Validate file size
        validate_file_size(len(content))
        
        # Handle text files
        if is_supported_text_file(filename):
            try:
                text_content = content.decode('utf-8')
                logger.info(f"✓ Text file processed: {file.filename} ({len(text_content)} chars)")
                return text_content, None
            except UnicodeDecodeError:
                logger.warning(f"Failed to decode file as UTF-8: {file.filename}")
                return "", "Could not decode file. Please ensure it's UTF-8 encoded."
        
        # Handle PDF files
        elif is_supported_pdf_file(filename):
            try:
                import PyPDF2
                from io import BytesIO
                
                pdf_reader = PyPDF2.PdfReader(BytesIO(content))
                pdf_text = ""
                
                for i, page in enumerate(pdf_reader.pages):
                    try:
                        pdf_text += page.extract_text() + "\n"
                    except Exception as e:
                        logger.warning(f"Error extracting page {i} from PDF: {str(e)}")
                        continue
                
                if not pdf_text.strip():
                    return "", "PDF appears to be empty or contains only images."
                
                logger.info(f"✓ PDF processed: {file.filename} ({len(pdf_text)} chars)")
                return pdf_text, None
                
            except ImportError:
                logger.error("PyPDF2 not installed")
                return "", "PDF support not available. Please contact administrator."
            except Exception as e:
                logger.error(f"Error reading PDF {file.filename}: {str(e)}")
                return "", f"Error reading PDF: {str(e)}"
        
        else:
            supported = list(config.SUPPORTED_TEXT_EXTENSIONS) + list(config.SUPPORTED_PDF_EXTENSIONS)
            return "", f"Unsupported file type. Supported formats: {', '.join(supported)}"
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error processing file {file.filename}: {str(e)}", exc_info=True)
        return "", f"Error processing file: {str(e)}"

# ============================================================================
# EXCEPTION HANDLERS
# ============================================================================
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    logger.warning(f"HTTP {exc.status_code}: {exc.detail} - Path: {request.url.path}")
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.detail,
            detail=str(exc.detail)
        ).dict()
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    logger.error(f"Unexpected error on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error="Internal server error",
            detail="An unexpected error occurred. Please try again later."
        ).dict()
    )

# ============================================================================
# ROUTES - UI
# ============================================================================
@app.get("/")
async def root():
    """Serve the main HTML page"""
    possible_paths = [
        os.path.join(static_dir, "index.html"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "index.html"),
        "static/index.html",
        "/app/static/index.html"
    ]
    
    for static_file in possible_paths:
        if os.path.exists(static_file):
            logger.debug(f"Serving index.html from: {static_file}")
            return FileResponse(static_file)
    
    logger.error("index.html not found in any expected location")
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Application frontend not found"
    )

# ============================================================================
# ROUTES - API
# ============================================================================
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "MinAI API"
    }

@app.post("/chat", response_model=ResponseModel)
async def chat_endpoint(message: Message, request: Request):
    """
    Standard chat endpoint.
    
    **Modes:**
    - `standard`: Normal conversational responses
    - `learning`: Extended teaching mode with progressive examples
    - `fast`: Quick, concise answers
    """
    user_id = get_client_id(request)
    
    try:
        logger.info(f"Chat request from {user_id} - Mode: {message.mode}")
        
        # Get AI response in thread pool
        response_data = await run_in_threadpool(
            get_ai_response,
            message.text,
            user_id=user_id,
            mode=message.mode
        )
        
        if not response_data.get("success", False):
            logger.warning(f"AI response failed for {user_id}: {response_data.get('error')}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=response_data.get("error_message", "Failed to generate response")
            )
        
        logger.info(f"✓ Chat response sent to {user_id} ({response_data.get('processing_time', 0):.2f}s)")
        
        return ResponseModel(
            reply=response_data["reply"],
            summary=response_data.get("summary"),
            mode=response_data.get("mode"),
            processing_time=response_data.get("processing_time"),
            success=True
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat endpoint for {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process chat request"
        )

@app.post("/chat-with-file", response_model=ResponseModel)
async def chat_with_file_endpoint(
    request: Request,
    text: str = Form(...),
    mode: str = Form(default="standard"),
    file: Optional[UploadFile] = File(None)
):
    """
    Chat endpoint with optional file upload.
    
    **Supported file types:**
    - Text files: .txt, .py, .js, .md, .json, .html, .css, etc.
    - PDF files: .pdf
    
    **Parameters:**
    - `text`: Your message/question
    - `mode`: Response mode (standard/learning/fast)
    - `file`: Optional file attachment
    """
    user_id = get_client_id(request)
    
    try:
        # Validate mode
        if mode not in ["standard", "learning", "fast"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid mode '{mode}'. Must be: standard, learning, or fast"
            )
        
        # Validate text length
        if len(text) > config.MAX_MESSAGE_LENGTH:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Message too long. Maximum: {config.MAX_MESSAGE_LENGTH} characters"
            )
        
        if not text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message cannot be empty"
            )
        
        logger.info(f"Chat-with-file request from {user_id} - Mode: {mode}, Has file: {file is not None}")
        
        combined_message = text.strip()
        
        # Process file if provided
        if file:
            logger.info(f"Processing file: {file.filename} ({file.content_type})")
            
            file_content, error = await extract_text_from_file(file)
            
            if error:
                logger.warning(f"File processing error for {user_id}: {error}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=error
                )
            
            if file_content:
                file_context = f"\n\n--- File: {file.filename} ---\n{file_content}\n--- End of File ---\n\n"
                combined_message = f"{text.strip()}\n{file_context}"
                logger.info(f"✓ File content added to message ({len(file_content)} chars)")
        
        # Get AI response
        response_data = await run_in_threadpool(
            get_ai_response,
            combined_message,
            user_id=user_id,
            mode=mode
        )
        
        if not response_data.get("success", False):
            logger.warning(f"AI response failed for {user_id}: {response_data.get('error')}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=response_data.get("error_message", "Failed to generate response")
            )
        
        logger.info(f"✓ Chat-with-file response sent to {user_id} ({response_data.get('processing_time', 0):.2f}s)")
        
        # Log to Google Sheets if file was uploaded
        if SHEETS_LOGGING_AVAILABLE and file:
            try:
                file_info = {
                    "name": file.filename,
                    "size": len(file_content) if 'file_content' in locals() else 0,
                    "type": file.content_type
                }
                
                tokens_used = response_data.get("tokens_used")
                model_name = "gpt-4o-mini" if mode == "fast" else "gpt-4o"
                cost_estimate = calculate_token_cost(tokens_used, model_name) if tokens_used else 0.0
                
                sheets_logger.log_chat_interaction(
                    user_id=user_id,
                    user_message=text,
                    ai_response=response_data["reply"],
                    mode=mode,
                    processing_time=response_data.get("processing_time", 0.0),
                    tokens_used=tokens_used,
                    model_name=model_name,
                    success=True,
                    has_file=True,
                    file_info=file_info
                )
            except Exception as log_error:
                logger.warning(f"Failed to log file upload to Sheets: {str(log_error)}")
        
        return ResponseModel(
            reply=response_data["reply"],
            summary=response_data.get("summary"),
            mode=response_data.get("mode"),
            processing_time=response_data.get("processing_time"),
            metadata={"file_processed": file is not None} if file else None,
            success=True
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat-with-file endpoint for {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process request"
        )

@app.delete("/history/{user_id}")
async def clear_history(user_id: str, request: Request):
    """
    Clear chat history for a specific user.
    
    **Note:** Only the user themselves can clear their history (verified by IP)
    """
    request_user_id = get_client_id(request)
    
    # Security check: users can only clear their own history
    if user_id != request_user_id:
        logger.warning(f"Unauthorized history clear attempt: {request_user_id} tried to clear {user_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only clear your own chat history"
        )
    
    try:
        success = await run_in_threadpool(clear_user_history, user_id)
        
        if success:
            logger.info(f"✓ History cleared for user: {user_id}")
            return {"success": True, "message": "Chat history cleared successfully"}
        else:
            logger.info(f"No history found for user: {user_id}")
            return {"success": True, "message": "No history to clear"}
    
    except Exception as e:
        logger.error(f"Error clearing history for {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear chat history"
        )

@app.get("/stats", response_model=HistoryStatsResponse)
async def get_stats(request: Request):
    """
    Get conversation statistics for the current user.
    """
    user_id = get_client_id(request)
    
    try:
        stats = await run_in_threadpool(get_user_stats, user_id)
        
        if not stats:
            logger.info(f"No stats found for user: {user_id}")
            # Return empty stats
            return HistoryStatsResponse(
                user_id=user_id,
                message_count=0,
                messages_in_memory=0,
                has_summary=False,
                last_updated=None
            )
        
        logger.debug(f"Stats retrieved for user: {user_id}")
        return HistoryStatsResponse(**stats)
    
    except Exception as e:
        logger.error(f"Error getting stats for {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve statistics"
        )

# ============================================================================
# STARTUP/SHUTDOWN EVENTS
# ============================================================================
@app.on_event("startup")
async def startup_event():
    """Log startup information"""
    logger.info("=" * 60)
    logger.info("MinAI API Server Starting")
    logger.info(f"Static directory: {static_dir}")
    logger.info(f"Max file size: {config.MAX_FILE_SIZE / (1024*1024):.1f}MB")
    logger.info(f"Max message length: {config.MAX_MESSAGE_LENGTH} chars")
    logger.info("=" * 60)

@app.on_event("shutdown")
async def shutdown_event():
    """Log shutdown information"""
    logger.info("MinAI API Server Shutting Down")

# ============================================================================
# MAIN
# ============================================================================
if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"Starting server on {host}:{port}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=os.getenv("ENVIRONMENT", "production") == "development",
        log_level="info"
    )