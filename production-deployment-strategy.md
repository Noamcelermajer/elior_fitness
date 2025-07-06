# 🚀 Production Deployment Strategy - Elior Fitness API

## 📋 Current State Analysis

### Current Configuration Issues:
- **Localhost-only CORS**: Currently configured for local development only
- **No production environment variables**: Missing production-specific configurations
- **Basic Docker setup**: Single container without production optimizations
- **No reverse proxy**: Direct exposure of FastAPI application
- **SQLite database**: Not ideal for production scalability

## 🎯 Recommended Production Architecture

### 1. Multi-Container Architecture with Reverse Proxy

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # Reverse Proxy (Nginx)
  nginx:
    image: nginx:alpine
    container_name: elior-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./uploads:/app/uploads:ro
    depends_on:
      - api
    restart: unless-stopped
    networks:
      - elior-network

  # FastAPI Application
  api:
    build: 
      context: .
      dockerfile: Dockerfile.prod
    container_name: elior-api
    expose:
      - "8000"
    volumes:
      - ./uploads:/app/uploads
      - sqlite_data:/app/data
    environment:
      - ENVIRONMENT=production
      - DATABASE_URL=sqlite:///./data/elior_fitness.db
      - JWT_SECRET=${JWT_SECRET}
      - JWT_ALGORITHM=HS256
      - ACCESS_TOKEN_EXPIRE_MINUTES=30
      - CORS_ORIGINS=${CORS_ORIGINS}
      - DOMAIN=${DOMAIN}
    restart: unless-stopped
    networks:
      - elior-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # PostgreSQL (Recommended for production)
  postgres:
    image: postgres:15-alpine
    container_name: elior-postgres
    environment:
      - POSTGRES_DB=elior_fitness
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    expose:
      - "5432"
    restart: unless-stopped
    networks:
      - elior-network

  # Redis for Caching (Optional but recommended)
  redis:
    image: redis:7-alpine
    container_name: elior-redis
    expose:
      - "6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - elior-network

volumes:
  sqlite_data:
  postgres_data:
  redis_data:

networks:
  elior-network:
    driver: bridge
