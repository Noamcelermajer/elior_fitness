# 🚀 Kamatera Deployment Guide for Elior Fitness

## 🎯 Why Kamatera for Israel Users

- ✅ **Data centers in Israel and UAE** - 10-20ms latency (best possible)
- ✅ **Customizable resources** - Pay only for what you need
- ✅ **30-day free trial** - Test before committing
- ✅ **Cost-effective** - $4-6/month for your needs
- ✅ **Full root access** - Complete control

---

## 📋 Prerequisites

1. **Kamatera Account**: Sign up at https://www.kamatera.com
2. **Domain Name** (optional but recommended): For SSL and professional URL
3. **SSH Client**: For connecting to your server
4. **Basic Linux knowledge**: For server management

---

## 🖥️ Step 1: Create Kamatera VPS

### 1.1 Login to Kamatera Dashboard

1. Go to https://www.kamatera.com
2. Sign up or login to your account
3. Navigate to **Cloud Servers** → **Create Server**

### 1.2 Configure Server Settings

**Server Configuration:**
- **Name**: `elior-fitness` (or your preferred name)
- **Data Center**: **Choose Israel or UAE** for best latency
  - **Israel**: Best for local users (10-15ms)
  - **UAE (Dubai)**: Good alternative (15-20ms)
- **Image**: **Ubuntu 22.04 LTS** (recommended)
- **CPU**: **1 vCPU** (sufficient for 50 users)
- **RAM**: **1-2 GB** (2GB recommended for headroom)
- **Storage**: **30 GB SSD** (plenty for app + database + uploads)
- **Network**: **Public IP** (required for web access)
- **Firewall**: Allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS)

**Estimated Cost:**
- 1 vCPU, 1GB RAM, 30GB SSD: ~$4-5/month
- 1 vCPU, 2GB RAM, 30GB SSD: ~$5-6/month

### 1.3 Create Server

1. Review configuration
2. Click **Create Server**
3. Wait 2-3 minutes for server to be provisioned
4. Note your **Server IP address** and **root password**

---

## 🔐 Step 2: Initial Server Setup

### 2.1 Connect to Server

```bash
# Connect via SSH
ssh root@YOUR_SERVER_IP

# When prompted, enter the root password from Kamatera dashboard
```

### 2.2 Update System

```bash
# Update package list
apt update && apt upgrade -y

# Install essential tools
apt install -y curl wget git nano ufw
```

### 2.3 Configure Firewall

```bash
# Allow SSH (port 22)
ufw allow 22/tcp

# Allow HTTP (port 80)
ufw allow 80/tcp

# Allow HTTPS (port 443)
ufw allow 443/tcp

# Enable firewall
ufw --force enable

# Check status
ufw status
```

### 2.4 Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Start Docker service
systemctl start docker
systemctl enable docker

# Verify installation
docker --version
```

### 2.5 Install Docker Compose

```bash
# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

---

## 📦 Step 3: Deploy Application

### 3.1 Clone Repository

```bash
# Create application directory
mkdir -p /opt/elior-fitness
cd /opt/elior-fitness

# Clone your repository
git clone https://github.com/YOUR_USERNAME/elior_fitness.git .

# Or if using SSH:
# git clone git@github.com:YOUR_USERNAME/elior_fitness.git .
```

### 3.2 Create Production Environment File

```bash
# Copy example environment file
cp docs/env.production.example .env.production

# Edit environment file
nano .env.production
```

**Configure `.env.production`:**
```bash
# Environment
ENVIRONMENT=production

# Domain Configuration
DOMAIN=your-domain.com  # Replace with your actual domain
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Security - Generate secure JWT secret
JWT_SECRET=YOUR_SECURE_JWT_SECRET_HERE  # Generate with: openssl rand -hex 32
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Database Configuration
DATABASE_PATH=/app/data/elior_fitness.db
DATABASE_URL=sqlite:////app/data/elior_fitness.db

# File Upload Configuration
MAX_FILE_SIZE=5242880  # 5MB
UPLOAD_DIR=/app/uploads

# Performance Configuration
WORKERS=1
LOG_LEVEL=INFO
ENABLE_DEBUG_LOGGING=false

# Resource Limits
MAX_CONCURRENT_REQUESTS=50
MAX_REQUESTS_PER_WORKER=1000
```

