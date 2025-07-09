# BULLETPROOF DOCKERFILE FOR RENDER.COM
# Multi-stage build optimized for reliability and minimal resources

# Stage 1: Frontend Builder
FROM node:18-slim AS frontend-builder

# Set working directory
WORKDIR /frontend

# Copy package files first for better caching
COPY Frontend/package*.json ./

# Install dependencies with retry logic
RUN npm ci --legacy-peer-deps --no-audit --no-fund && \
    npm cache clean --force

# Copy ALL frontend files at once to avoid missing file issues
COPY Frontend/ ./

# Verify critical files exist before building
RUN echo "=== VERIFYING FILES ===" && \
    ls -la && \
    echo "=== SRC STRUCTURE ===" && \
    find src -type f -name "*.ts" -o -name "*.tsx" | head -10 && \
    echo "=== LIB DIRECTORY ===" && \
    ls -la src/lib/ && \
    echo "=== UTILS FILE CONTENT ===" && \
    cat src/lib/utils.ts && \
    echo "=== CONFIG FILES ===" && \
    ls -la *.json *.ts *.js 2>/dev/null || true

# Build with explicit error handling
RUN echo "=== STARTING BUILD ===" && \
    npm run build && \
    echo "=== BUILD SUCCESSFUL ===" && \
    ls -la dist/

# Stage 2: Production Server
FROM python:3.11-slim

# Install system dependencies in single layer
RUN apt-get update && apt-get install -y \
    nginx \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Set working directory
WORKDIR /app

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application
COPY app/ ./app/

# Copy built frontend from builder stage
COPY --from=frontend-builder /frontend/dist /var/www/html

# Verify frontend was copied correctly
RUN echo "=== VERIFYING FRONTEND COPY ===" && \
    ls -la /var/www/html/ && \
    echo "=== FRONTEND FILES COUNT ===" && \
    find /var/www/html -type f | wc -l

# Create necessary directories
RUN mkdir -p uploads data logs && \
    chmod 755 uploads data logs

# Copy nginx configuration
COPY nginx/nginx.dev.conf /etc/nginx/nginx.conf

# Test nginx configuration
RUN nginx -t

# Create startup script
RUN echo '#!/bin/bash\n\
set -e\n\
echo "=== ELIOR FITNESS STARTING ==="\n\
echo "Time: $(date)"\n\
echo "Environment: Production"\n\
echo "Testing nginx config..."\n\
nginx -t\n\
echo "Starting nginx..."\n\
nginx\n\
echo "Starting FastAPI..."\n\
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1\n\
' > /app/start.sh && chmod +x /app/start.sh

# Expose ports
EXPOSE 80 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start application
CMD ["/app/start.sh"] 