# ⚡ Kamatera Quick Start Guide

## 🎯 Quick Deployment Steps

### 1. Create Kamatera VPS (5 minutes)

1. **Sign up**: https://www.kamatera.com
2. **Create Server**:
   - **Data Center**: Israel or UAE (for best latency)
   - **OS**: Ubuntu 22.04 LTS
   - **Resources**: 1 vCPU, 1-2GB RAM, 30GB SSD
   - **Cost**: ~$4-6/month
3. **Note**: Server IP and root password

### 2. Connect and Setup (10 minutes)

```bash
# Connect to server
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Configure firewall
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable
```

### 3. Deploy Application (10 minutes)

```bash
# Clone repository
mkdir -p /opt/elior-fitness && cd /opt/elior-fitness
git clone https://github.com/YOUR_USERNAME/elior_fitness.git .

# Create environment file
cp docs/env.production.example .env.production
nano .env.production  # Edit with your settings

# Generate JWT secret
openssl rand -hex 32  # Copy output to JWT_SECRET in .env.production

# Create docker-compose.prod.yml (see full guide)
nano docker-compose.prod.yml

# Create directories
mkdir -p uploads data logs

# Start application
docker-compose -f docker-compose.prod.yml up -d --build
```

### 4. Setup SSL (10 minutes)

```bash
# Install Nginx
apt install -y nginx certbot python3-certbot-nginx

# Configure Nginx (see full guide for config)
nano /etc/nginx/sites-available/elior-fitness

# Get SSL certificate
certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 5. Verify (2 minutes)

```bash
# Test health
curl https://your-domain.com/health

# Test API
curl https://your-domain.com/api/test

# Open in browser
# https://your-domain.com
```

---

## 📋 Required Information

Before starting, have ready:
- [ ] Kamatera account
- [ ] Domain name (optional but recommended)
- [ ] GitHub repository URL
- [ ] JWT secret (generate with `openssl rand -hex 32`)

---

## 🔗 Full Documentation

**Complete step-by-step guide:** [`KAMATERA_DEPLOYMENT_GUIDE.md`](./KAMATERA_DEPLOYMENT_GUIDE.md)

**Includes:**
- Detailed setup instructions
- Nginx configuration
- SSL setup
- Backup configuration
- Troubleshooting
- Monitoring commands

---

## 💰 Cost Breakdown

- **VPS**: $4-6/month (1 vCPU, 1-2GB RAM, 30GB SSD)
- **Domain**: $10-15/year (optional)
- **SSL**: Free (Let's Encrypt)
- **Total**: **~$4-6/month** for 50 users

---

## ✅ Quick Checklist

- [ ] Kamatera VPS created
- [ ] Docker installed
- [ ] Application deployed
- [ ] Domain configured (optional)
- [ ] SSL certificate obtained
- [ ] Application accessible
- [ ] Backups configured

---

**Time to deploy: ~30-40 minutes** 🚀

