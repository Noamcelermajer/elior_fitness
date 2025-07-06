#!/bin/bash

# Elior Fitness API Production Deployment Script
# Usage: ./deploy.sh your-domain.com

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if domain is provided
if [ $# -eq 0 ]; then
    print_error "Usage: $0 <your-domain.com>"
    exit 1
fi

DOMAIN=$1
print_status "Deploying Elior Fitness API for domain: $DOMAIN"

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please don't run this script as root"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

print_status "Checking system requirements..."

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p nginx/ssl
mkdir -p uploads
mkdir -p data
mkdir -p logs

# Generate SSL certificates if they don't exist
if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
    print_status "SSL certificates not found. Generating self-signed certificates for development..."
    
    # Generate self-signed certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"
    
    print_success "Self-signed SSL certificates generated"
    print_warning "For production, replace these with real certificates from Let's Encrypt or your CA"
else
    print_success "SSL certificates found"
fi

# Create production environment file if it doesn't exist
if [ ! -f ".env.production" ]; then
    print_status "Creating production environment file..."
    cp env.production.example .env.production
    
    # Generate secure JWT secret
    JWT_SECRET=$(openssl rand -hex 32)
    
    # Update environment file with domain and JWT secret
    sed -i "s/your-actual-domain.com/$DOMAIN/g" .env.production
    sed -i "s/your-new-secure-jwt-secret-here-32-chars-minimum/$JWT_SECRET/g" .env.production
    
    print_success "Production environment file created"
    print_warning "Please review .env.production and update any additional settings"
else
    print_success "Production environment file already exists"
fi

# Update Nginx configuration with domain
print_status "Updating Nginx configuration..."
sed -i "s/yourdomain.com/$DOMAIN/g" nginx/nginx.conf

# Build frontend if it exists
if [ -d "Frontend" ]; then
    print_status "Building frontend..."
    cd Frontend
    
    # Check if package.json exists
    if [ -f "package.json" ]; then
        # Install dependencies
        if [ -f "package-lock.json" ]; then
            npm ci
        else
            npm install
        fi
        
        # Build for production
        npm run build
        
        print_success "Frontend built successfully"
    else
        print_warning "No package.json found in Frontend directory"
    fi
    
    cd ..
else
    print_warning "Frontend directory not found, skipping frontend build"
fi

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down --remove-orphans || true

# Build and start containers
print_status "Building and starting containers..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for containers to be healthy
print_status "Waiting for containers to be healthy..."
sleep 30

# Check container status
print_status "Checking container status..."
docker-compose -f docker-compose.prod.yml ps

# Test health endpoint
print_status "Testing health endpoint..."
if curl -f -s https://localhost/health > /dev/null; then
    print_success "Health check passed"
else
    print_warning "Health check failed, checking HTTP endpoint..."
    if curl -f -s http://localhost/health > /dev/null; then
        print_success "HTTP health check passed"
    else
        print_error "Health check failed"
        print_status "Checking container logs..."
        docker-compose -f docker-compose.prod.yml logs --tail=50
        exit 1
    fi
fi

print_success "Deployment completed successfully!"
print_status "Your application should be available at:"
echo -e "  ${GREEN}https://$DOMAIN${NC}"
echo -e "  ${GREEN}https://$DOMAIN/health${NC} (health check)"
echo -e "  ${GREEN}https://$DOMAIN/docs${NC} (API documentation)"

print_status "Useful commands:"
echo -e "  ${BLUE}docker-compose -f docker-compose.prod.yml logs -f${NC} (view logs)"
echo -e "  ${BLUE}docker-compose -f docker-compose.prod.yml down${NC} (stop services)"
echo -e "  ${BLUE}docker-compose -f docker-compose.prod.yml up -d${NC} (start services)"

print_warning "Remember to:"
echo -e "  1. Replace self-signed SSL certificates with real ones"
echo -e "  2. Configure your domain's DNS to point to this server"
echo -e "  3. Set up regular backups"
echo -e "  4. Monitor the application logs"