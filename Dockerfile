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

# Create startup script with Railway compatibility
RUN echo '#!/bin/bash\n\
set -e\n\
echo "=== ELIOR FITNESS STARTUP ==="\n\
echo "Time: $(date)"\n\
echo "Environment: $ENVIRONMENT"\n\
echo "PORT: $PORT"\n\
\n\
# Use Railway PORT or default to 8000\n\
APP_PORT=${PORT:-8000}\n\
echo "Using port: $APP_PORT"\n\
\n\
# Update nginx config to use the correct port\n\
sed -i "s/listen 80;/listen $APP_PORT;/" /etc/nginx/nginx.conf\n\
sed -i "s/server localhost:8001;/server localhost:8001;/" /etc/nginx/nginx.conf\n\
\n\
echo "Checking frontend files..."\n\
ls -la /var/www/html/\n\
\n\
echo "Testing nginx config..."\n\
nginx -t\n\
\n\
echo "Starting nginx..."\n\
nginx\n\
\n\
echo "Starting FastAPI on port 8001..."\n\
exec uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 1\n\
' > /app/start.sh && chmod +x /app/start.sh

# Expose port (Railway will override this)
EXPOSE 8000

# Health check - simplified for Railway
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Start application
CMD ["/app/start.sh"] 