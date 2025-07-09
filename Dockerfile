# Multi-stage build for minimal resource usage
FROM node:18-slim AS frontend-builder

# Set working directory for frontend
WORKDIR /frontend

# Copy frontend package files
COPY Frontend/package*.json ./

# Install ALL dependencies (including dev dependencies for build)
# Added platform-specific handling and better error reporting
RUN npm ci --legacy-peer-deps --platform=linux --arch=x64 && \
    npm cache clean --force

# Copy frontend source code - be explicit about what we're copying
COPY Frontend/src ./src
COPY Frontend/public ./public
COPY Frontend/index.html ./
COPY Frontend/vite.config.ts ./
COPY Frontend/tsconfig*.json ./
COPY Frontend/tailwind.config.ts ./
COPY Frontend/postcss.config.js ./

# Debug: List what we have
RUN ls -la && echo "=== SRC CONTENTS ===" && ls -la src/ && echo "=== LIB CONTENTS ===" && if [ -d "src/lib" ]; then ls -la src/lib/; else echo "lib directory doesn't exist"; fi

# Build frontend for production with optimizations
# Added error handling and verbose output
RUN npm run build || (echo "Build failed! Check the logs above." && exit 1)

# API stage - OPTIMIZED FOR MINIMAL RESOURCES
FROM python:3.11-slim

# Install minimal system dependencies only
# Added essential build tools for cross-platform compatibility
RUN apt-get update && apt-get install -y \
    nginx \
    libmagic1 \
    build-essential \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies with optimizations
COPY requirements.txt .
# Added better error handling and verbose output
RUN pip install --no-cache-dir --verbose -r requirements.txt || \
    (echo "Failed to install Python dependencies. Check requirements.txt" && exit 1)

# Copy API code
COPY app/ ./app/

# Copy built frontend from frontend-builder stage
COPY --from=frontend-builder /frontend/dist /var/www/html

# Create necessary directories with proper permissions
RUN mkdir -p uploads data && \
    chmod 755 uploads data

# Copy optimized Nginx configuration
COPY nginx/nginx.dev.conf /etc/nginx/nginx.conf

# Create optimized startup script with better error handling
RUN echo '#!/bin/bash\n\
set -e\n\
echo "=== ELIOR FITNESS STARTUP ==="\n\
echo "Timestamp: $(date)"\n\
echo "Environment: Production (Optimized)"\n\
echo "Database: SQLite (Minimal Resources)"\n\
echo "Frontend: Port 3000"\n\
echo "API: Port 8000"\n\
echo "Starting optimized Nginx and FastAPI..."\n\
echo "Starting optimized Nginx..."\n\
nginx -t && nginx\n\
echo "Starting optimized FastAPI..."\n\
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 --limit-concurrency 50 --limit-max-requests 1000\n\
' > /app/start.sh && chmod +x /app/start.sh

# Expose port
EXPOSE 80 8000

# Start both Nginx and FastAPI with minimal resources
CMD ["/app/start.sh"] 