#!/bin/bash

# Elior Fitness API Production Deployment Script
# Usage: ./deploy.sh [your-domain.com]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN=${1:-"yourdomain.com"}
APP_DIR="/opt/elior-fitness"
SSL_DIR="/etc/letsencrypt/live"

echo -e "${BLUE}🚀 Starting Elior Fitness API Production Deployment${NC}"
echo -e "${BLUE}Domain: ${DOMAIN}${NC}"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Check if domain is provided
if [ "$DOMAIN" = "yourdomain.com" ]; then
    print_warning "Using default domain. Please provide your actual domain:"
    echo "Usage: ./deploy.sh your-actual-domain.com"
    read -p "Enter your domain name: " DOMAIN
fi

print_status "Setting up server for domain: $DOMAIN"

# Update system packages
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
print_status "Installing required packages..."
sudo apt install -y \
    curl \
    wget \
    git \
    ufw \
    certbot \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Install Docker
if ! command -v docker &> /dev/null; then
    print_status "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
else
    print_status "Docker already installed"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_status "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    print_status "Docker Compose already installed"
fi

# Configure firewall
print_status "Configuring firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Create application directory
print_status "Setting up application directory..."
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

# Clone or update repository
if [ -d "$APP_DIR/.git" ]; then
    print_status "Updating existing repository..."
    cd $APP_DIR
    git pull origin frontend-integration
else
    print_status "Cloning repository..."
    cd $APP_DIR
    # You'll need to replace this with your actual repository URL
    git clone https://github.com/yourusername/elior-fitness.git .
    git checkout frontend-integration
fi

# Copy and configure environment file
print_status "Setting up environment configuration..."
if [ ! -f "$APP_DIR/.env.production" ]; then
    cp .env.production.example .env.production
    
    # Generate secure JWT secret
    JWT_SECRET=$(openssl rand -hex 32)
    sed -i "s/your-super-secure-secret-key-here-minimum-32-characters/$JWT_SECRET/g" .env.production
    sed -i "s/yourdomain.com/$DOMAIN/g" .env.production
    
    print_warning "Please review and update .env.production with your specific configuration"
    print_warning "Press any key to continue after reviewing the environment file..."
    read -n 1
fi

# Setup SSL certificates
print_status "Setting up SSL certificates..."
if [ ! -d "$SSL_DIR/$DOMAIN" ]; then
    print_status "Obtaining SSL certificate from Let's Encrypt..."
    sudo certbot certonly --standalone \
        --agree-tos \
        --no-eff-email \
        --email admin@$DOMAIN \
        -d $DOMAIN \
        -d www.$DOMAIN
else
    print_status "SSL certificates already exist"
fi

# Copy SSL certificates for nginx
print_status "Copying SSL certificates..."
sudo mkdir -p nginx/ssl
sudo cp $SSL_DIR/$DOMAIN/fullchain.pem nginx/ssl/cert.pem
sudo cp $SSL_DIR/$DOMAIN/privkey.pem nginx/ssl/key.pem
sudo chown -R $USER:$USER nginx/ssl

# Update nginx configuration with actual domain
print_status "Updating nginx configuration..."
sed -i "s/yourdomain.com/$DOMAIN/g" nginx/nginx.conf

# Build frontend if it exists
if [ -d "Frontend" ]; then
    print_status "Building frontend..."
    cd Frontend
    
    # Install Node.js if not present
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # Build frontend
    npm install
    npm run build
    cd ..
    
    print_status "Frontend built successfully"
fi

# Create required directories
print_status "Creating required directories..."
mkdir -p uploads data logs
sudo chown -R $USER:$USER uploads data logs

# Build and start services
print_status "Building and starting services..."
docker-compose -f docker-compose.prod.yml down || true
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to start
print_status "Waiting for services to start..."
sleep 30

# Check if services are running
if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    print_status "Services started successfully"
else
    print_error "Some services failed to start. Check logs with: docker-compose -f docker-compose.prod.yml logs"
    exit 1
fi

# Test health endpoint
print_status "Testing health endpoint..."
if curl -f -s https://$DOMAIN/health > /dev/null; then
    print_status "Health check passed"
else
    print_warning "Health check failed. Services might still be starting..."
fi

# Setup automatic SSL renewal
print_status "Setting up automatic SSL renewal..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -

# Setup log rotation
print_status "Setting up log rotation..."
sudo tee /etc/logrotate.d/elior-fitness > /dev/null <<EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
}
EOF

# Setup backup script
print_status "Setting up backup script..."
tee backup.sh > /dev/null <<EOF
#!/bin/bash
# Backup script for Elior Fitness API
BACKUP_DIR="/opt/backups/elior-fitness"
DATE=\$(date +%Y%m%d_%H%M%S)

mkdir -p \$BACKUP_DIR

# Backup SQLite database
if [ -f "$APP_DIR/data/elior_fitness.db" ]; then
    cp $APP_DIR/data/elior_fitness.db \$BACKUP_DIR/db_backup_\$DATE.db
fi

# Backup uploads
tar -czf \$BACKUP_DIR/uploads_backup_\$DATE.tar.gz -C $APP_DIR uploads/

# Remove backups older than 30 days
find \$BACKUP_DIR -name "*.db" -mtime +30 -delete
find \$BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: \$DATE"
EOF

chmod +x backup.sh

# Setup backup cron job
(crontab -l 2>/dev/null; echo "0 2 * * * $APP_DIR/backup.sh") | crontab -

# Security hardening
print_status "Applying security hardening..."

# Disable root login and password authentication (optional)
print_warning "Consider disabling root login and password authentication in /etc/ssh/sshd_config"
print_warning "Add these lines to /etc/ssh/sshd_config:"
print_warning "PermitRootLogin no"
print_warning "PasswordAuthentication no"
print_warning "Then restart SSH: sudo systemctl restart sshd"

# Setup fail2ban (optional)
if ! command -v fail2ban-server &> /dev/null; then
    print_status "Installing fail2ban for additional security..."
    sudo apt install -y fail2ban
    
    sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
EOF
    
    sudo systemctl enable fail2ban
    sudo systemctl start fail2ban
fi

print_status "🎉 Deployment completed successfully!"
echo ""
echo -e "${GREEN}Your Elior Fitness API is now running at:${NC}"
echo -e "${BLUE}• API: https://$DOMAIN${NC}"
echo -e "${BLUE}• Health Check: https://$DOMAIN/health${NC}"
echo -e "${BLUE}• API Documentation: https://$DOMAIN/docs${NC}"
echo ""
echo -e "${YELLOW}Important next steps:${NC}"
echo "1. Review and update .env.production with your specific settings"
echo "2. Test all API endpoints"
echo "3. Configure your frontend to use the production API URL"
echo "4. Set up monitoring and alerting"
echo "5. Configure database backups if using PostgreSQL"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "• View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "• Restart services: docker-compose -f docker-compose.prod.yml restart"
echo "• Update application: git pull && docker-compose -f docker-compose.prod.yml up -d --build"
echo "• Run backup: ./backup.sh"
echo ""
echo -e "${GREEN}Deployment log saved to: deployment.log${NC}"