**Generate JWT Secret:**
```bash
# Generate secure JWT secret
openssl rand -hex 32
# Copy the output and paste it as JWT_SECRET in .env.production
```

### 3.3 Create Production Docker Compose File

```bash
# Create production docker-compose file
nano docker-compose.prod.yml
```

**Add this configuration:**
```yaml
services:
  elior-fitness:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - ./uploads:/app/uploads
      - ./data:/app/data
      - ./logs:/app/logs
    env_file:
      - .env.production
    environment:
      - PORT=8000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s
```

### 3.4 Create Required Directories

```bash
# Create directories for persistent data
mkdir -p uploads data logs
chmod 755 uploads data logs
```

### 3.5 Build and Start Application

```bash
# Build and start the application
docker-compose -f docker-compose.prod.yml up -d --build

# Check if container is running
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

**Expected Output:**
- Container should start successfully
- Health check should pass
- Application should be accessible at `http://YOUR_SERVER_IP:8000`

---

## 🔒 Step 4: Setup SSL with Let's Encrypt

### 4.1 Install Certbot

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Or if using standalone (no nginx):
apt install -y certbot
```

### 4.2 Point Domain to Server

**Before getting SSL certificate:**
1. Go to your domain registrar
2. Add **A record** pointing to your Kamatera server IP:
   - **Type**: A
   - **Name**: @ (or your subdomain)
   - **Value**: YOUR_SERVER_IP
   - **TTL**: 3600

3. Wait 5-10 minutes for DNS propagation
4. Verify DNS:
   ```bash
   dig your-domain.com
   # Should show your server IP
   ```

### 4.3 Install Nginx (Reverse Proxy)

```bash
# Install Nginx
apt install -y nginx

