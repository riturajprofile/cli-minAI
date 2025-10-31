# Multi-stage build for smaller final image
FROM python:3.13-slim AS builder

# Set working directory
WORKDIR /app

# Install dependencies in builder stage
COPY pyproject.toml ./
RUN pip install --no-cache-dir --user \
    fastapi>=0.119.0 \
    pydantic>=2.12.2 \
    pydantic-ai>=1.1.0 \
    python-dotenv>=1.1.1 \
    uvicorn>=0.37.0 \
    pypdf2>=3.0.0 \
    python-multipart>=0.0.9 \
    && find /root/.local -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true \
    && find /root/.local -type d -name "test" -exec rm -rf {} + 2>/dev/null || true \
    && find /root/.local -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true \
    && find /root/.local -name "*.pyc" -delete \
    && find /root/.local -name "*.pyo" -delete

# Final stage
FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH=/root/.local/bin:$PATH

# Copy only the installed packages from builder
COPY --from=builder /root/.local /root/.local

# Copy application files
COPY ai.py main.py ./
COPY static ./static

# Expose port for FastAPI
EXPOSE 8000

# Run the application directly
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
