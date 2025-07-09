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

# Copy frontend files explicitly to ensure everything is copied
COPY Frontend/package*.json ./
COPY Frontend/src ./src
COPY Frontend/public ./public
COPY Frontend/index.html ./
COPY Frontend/vite.config.ts ./
COPY Frontend/tsconfig*.json ./
COPY Frontend/tailwind.config.ts ./
COPY Frontend/postcss.config.js ./
COPY Frontend/components.json ./
COPY Frontend/eslint.config.js ./

# Verify critical files exist before building
RUN echo "=== VERIFYING FILES ===" && \
    ls -la && \
    echo "=== SRC STRUCTURE ===" && \
    find src -type f -name "*.ts" -o -name "*.tsx" | head -10 && \
    echo "=== LIB DIRECTORY CHECK ===" && \
    ls -la src/ && \
    echo "=== LIB CONTENTS ===" && \
    ls -la src/lib/ && \
    echo "=== UTILS FILE CONTENT ===" && \
    cat src/lib/utils.ts && \
    echo "=== INDEX FILE CONTENT ===" && \
    cat src/lib/index.ts && \
    echo "=== TESTING PATH RESOLUTION ===" && \
    node -e "console.log('Testing path resolution...'); const path = require('path'); console.log('Resolved path:', path.resolve('./src/lib/utils.ts')); console.log('File exists:', require('fs').existsSync('./src/lib/utils.ts')); console.log('Index exists:', require('fs').existsSync('./src/lib/index.ts'));" && \
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
    find /var/www/html -type f | wc -l && \
    echo "=== CHECKING INDEX.HTML ===" && \
    cat /var/www/html/index.html | head -10 && \
    echo "=== SETTING PERMISSIONS ===" && \
    chmod -R 755 /var/www/html && \
    chown -R www-data:www-data /var/www/html

# Create necessary directories
RUN mkdir -p uploads data logs && \
    chmod 755 uploads data logs

# Copy nginx configuration (Railway for production, secure for local)
COPY nginx/nginx.railway.conf /etc/nginx/nginx.conf

# Test nginx configuration
RUN nginx -t && \
    echo "=== TESTING NGINX FRONTEND ACCESS ===" && \
    echo "Testing if nginx can access frontend files..." && \
    ls -la /var/www/html/ && \
    test -f /var/www/html/index.html && echo "✅ index.html exists" || echo "❌ index.html missing"

# Create startup script
RUN echo '#!/bin/bash\n\
set -e\n\
echo "=== ELIOR FITNESS STARTING ==="\n\
echo "Time: $(date)"\n\
echo "Environment: Production (Railway Compatible)"\n\
echo "Verifying frontend files..."\n\
ls -la /var/www/html/\n\
echo "Testing nginx config..."\n\
nginx -t\n\
echo "Starting nginx..."\n\
nginx\n\
echo "Testing frontend access..."\n\
curl -f http://localhost/ || echo "Frontend not accessible yet"\n\
echo "Starting FastAPI on internal port 8001..."\n\
exec uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 1\n\
' > /app/start.sh && chmod +x /app/start.sh

# Expose ports
EXPOSE 80 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# Start application
CMD ["/app/start.sh"] 