# Create Nginx configuration
nano /etc/nginx/sites-available/elior-fitness
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration (will be added by Certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Client Max Body Size (for file uploads)
    client_max_body_size 5M;

    # Proxy to FastAPI
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket support
        proxy_set_header Connection "upgrade";
    }

    # Static files caching
    location /assets/ {
        proxy_pass http://localhost:8000;
        proxy_cache_valid 200 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/elior-fitness /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Start Nginx
systemctl start nginx
systemctl enable nginx
```

### 4.4 Get SSL Certificate

```bash
# Get SSL certificate
certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow prompts:
# - Enter email address
# - Agree to terms
# - Choose whether to redirect HTTP to HTTPS (recommended: Yes)
```

**Automatic Renewal:**
```bash
# Test renewal
certbot renew --dry-run

# Certbot automatically sets up renewal via cron
# Certificates renew automatically every 90 days
```

### 4.5 Update Environment Variables

```bash
# Update .env.production with your domain
nano .env.production
```

**Update these values:**
```bash
DOMAIN=your-domain.com
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

```bash
# Restart application to apply changes
docker-compose -f docker-compose.prod.yml restart
```

---

## ✅ Step 5: Verify Deployment

### 5.1 Test Health Endpoint

```bash
# Test health endpoint
curl https://your-domain.com/health

# Should return:
# {"status":"healthy","version":"1.0.0",...}
```

### 5.2 Test API

```bash
# Test API endpoint
curl https://your-domain.com/api/test

# Should return:
# {"message":"Elior Fitness API is running",...}
```

### 5.3 Test Frontend

1. Open browser: `https://your-domain.com`
2. Should see login page
3. Test login with default users:
   - Admin: `admin@elior.com` / `admin123`
   - Trainer: `trainer@elior.com` / `trainer123`
   - Client: `client@elior.com` / `client123`

### 5.4 Check Logs

```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f

# View Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 🔧 Step 6: Maintenance & Monitoring

### 6.1 Create Backup Script

```bash
# Create backup directory
mkdir -p /opt/backups/elior-fitness

# Create backup script
nano /opt/backups/backup-elior.sh
```

**Backup Script:**
```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/elior-fitness"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
cp /opt/elior-fitness/data/elior_fitness.db $BACKUP_DIR/db_backup_$DATE.db

# Backup uploads
tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz /opt/elior-fitness/uploads/

# Remove old backups (keep last 30 days)
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable
chmod +x /opt/backups/backup-elior.sh

# Test backup
/opt/backups/backup-elior.sh
```

### 6.2 Setup Automated Backups

```bash
# Add to crontab (daily at 2 AM)
crontab -e

# Add this line:
0 2 * * * /opt/backups/backup-elior.sh >> /var/log/elior-backup.log 2>&1
```

### 6.3 Monitor Resource Usage

```bash
# Check Docker container stats
docker stats

# Check disk usage
df -h

# Check memory usage
free -h

# Check application logs
docker-compose -f docker-compose.prod.yml logs --tail=100
```

### 6.4 Update Application

```bash
# Navigate to application directory
cd /opt/elior-fitness

# Pull latest changes
git pull origin main  # or your branch name

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
docker-compose -f docker-compose.prod.yml ps
```

---

## 🚨 Troubleshooting

### Application Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check container status
docker-compose -f docker-compose.prod.yml ps

# Restart container
docker-compose -f docker-compose.prod.yml restart
```

### SSL Certificate Issues

```bash
# Check certificate status
certbot certificates

# Renew certificate manually
certbot renew

# Check Nginx configuration
nginx -t
systemctl reload nginx
```

### Database Issues

```bash
# Check database file
ls -lh /opt/elior-fitness/data/elior_fitness.db

# Check database permissions
chmod 644 /opt/elior-fitness/data/elior_fitness.db

# Restore from backup if needed
cp /opt/backups/elior-fitness/db_backup_YYYYMMDD_HHMMSS.db /opt/elior-fitness/data/elior_fitness.db
```

### High Resource Usage

```bash
# Check what's using resources
docker stats
top

# Restart application
docker-compose -f docker-compose.prod.yml restart

# Check logs for errors
docker-compose -f docker-compose.prod.yml logs | grep -i error
```

---

## 📊 Monitoring Commands

### Quick Health Check

```bash
# Application health
curl https://your-domain.com/health

# API test
curl https://your-domain.com/api/test

# Database status
curl https://your-domain.com/status/database
```

### Resource Monitoring

```bash
# Container stats
docker stats elior-fitness

# Disk usage
du -sh /opt/elior-fitness/*

# Memory usage
free -h

# CPU usage
top
```

---

## 🔄 Common Operations

### Restart Application

```bash
cd /opt/elior-fitness
docker-compose -f docker-compose.prod.yml restart
```

### View Logs

```bash
# Application logs
docker-compose -f docker-compose.prod.yml logs -f

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100
```

### Update Application

```bash
cd /opt/elior-fitness
git pull
docker-compose -f docker-compose.prod.yml up -d --build
```

### Backup Database

```bash
/opt/backups/backup-elior.sh
```

---

## 📝 Environment Variables Reference

**Required Variables:**
```bash
ENVIRONMENT=production
DOMAIN=your-domain.com
JWT_SECRET=<generate-secure-secret>
CORS_ORIGINS=https://your-domain.com
DATABASE_PATH=/app/data/elior_fitness.db
DATABASE_URL=sqlite:////app/data/elior_fitness.db
PORT=8000
```

**Optional Variables:**
```bash
LOG_LEVEL=INFO
MAX_FILE_SIZE=5242880
WORKERS=1
```

---

## ✅ Deployment Checklist

- [ ] Kamatera VPS created (Israel/UAE data center)
- [ ] Server updated and secured (firewall configured)
- [ ] Docker and Docker Compose installed
- [ ] Application cloned and configured
- [ ] Environment variables set (.env.production)
- [ ] Application running (docker-compose up)
- [ ] Domain pointed to server (DNS configured)
- [ ] Nginx installed and configured
- [ ] SSL certificate obtained (Let's Encrypt)
- [ ] Health endpoint working
- [ ] Frontend accessible
- [ ] Login working
- [ ] Backup script created and scheduled
- [ ] Monitoring setup

---

## 🎉 Success!

Your Elior Fitness application is now deployed on Kamatera with:
- ✅ **10-20ms latency** for Israel users
- ✅ **SSL/HTTPS** enabled
- ✅ **Automatic backups** configured
- ✅ **Production-ready** setup

**Access your application at:** `https://your-domain.com`

---

## 📞 Support

- **Kamatera Support**: https://www.kamatera.com/support
- **Application Issues**: Check logs with `docker-compose logs`
- **SSL Issues**: Check with `certbot certificates`

---

**Estimated Monthly Cost: $4-6/month** for 50 daily users in Israel! 🚀

