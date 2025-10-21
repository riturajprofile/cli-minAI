<div align="center">

# MinAI

**A modern conversational AI web application with Claude-inspired UI, powered by Pydantic AI and FastAPI**

[![Python](https://img.shields.io/badge/Python-3.13+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.119+-green.svg)](https://fastapi.tiangolo.com/)
[![Pydantic AI](https://img.shields.io/badge/Pydantic_AI-1.1+-purple.svg)](https://ai.pydantic.dev/)
[![Vue.js](https://img.shields.io/badge/Vue.js-3-brightgreen.svg)](https://vuejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Features](#features) • [Quick Start](#quick-start) • [Documentation](#documentation) • [Deployment](#deployment)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

MinAI is a full-stack AI chat application that combines the power of [Pydantic AI](https://ai.pydantic.dev/) with [FastAPI](https://fastapi.tiangolo.com/) to create an intelligent, conversational AI agent. The application features a modern, Claude-inspired UI with a collapsible sidebar, markdown rendering, and persistent chat sessions stored in the browser.

### Key Highlights

- **Modern Claude-Inspired UI**: Beautiful, responsive interface with light/dark themes
- **Collapsible Sidebar**: Sticky sidebar with chat history that adjusts main content area
- **Persistent Sessions**: Chat history saved in browser localStorage
- **Markdown Support**: Rich text formatting with marked.js library
- **Intelligent Conversations**: Powered by OpenAI's GPT-4o model
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Docker Ready**: Containerized for easy deployment
- **Cloud Deployable**: Railway.app configuration included

---

## Features

### UI/UX Features

- **Claude-Style Theme** - Professional color scheme with smooth transitions
- **Sticky Sidebar Navigation** - Collapsible sidebar that pushes content
- **Chat Session Management** - Create, switch between, and persist multiple conversations
- **Markdown Rendering** - Code blocks, lists, links, and rich formatting
- **Responsive Layout** - Optimized for mobile, tablet, and desktop
- **Dark/Light Mode** - Theme toggle with localStorage persistence
- **Floating Input Area** - Distraction-free chat input that adjusts to sidebar
- **Logo Integration** - Custom SVG logo support with rounded styling

### Core Capabilities

- **Web-based Chat Interface** - Vue.js 3 powered reactive UI
- **RESTful API** - Well-documented endpoints for chat interactions
- **Session Management** - Browser-based chat history with auto-save
- **CORS Support** - Cross-origin resource sharing enabled
- **Environment Configuration** - Secure `.env` file support
- **Multiple Deployment Options** - Docker, Railway, or traditional hosting

### AI Features

- **Context-Aware Responses** - Maintains conversation flow with per-user history
- **Learning Mode** - Optimized for educational interactions
- **Custom System Prompts** - Tailored personality and behavior
- **Markdown Formatting** - AI responses with proper structure and formatting
- **Multi-Model Support** - Compatible with various OpenAI models

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.13 or higher** - [Download Python](https://www.python.org/downloads/)
- **pip** - Python package installer (comes with Python)
- **OpenAI API Key** - [Get your API key](https://platform.openai.com/api-keys)

### Optional Tools

- **Docker** - For containerized deployment
- **uv** - For faster dependency installation

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/riturajprofile/basic-ai.git
cd basic-ai
```

### 2. Set Up Virtual Environment

```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Linux/macOS:
source .venv/bin/activate

# Windows (PowerShell):
.venv\Scripts\activate

# Windows (Command Prompt):
.venv\Scripts\activate.bat
```

### 3. Install Dependencies

**Using pip:**
```bash
pip install -r requirements.txt
```

**Or using uv (faster):**
```bash
uv pip install fastapi pydantic pydantic-ai python-dotenv uvicorn
```

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Required
OPENAI_API_KEY=sk-your-api-key-here

# Optional (defaults to OpenAI)
OPENAI_BASE_URL=https://api.openai.com/v1
```

### 5. Run the Application

```bash
# Using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or using the start script (if available)
bash start.sh
```

### 6. Access the Application

Open your browser and navigate to:

- **Web Interface**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Alternative API Docs**: http://localhost:8000/redoc

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | - | Your OpenAI API key |
| `OPENAI_BASE_URL` | No | `https://api.openai.com/v1` | Custom API endpoint URL |

### Setting Environment Variables

**Option 1: `.env` File (Recommended)**

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxx
OPENAI_BASE_URL=https://api.openai.com/v1
```

**Option 2: Shell Export**

```bash
# Linux/macOS/WSL
export OPENAI_API_KEY="sk-your-api-key"
export OPENAI_BASE_URL="https://api.openai.com/v1"

# Windows PowerShell
$env:OPENAI_API_KEY="sk-your-api-key"
$env:OPENAI_BASE_URL="https://api.openai.com/v1"
```

### Model Customization

Edit `ai.py` to change the AI model:

```python
# Line 17 in ai.py
model = OpenAIChatModel("gpt-4o", provider=provider)
```

**Available Models:**
- `gpt-4o` (default - recommended)
- `gpt-4-turbo`
- `gpt-4`
- `gpt-3.5-turbo`
- Any custom model from your endpoint

### System Prompt Customization

The AI's personality is defined in the `SYSTEM_PROMPT` variable in `ai.py`. Modify it to change:
- Tone and style
- Teaching approach
- Response format
- Personality traits

---

## Usage

### Web Interface

1. Start the server: `uvicorn main:app --reload`
2. Open http://localhost:8000 in your browser
3. **New Chat**: Click the "New Chat" button in the sidebar
4. **Type Message**: Enter your message in the floating input at the bottom
5. **Send**: Press Enter or click the Send button (➤)
6. **View Response**: AI responses appear with markdown formatting
7. **Switch Chats**: Click on any chat in the sidebar to switch sessions
8. **Toggle Sidebar**: Click the sidebar toggle button (☰) to collapse/expand
9. **Theme Toggle**: Click the sun/moon icon to switch dark/light mode

### Chat Sessions

- **Auto-Save**: All chats automatically save to browser localStorage
- **Persistent**: Sessions remain even after closing the browser
- **Title Auto-Update**: First message becomes the chat title
- **Timestamps**: Each session shows "Just now", "5m ago", etc.

### Keyboard Shortcuts

- **Enter**: Send message
- **Shift + Enter**: New line in message

### API Integration

**Endpoint:** `POST /chat`

**Request Body:**
```json
{
  "text": "What is machine learning?",
  "mode": "learning"
}
```

**Response:**
```json
{
  "reply": "Machine learning is a subset of artificial intelligence..."
}
```

**cURL Example:**
```bash
curl -X POST "http://localhost:8000/chat" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello!", "mode": "learning"}'
```

**Python Example:**
```python
import requests

response = requests.post(
    "http://localhost:8000/chat",
    json={"text": "Explain Python decorators", "mode": "learning"}
)

print(response.json()["reply"])
```

---

## Project Structure

```
minai/
├── main.py              # FastAPI application & endpoints
├── ai.py                # AI agent logic & system prompts
├── pyproject.toml       # Project metadata & dependencies
├── Dockerfile           # Docker container configuration
├── railway.toml         # Railway deployment config
├── start.sh             # Application startup script
├── README.md            # This documentation
├── .env                 # Environment variables (create this)
├── .env.example         # Environment template
├── __pycache__/         # Python cache files
└── static/
    ├── index.html       # Vue.js 3 web UI with sidebar & sessions
    └── logo.svg         # MinAI logo (add your own)
```

### File Descriptions

- **`main.py`** - FastAPI server with CORS, static file serving, and chat endpoint
- **`ai.py`** - Pydantic AI agent configuration with markdown-aware system prompts
- **`static/index.html`** - Complete Vue.js 3 SPA with:
  - Collapsible sidebar navigation
  - Chat session management with localStorage
  - Markdown rendering with marked.js
  - Dark/light theme toggle
  - Responsive design with mobile support
  - Claude-inspired UI design
- **`static/logo.svg`** - Application logo (replace with your own)
- **`pyproject.toml`** - Python project configuration and dependencies
- **`Dockerfile`** - Multi-stage Docker build for production
- **`railway.toml`** - Railway.app platform configuration
- **`start.sh`** - Shell script to start uvicorn server

---

## API Reference

### Endpoints

#### `GET /`
**Description:** Serves the main chat interface HTML page

**Response:** HTML content or debug information

---

#### `POST /chat`
**Description:** Send a message to the AI agent and receive a response

**Request Body:**
```typescript
{
  text: string;      // User's message (required)
  mode: string;      // Interaction mode (default: "learning")
}
```

**Response:**
```typescript
{
  reply: string;     // AI's response
}
```

**Status Codes:**
- `200` - Successful response
- `422` - Validation error
- `500` - Server error

---

#### `GET /docs`
**Description:** Interactive API documentation (Swagger UI)

---

#### `GET /redoc`
**Description:** Alternative API documentation (ReDoc)

---

## Deployment

### Docker Deployment

**Build the image:**
```bash
docker build -t ai-chat-agent .
```

**Run the container:**
```bash
docker run -d \
  -p 8000:8000 \
  -e OPENAI_API_KEY="your-api-key" \
  -e OPENAI_BASE_URL="https://api.openai.com/v1" \
  --name ai-chat \
  ai-chat-agent
```

**Docker Compose (Optional):**
```yaml
version: '3.8'
services:
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - OPENAI_BASE_URL=${OPENAI_BASE_URL}
    restart: unless-stopped
```

### Railway Deployment

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login and initialize:
```bash
railway login
railway init
```

3. Set environment variables:
```bash
railway variables set OPENAI_API_KEY=your-key
railway variables set OPENAI_BASE_URL=https://api.openai.com/v1
```

4. Deploy:
```bash
railway up
```

### Traditional Server Deployment

**Using systemd (Linux):**

Create `/etc/systemd/system/ai-chat.service`:
```ini
[Unit]
Description=AI Chat Agent
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/basic-ai
Environment="OPENAI_API_KEY=your-key"
ExecStart=/path/to/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable ai-chat
sudo systemctl start ai-chat
```

---

## Troubleshooting

### Common Issues

#### Error: "The api_key client option must be set"

**Cause:** Missing or incorrect `OPENAI_API_KEY` environment variable

**Solution:**
```bash
# Verify the variable is set
echo $OPENAI_API_KEY  # Linux/macOS
echo $env:OPENAI_API_KEY  # Windows PowerShell

# If not set, add it to .env file or export it
export OPENAI_API_KEY="sk-your-actual-key"
```

---

#### Error: "Module not found"

**Cause:** Dependencies not installed or virtual environment not activated

**Solution:**
```bash
# Ensure virtual environment is active
source .venv/bin/activate  # Linux/macOS
.venv\Scripts\activate  # Windows

# Reinstall dependencies
pip install --upgrade pip
pip install fastapi pydantic pydantic-ai python-dotenv uvicorn
```

---

#### Error: "Static file not found"

**Cause:** `static/index.html` missing or incorrect path

**Solution:**
```bash
# Verify static directory exists
ls static/index.html

# If missing, create it or check project structure
```

---

#### Connection/Timeout Errors

**Cause:** Network issues or invalid API endpoint

**Solution:**
1. Check internet connectivity
2. Verify `OPENAI_BASE_URL` is correct
3. Test API key with curl:
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

---

#### Port Already in Use

**Cause:** Port 8000 is occupied by another process

**Solution:**
```bash
# Find process using port 8000
lsof -i :8000  # Linux/macOS
netstat -ano | findstr :8000  # Windows

# Kill the process or use a different port
uvicorn main:app --port 8080
```

---

## Contributing

Contributions are welcome! Here's how you can help:

### Ways to Contribute

- **Report bugs** - Create an issue with details
- **Suggest features** - Share your ideas
- **Improve docs** - Fix typos or add examples
- **Submit PRs** - Fix bugs or add features

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style

- Follow PEP 8 for Python code
- Use type hints where applicable
- Add docstrings to functions
- Write clear commit messages

---

## Resources

- [Pydantic AI Documentation](https://ai.pydantic.dev/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Vue.js 3 Documentation](https://vuejs.org/)
- [Marked.js (Markdown Parser)](https://marked.js.org/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Python dotenv](https://pypi.org/project/python-dotenv/)
- [Docker Documentation](https://docs.docker.com/)

---

## Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **Pydantic AI** - AI agent framework
- **Uvicorn** - ASGI server
- **Python-dotenv** - Environment management

### Frontend
- **Vue.js 3** - Progressive JavaScript framework
- **Marked.js** - Markdown parser
- **CSS Custom Properties** - Theme system
- **LocalStorage API** - Session persistence

### AI
- **OpenAI GPT-4o** - Language model
- **Markdown Formatting** - Structured responses

---

## Author

**Rituraj**  
- GitHub: [@riturajprofile](https://github.com/riturajprofile)
- Repository: [basic-ai](https://github.com/riturajprofile/basic-ai)

---

## License

This project is open source and available under the MIT License.

---

## Security & Best Practices

### API Key Safety

- **DO**: Store API keys in `.env` files
- **DO**: Add `.env` to `.gitignore`
- **DO**: Use environment variables in production
- **DON'T**: Commit API keys to version control
- **DON'T**: Share API keys publicly
- **DON'T**: Hardcode secrets in source code

### Production Considerations

- Enable HTTPS/TLS in production
- Implement rate limiting for the `/chat` endpoint
- Add authentication for sensitive deployments
- Monitor API usage and costs
- Set up logging and error tracking
- Use a reverse proxy (nginx/caddy) for production

---

<div align="center">

**Made with Python, FastAPI, Pydantic AI, and Vue.js**

**MinAI - Minimal Yet Powerful AI Chat**

Star this repo if you find it helpful!

</div>
