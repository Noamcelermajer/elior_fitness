# Production Dockerfile for Railway deployment
# Multi-stage build for optimal size and security

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
    nginx \
    curl \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application
COPY app/ ./app/

# Copy built frontend
COPY --from=frontend-builder /frontend/dist /var/www/html

# Set proper permissions
RUN chmod -R 755 /var/www/html && \
    chown -R www-data:www-data /var/www/html && \
    mkdir -p uploads data logs && \
    chmod 755 uploads data logs

# Copy nginx configuration
COPY nginx/nginx.railway.conf /etc/nginx/nginx.conf

# Create startup script
RUN echo '#!/bin/bash\n\
set -e\n\
echo "Starting Elior Fitness..."\n\
nginx\n\
exec uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 1\n\
' > /app/start.sh && chmod +x /app/start.sh

# Expose ports
EXPOSE 80 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start application
CMD ["/app/start.sh"] 