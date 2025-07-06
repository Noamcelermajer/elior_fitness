# 🚀 Production Setup Guide - Elior Fitness API

## 📋 Quick Overview

This guide helps you deploy the Elior Fitness API to production with proper security, performance optimizations, and external access configuration.

## 🗂️ Files Created for Production

### Core Configuration Files:
- **`docker-compose.prod.yml`** - Production Docker configuration with Nginx reverse proxy
- **`Dockerfile.prod`** - Optimized production Docker image
- **`nginx/nginx.conf`** - Nginx reverse proxy with security headers and rate limiting
- **`.env.production.example`** - Production environment variables template
- **`deploy.sh`** - Automated deployment script
- **`production-deployment-strategy.md`** - Comprehensive deployment documentation

## 🔧 Quick Deployment (Recommended)

### Prerequisites:
- Ubuntu 20.04+ server with public IP
- Domain name pointing to your server
- SSH access to the server

### 1. One-Command Deployment:
```bash
# On your production server
wget https://raw.githubusercontent.com/yourusername/elior-fitness/frontend-integration/deploy.sh
chmod +x deploy.sh
./deploy.sh your-domain.com
```

### 2. Manual Deployment Steps:

#### Step 1: Prepare Server
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Configure firewall
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

#### Step 2: Clone Repository
```bash
# Create app directory
sudo mkdir -p /opt/elior-fitness
sudo chown -R $USER:$USER /opt/elior-fitness
cd /opt/elior-fitness

# Clone repository
git clone https://github.com/yourusername/elior-fitness.git .
git checkout frontend-integration
```

#### Step 3: Configure Environment
```bash
# Copy environment template
cp .env.production.example .env.production

# Generate secure JWT secret
openssl rand -hex 32

# Edit environment file
nano .env.production
```

**Required changes in `.env.production**:**
```bash
DOMAIN=your-domain.com
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
JWT_SECRET=your-generated-secure-secret-here
```

#### Step 4: Setup SSL Certificates
```bash
# Install Certbot
sudo apt install certbot -y

# Get SSL certificate
sudo certbot certonly --standalone \
  --agree-tos \
  --email admin@your-domain.com \
  -d your-domain.com \
  -d www.your-domain.com

# Copy certificates for nginx
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
sudo chown -R $USER:$USER nginx/ssl
```

#### Step 5: Update Configuration
```bash
# Update nginx config with your domain
sed -i 's/yourdomain.com/your-domain.com/g' nginx/nginx.conf
```

#### Step 6: Build and Deploy
```bash
# Build frontend (if exists)
cd Frontend && npm install && npm run build && cd ..

# Start services
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
docker-compose -f docker-compose.prod.yml ps
```

## 🌐 Access Configuration

### API Endpoints:
- **Main API**: `https://your-domain.com/api/`
- **Health Check**: `https://your-domain.com/health`
- **Documentation**: `https://your-domain.com/docs`
- **WebSocket**: `wss://your-domain.com/api/ws/`

### Security Features:
- ✅ HTTPS with automatic HTTP redirect
- ✅ Rate limiting (10 req/sec for API, 5 req/sec for auth)
- ✅ Security headers (HSTS, CSP, XSS protection)
- ✅ CORS properly configured for your domain
- ✅ File upload restrictions and validation
- ✅ Internal-only access for metrics and admin endpoints

## 🔒 External Access Strategy

### What's Accessible Externally:
- **Public API endpoints** (`/api/auth/*`, `/api/users/*`, etc.)
- **Health check** (`/health`)
- **Static files** (`/uploads/*` - with restrictions)
- **Frontend application** (`/`)

### What's Restricted:
- **Internal metrics** (`/metrics` - internal networks only)
- **Documentation** (`/docs`, `/redoc` - can be restricted)
- **Database direct access** (blocked by firewall)
- **Admin endpoints** (IP-restricted)

### Frontend Integration:
```javascript
// In your frontend application
const API_BASE_URL = 'https://your-domain.com/api';

// All API calls will go through the nginx reverse proxy
fetch(`${API_BASE_URL}/auth/login`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({ email, password })
});
```

## 🔄 Domain & Subdomain Options

### Option 1: Single Domain (Recommended)
```
https://yourdomain.com/         → Frontend
https://yourdomain.com/api/     → API
https://yourdomain.com/uploads/ → Static files
```

### Option 2: Subdomain Setup
```
https://app.yourdomain.com/     → Frontend
https://api.yourdomain.com/     → API
https://admin.yourdomain.com/   → Admin (restricted)
```

## 🔗 Integration with Node.js

### Option A: FastAPI Only (Current Setup)
```
Internet → Nginx → FastAPI → Database
```
- Simplest setup
- Best performance
- Easy to maintain

### Option B: Node.js + FastAPI
```
Internet → Nginx → Node.js Gateway → FastAPI
```
- More complex but flexible
- Can add Node.js-specific features
- Good for hybrid architectures

## 📊 Monitoring & Maintenance

### Health Monitoring:
```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check health endpoint
curl https://your-domain.com/health
```

### Backup & Updates:
```bash
# Run backup
./backup.sh

# Update application
git pull
docker-compose -f docker-compose.prod.yml up -d --build

# SSL renewal (automatic via cron)
sudo certbot renew --dry-run
```

## ⚡ Performance Optimizations Applied

### Database:
- ✅ Connection pooling (20 connections + 30 overflow)
- ✅ Query performance monitoring
- ✅ SQLite optimizations (WAL mode, 64MB cache)
- ✅ PostgreSQL ready (commented in docker-compose)

### API:
- ✅ Response compression (GZip)
- ✅ Request/response monitoring
- ✅ Rate limiting by endpoint type
- ✅ Connection keep-alive
- ✅ Multiple worker processes

### Frontend:
- ✅ Static file caching (30 days)
- ✅ Gzip compression
- ✅ HTTP/2 support
- ✅ CDN-ready configuration

### Security:
- ✅ SSL/TLS termination
- ✅ Security headers
- ✅ CORS configuration
- ✅ File upload restrictions
- ✅ Firewall configuration

## 🆘 Troubleshooting

### Common Issues:

1. **SSL Certificate Issues:**
   ```bash
   sudo certbot renew
   sudo cp /etc/letsencrypt/live/your-domain.com/* nginx/ssl/
   docker-compose -f docker-compose.prod.yml restart nginx
   ```

2. **Service Won't Start:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs api
   # Check environment variables and file permissions
   ```

3. **CORS Errors:**
   ```bash
   # Update CORS_ORIGINS in .env.production
   # Restart services
   docker-compose -f docker-compose.prod.yml restart
   ```

4. **Database Connection Issues:**
   ```bash
   # Check database file permissions
   ls -la data/
   sudo chown -R $USER:$USER data/
   ```

## 📞 Next Steps

1. **Test all endpoints** with your domain
2. **Configure monitoring** (optional: add Prometheus/Grafana)
3. **Set up database backups** (automatic via cron)
4. **Configure CDN** (optional: Cloudflare)
5. **Set up logging aggregation** (optional: ELK stack)

---

Your Elior Fitness API is now production-ready with:
- ✅ External access properly configured
- ✅ Security hardening applied
- ✅ Performance optimizations enabled
- ✅ SSL/TLS encryption
- ✅ Automatic backups and SSL renewal
- ✅ Comprehensive monitoring