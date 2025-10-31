#!/bin/bash

# MinAI Startup Script
# This script starts the FastAPI server with uvicorn

echo "🚀 Starting MinAI Server..."
echo "================================"

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "Please run: uv venv"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Please create .env from .env.example"
    exit 1
fi

# Activate virtual environment and run server
echo "✓ Starting server on http://127.0.0.1:8001"
echo "✓ Press Ctrl+C to stop"
echo "================================"

uv run uvicorn main:app --reload --port 8001
