FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for Sprint 5 file management
RUN apt-get update && apt-get install -y \
    gcc \
    netcat-traditional \
    libmagic1 \
    libmagic-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy only the application code (not test files, frontend, etc.)
COPY app/ ./app/

# Create necessary directories
RUN mkdir -p uploads data

# Set environment variables
ENV PYTHONPATH=/app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"] 