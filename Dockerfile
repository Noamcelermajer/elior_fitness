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

# Build frontend (clean npm cache after build)
RUN npm run build && \
    npm cache clean --force && \
    rm -rf node_modules

# Stage 2: Production Server
FROM python:3.11-slim

# Install system dependencies (minimal set)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean \
    && apt-get purge -y --auto-remove

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application
COPY app/ ./app/

# Copy built frontend to static directory
COPY --from=frontend-builder /frontend/dist ./static

# Copy admin setup script only
COPY setup_admin.py ./setup_admin.py

# Set proper permissions
RUN chmod -R 755 ./static && \
    mkdir -p uploads data logs && \
    chmod 755 uploads data logs \
    && mkdir -p /data && chmod 777 /data \
    && mkdir -p /app/persistent/data /app/persistent/uploads /app/persistent/logs && \
    chmod -R 755 /app/persistent

# Create startup script
RUN echo '#!/bin/bash\n\
set -e\n\
echo "=== ELIOR FITNESS STARTUP ==="\n\
echo "Time: $(date)"\n\
echo "Environment: $ENVIRONMENT"\n\
echo "Port: $PORT"\n\
echo "Checking static files..."\n\
ls -la ./static/ || echo "Static directory not found"\n\
echo "Setting up admin user..."\n\
python /app/setup_admin.py\n\
echo "Starting FastAPI on port ${PORT:-8000}..."\n\
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1\n\
' > /app/start.sh && chmod +x /app/start.sh

# Expose port - Railway will provide PORT env var dynamically
# Using 8000 as default for local development, but Railway will override
EXPOSE 8000

# Health check - uses PORT env var (Railway provides this)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Start application
CMD ["/app/start.sh"] 