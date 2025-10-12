# Production Dockerfile for Railway deployment
# Multi-stage build for optimal size and security
# Updated: 2025-07-10 15:20 - Removed Nginx, FastAPI only

# Build argument to force cache invalidation
ARG BUILD_DATE=unknown

# Stage 1: Frontend Builder
FROM node:18-slim AS frontend-builder
WORKDIR /frontend

# Copy package files for dependency caching
COPY Frontend/package*.json ./
RUN npm ci --legacy-peer-deps --no-audit --no-fund --production=false

# Copy frontend source
COPY Frontend/ ./

# Build frontend
RUN npm run build

# Stage 2: Production Server
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Install requests for test user initialization
RUN pip install requests

# Copy backend application
COPY app/ ./app/

# Copy built frontend to static directory
COPY --from=frontend-builder /frontend/dist ./static

# Copy test user initialization script
COPY tests/init_test_users.py ./tests/init_test_users.py

# Set proper permissions
RUN chmod -R 755 ./static && \
    mkdir -p uploads data logs && \
    chmod 755 uploads data logs \
    && mkdir -p /data && chmod 777 /data

# Create startup script
RUN echo '#!/bin/bash\n\
set -e\n\
echo "=== ELIOR FITNESS STARTUP ==="\n\
echo "Time: $(date)"\n\
echo "Environment: $ENVIRONMENT"\n\
echo "Port: $PORT"\n\
echo "Checking static files..."\n\
ls -la ./static/\n\
echo "Skipping test user initialization (manual setup required)"\n\
echo "Starting FastAPI on port $PORT..."\n\
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1\n\
' > /app/start.sh && chmod +x /app/start.sh

# Expose port for Railway
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Start application
CMD ["/app/start.sh"] 