```

### 2. Nginx Reverse Proxy Configuration

```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream api {
        server api:8000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # HTTPS Redirect
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    # Main HTTPS Server
    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # API Routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # CORS Headers
            add_header 'Access-Control-Allow-Origin' 'https://yourdomain.com' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
            add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range,X-Process-Time,X-Request-ID' always;
            
            # Handle preflight requests
            if ($request_method = 'OPTIONS') {
                add_header 'Access-Control-Max-Age' 1728000;
                add_header 'Content-Type' 'text/plain charset=UTF-8';
                add_header 'Content-Length' 0;
                return 204;
            }
        }

        # Authentication Routes (More restrictive rate limiting)
        location /api/auth/ {
            limit_req zone=auth burst=10 nodelay;
            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static Files (uploads)
        location /uploads/ {
            alias /app/uploads/;
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }

        # Health Check
        location /health {
            proxy_pass http://api;
            access_log off;
        }

        # Documentation (Restrict in production)
        location ~ ^/(docs|redoc|openapi.json) {
            # allow 192.168.1.0/24;  # Only allow from specific IPs
            # deny all;
            proxy_pass http://api;
        }

        # Frontend (if serving from same domain)
        location / {
            root /var/www/html;
            try_files $uri $uri/ /index.html;
            expires 1h;
            add_header Cache-Control "public, must-revalidate, proxy-revalidate";
        }
    }

    # WebSocket Support
    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }

    # WebSocket Location
    location /api/ws/ {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Production FastAPI Configuration

```python
# app/main.py - Production optimizations
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import os
from typing import List

# Environment-specific configuration
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DOMAIN = os.getenv("DOMAIN", "localhost")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app = FastAPI(
    title="Elior Fitness API",
    description="Production API for fitness management",
    version="1.0.0",
    # Disable docs in production
    docs_url="/docs" if ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if ENVIRONMENT == "development" else None,
)

# Security Middleware
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=[DOMAIN, f"*.{DOMAIN}", "localhost"]
)

# Compression Middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Production CORS Configuration
if ENVIRONMENT == "production":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Process-Time", "X-Request-ID"]
    )
else:
    # Development CORS (more permissive)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
```

### 4. Environment Configuration

```bash
# .env.production
ENVIRONMENT=production
DOMAIN=yourdomain.com
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://app.yourdomain.com

# Database
DATABASE_URL=postgresql://username:password@postgres:5432/elior_fitness
# Or for SQLite in production (not recommended for scale)
# DATABASE_URL=sqlite:///./data/elior_fitness.db

# Security
JWT_SECRET=your-super-secure-secret-key-here-minimum-32-characters
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database Credentials
DB_USER=elior_user
DB_PASSWORD=secure_password_here

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/app/uploads

# Redis (if using)
REDIS_URL=redis://redis:6379/0
```

## 🔒 Security Considerations

### 1. API Endpoint Security Strategy

**Recommendation: Selective External Access**

```python
# app/security.py
from fastapi import HTTPException, Depends
from typing import List
import os

ALLOWED_EXTERNAL_ENDPOINTS = [
    "/health",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh",
    # Add other endpoints that should be publicly accessible
]

INTERNAL_ONLY_ENDPOINTS = [
    "/docs",
    "/redoc",
    "/metrics",
    "/admin",
    # Admin and monitoring endpoints
]

async def validate_external_access(request: Request):
    """Validate if external access is allowed for this endpoint."""
    if os.getenv("ENVIRONMENT") == "production":
        path = request.url.path
        
        # Always allow health checks
        if path == "/health":
            return True
            
        # Block internal endpoints from external access
        if any(path.startswith(internal) for internal in INTERNAL_ONLY_ENDPOINTS):
            # Check if request is from internal network
            client_ip = request.client.host
            if not is_internal_ip(client_ip):
                raise HTTPException(status_code=403, detail="Internal access only")
        
        return True

def is_internal_ip(ip: str) -> bool:
    """Check if IP is from internal network."""
    internal_ranges = [
        "192.168.",
        "10.",
        "172.16.",
        "127.0.0.1",
        "localhost"
    ]
    return any(ip.startswith(range_) for range_ in internal_ranges)
```

### 2. Firewall and Network Security

```bash
# UFW Firewall Configuration
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Docker network isolation
docker network create --driver bridge \
  --subnet=172.20.0.0/16 \
  --ip-range=172.20.240.0/20 \
  elior-network
```

## 🔗 Integration Options

### 1. Standalone FastAPI with Reverse Proxy (Recommended)

**Pros:**
- Simple architecture
- Good performance
- Easy to maintain
- Clear separation of concerns

**Implementation:**
```yaml
# Architecture: Internet → Nginx → FastAPI → Database
# Domain: api.yourdomain.com
# Frontend: app.yourdomain.com (separate deployment)
```

### 2. Node.js Integration Options

#### Option A: Node.js as API Gateway
```javascript
// node-gateway/server.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);

// Proxy to FastAPI
app.use('/api', createProxyMiddleware({
  target: 'http://fastapi:8000',
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    // Add authentication, logging, etc.
    console.log(`Proxying ${req.method} ${req.url}`);
  }
}));

// Serve frontend
app.use(express.static('public'));

app.listen(3000, () => {
  console.log('Gateway running on port 3000');
});
```

#### Option B: Node.js for Frontend + FastAPI for API
```yaml
# docker-compose.fullstack.yml
services:
  nginx:
    # Same as above
  
  frontend:
    build: ./frontend
    container_name: elior-frontend
    expose:
      - "3000"
    environment:
      - REACT_APP_API_URL=https://yourdomain.com/api
  
  api:
    # Same FastAPI setup
```

#### Option C: Node.js Microservices + FastAPI
```yaml
# Microservices architecture
services:
  nginx:
    # Routes to different services
  
  auth-service:
    build: ./node-auth
    # Handle authentication
  
  user-service:
    build: ./node-users
    # Handle user management
  
  fitness-api:
    # FastAPI for fitness-specific logic
```

### 3. Domain and Subdomain Strategy

```nginx
# nginx/sites-available/elior-fitness
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    # API only
}

server {
    listen 443 ssl http2;
    server_name app.yourdomain.com;
    # Frontend application
}

server {
    listen 443 ssl http2;
    server_name admin.yourdomain.com;
    # Admin dashboard
    location / {
        # Additional IP restrictions
        allow 192.168.1.0/24;
        deny all;
    }
}
```

## 🚀 Deployment Process

### 1. Server Setup Script

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Deploying Elior Fitness API to production..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create application directory
sudo mkdir -p /opt/elior-fitness
cd /opt/elior-fitness

# Clone repository
git clone https://github.com/yourusername/elior-fitness.git .

# Copy production configuration
cp docker-compose.prod.yml docker-compose.yml
cp .env.production .env

# Create SSL certificates (Let's Encrypt)
sudo apt install certbot -y
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem

# Build and start services
docker-compose build
docker-compose up -d

# Setup automatic renewals
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -

echo "✅ Deployment complete!"
```

### 2. CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup SSH
      uses: webfactory/ssh-agent@v0.7.0
      with:
        ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}
    
    - name: Deploy to server
      run: |
        ssh -o StrictHostKeyChecking=no user@yourserver.com '
          cd /opt/elior-fitness &&
          git pull origin main &&
          docker-compose down &&
          docker-compose build &&
          docker-compose up -d
        '
```

## 📊 Monitoring and Maintenance

### 1. Health Monitoring

```python
# app/monitoring.py
from fastapi import APIRouter
import psutil
import time

monitoring = APIRouter()

@monitoring.get("/health/detailed")
async def detailed_health():
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "system": {
            "cpu_percent": psutil.cpu_percent(),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent
        },
        "database": check_db_connection(),
        "services": {
            "redis": check_redis_connection(),
            "file_storage": check_file_storage()
        }
    }
```

### 2. Log Management

```yaml
# docker-compose.prod.yml - Add logging
services:
  api:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 🎯 Recommendations Summary

### For Production Deployment:

1. **Use Reverse Proxy**: Nginx for SSL termination, rate limiting, and static file serving
2. **Selective API Access**: Only expose necessary endpoints externally
3. **Database Migration**: Move from SQLite to PostgreSQL for production
4. **Environment Separation**: Strict environment variable management
5. **SSL/TLS**: Mandatory HTTPS with proper certificates
6. **Monitoring**: Comprehensive health checks and logging
7. **Backup Strategy**: Regular database and file backups

### Recommended Architecture:
```
Internet → Cloudflare/CDN → Nginx → FastAPI → PostgreSQL
                                 ↓
                            Static Files (uploads)
```

### Domain Strategy:
- **API**: `api.yourdomain.com`
- **Frontend**: `app.yourdomain.com`
- **Admin**: `admin.yourdomain.com` (IP restricted)

This approach provides maximum security, scalability, and maintainability for your production deployment.