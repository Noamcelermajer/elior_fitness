# Multi-stage build for minimal resource usage
FROM node:18-slim AS frontend-builder

# Set working directory for frontend
WORKDIR /frontend

# Copy frontend package files
COPY Frontend/package*.json ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm ci --legacy-peer-deps && \
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
RUN npm run build

# API stage - OPTIMIZED FOR MINIMAL RESOURCES
FROM python:3.11-slim

# Install minimal system dependencies only
RUN apt-get update && apt-get install -y \
    nginx \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies with optimizations
COPY requirements.txt .
RUN pip install --no-cache-dir --no-deps -r requirements.txt

# Copy API code
COPY app/ ./app/

# Copy built frontend from frontend-builder stage
COPY --from=frontend-builder /frontend/dist /var/www/html

# Create necessary directories
RUN mkdir -p uploads data

# Copy optimized Nginx configuration
COPY nginx/nginx.dev.conf /etc/nginx/nginx.conf

# Create optimized startup script
RUN echo '#!/bin/bash\n\
echo "Starting optimized Nginx..."\n\
nginx\n\
echo "Starting optimized FastAPI..."\n\
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 --limit-concurrency 50 --limit-max-requests 1000\n\
' > /app/start.sh && chmod +x /app/start.sh

# Expose port
EXPOSE 80 8000

# Start both Nginx and FastAPI with minimal resources
CMD ["/app/start.sh"] 