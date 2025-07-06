# Elior Fitness API - Production Setup Guide

This guide will help you deploy your Elior Fitness API to production with proper security, performance, and external access.

## 🚀 Quick Start (Linux/Ubuntu Server)

### 1. Server Preparation

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

### 2. Deploy Application

```bash
# Clone your repository
git clone <your-repo-url>
cd elior-fitness

# Run deployment script
./deploy.sh your-domain.com
```

## 🖥️ Windows Development Setup

### 1. Install Prerequisites

- Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
- Install [Git for Windows](https://git-scm.com/download/win)

### 2. Setup for Local Testing

```powershell
# Clone repository
git clone <your-repo-url>
cd elior-fitness

# Create production environment file
Copy-Item env.production.example .env.production

# Edit .env.production with your settings
notepad .env.production

# Build and run with production config
docker-compose -f docker-compose.prod.yml up -d --build
```

## 📋 Configuration Files

### Environment Configuration (.env.production)

```bash
# Environment
ENVIRONMENT=production

# Domain Configuration
DOMAIN=your-actual-domain.com
CORS_ORIGINS=https://your-actual-domain.com,https://www.your-actual-domain.com

# Security
JWT_SECRET=your-secure-jwt-secret-32-chars-minimum
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database
DATABASE_URL=sqlite:///./data/elior_fitness.db

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/app/uploads
```

### Generate Secure JWT Secret

```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
[System.Web.Security.Membership]::GeneratePassword(32, 0)
```

## 🔒 SSL Certificate Setup

### Option 1: Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot -y

# Get certificate
sudo certbot certonly --standalone \
  --agree-tos \
  --email admin@your-domain.com \
  -d your-domain.com \
  -d www.your-domain.com

# Copy certificates
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
sudo chown -R $USER:$USER nginx/ssl
```

### Option 2: Self-Signed (Development)

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=your-domain.com"
```

## 🏗️ Architecture Overview

```
Internet → Nginx (SSL/TLS, Rate Limiting) → FastAPI → SQLite/PostgreSQL
                                      ↓
                                Frontend (React)
                                      ↓  
                                Static Files
```

### Components:

1. **Nginx Reverse Proxy**
   - SSL/TLS termination
   - Rate limiting
   - Security headers
   - Static file serving
   - Load balancing

2. **FastAPI Application**
   - Multiple workers (4)
   - Performance optimizations
   - Connection pooling
   - Health monitoring

3. **Database**
   - SQLite (default)
   - PostgreSQL (optional, for scale)

## 🔧 Performance Optimizations

### Applied Optimizations:

1. **Database**
   - Connection pooling
   - Query monitoring
   - SQLite WAL mode
   - Prepared statements

2. **API**
   - GZip compression
   - Multiple workers
   - Request monitoring
   - Performance headers

3. **Network**
   - Keep-alive connections
   - Rate limiting
   - Security headers
   - HTTP/2 support

## 🛡️ Security Features

### Implemented Security:

1. **Access Control**
   - CORS configuration
   - Rate limiting
   - IP restrictions for metrics

2. **Headers**
   - HSTS
   - CSP
   - XSS protection
   - Frame denial

3. **SSL/TLS**
   - TLS 1.2/1.3 only
   - Secure cipher suites
   - Certificate validation

## 📊 Monitoring & Health Checks

### Health Endpoints:

- `GET /health` - Application health
- `GET /metrics` - Performance metrics (internal only)
- `GET /status/database` - Database status

### Logging:

```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f api

# View nginx logs
docker-compose -f docker-compose.prod.yml logs -f nginx
```

## 🔄 Backup Strategy

### Automated Backups:

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/elior-fitness"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
cp data/elior_fitness.db $BACKUP_DIR/db_backup_$DATE.db

# Backup uploads
tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz uploads/

# Remove old backups
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
EOF

chmod +x backup.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /path/to/backup.sh") | crontab -
```

## 🚨 Troubleshooting

### Common Issues:

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   sudo netstat -tulpn | grep :80
   sudo netstat -tulpn | grep :443
   
   # Stop conflicting services
   sudo systemctl stop apache2
   sudo systemctl stop nginx
   ```

2. **SSL Certificate Issues**
   ```bash
   # Check certificate validity
   openssl x509 -in nginx/ssl/cert.pem -text -noout
   
   # Test SSL connection
   openssl s_client -connect your-domain.com:443 -servername your-domain.com
   ```

3. **Database Connection Issues**
   ```bash
   # Check database file permissions
   ls -la data/elior_fitness.db
   
   # Test database connection
   docker-compose -f docker-compose.prod.yml exec api python -c "
   from app.database import check_db_connection
   print('Database healthy:', check_db_connection())
   "
   ```

### Debug Commands:

```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Test health endpoint
curl -f https://your-domain.com/health

# Check SSL certificate
curl -I https://your-domain.com/
```

## 📈 Scaling Considerations

### For Higher Traffic:

1. **Database**
   - Migrate to PostgreSQL
   - Add read replicas
   - Implement caching (Redis)

2. **Application**
   - Increase worker count
   - Add load balancer
   - Implement CDN

3. **Infrastructure**
   - Use container orchestration (Kubernetes)
   - Implement auto-scaling
   - Add monitoring (Prometheus/Grafana)

## 🔄 Updates & Maintenance

### Application Updates:

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# Verify deployment
curl -f https://your-domain.com/health
```

### SSL Certificate Renewal:

```bash
# Manual renewal
sudo certbot renew

# Automatic renewal (cron job)
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
```

## 📞 Support

If you encounter issues:

1. Check the logs: `docker-compose -f docker-compose.prod.yml logs -f`
2. Verify configuration: `docker-compose -f docker-compose.prod.yml config`
3. Test endpoints: `curl -f https://your-domain.com/health`
4. Check SSL: `openssl s_client -connect your-domain.com:443`

Your Elior Fitness API is now production-ready! 🎉 