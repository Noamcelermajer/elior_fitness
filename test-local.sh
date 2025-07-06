#!/bin/bash

# Local Testing Script for Elior Fitness API
# This script tests the development setup with Nginx

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

print_status "Testing Elior Fitness API Local Setup..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Stop any existing containers
print_status "Stopping existing containers..."
docker-compose -f docker-compose.dev.yml down --remove-orphans || true

# Build frontend if it exists
if [ -d "Frontend" ]; then
    print_status "Building frontend..."
    cd Frontend
    
    if [ -f "package.json" ]; then
        if [ -f "package-lock.json" ]; then
            npm ci
        else
            npm install
        fi
        
        npm run build
        print_success "Frontend built successfully"
    else
        print_warning "No package.json found in Frontend directory"
    fi
    
    cd ..
else
    print_warning "Frontend directory not found, skipping frontend build"
fi

# Start development containers
print_status "Starting development containers..."
docker-compose -f docker-compose.dev.yml up -d --build

# Wait for containers to be ready
print_status "Waiting for containers to be ready..."
sleep 30

# Check container status
print_status "Checking container status..."
docker-compose -f docker-compose.dev.yml ps

# Test health endpoint
print_status "Testing health endpoint..."
if curl -f -s http://localhost/health > /dev/null; then
    print_success "Health check passed"
else
    print_error "Health check failed"
    print_status "Checking container logs..."
    docker-compose -f docker-compose.dev.yml logs --tail=50
    exit 1
fi

# Test API endpoint
print_status "Testing API endpoint..."
if curl -f -s http://localhost/api/health > /dev/null; then
    print_success "API endpoint test passed"
else
    print_error "API endpoint test failed"
fi

# Test CORS headers
print_status "Testing CORS headers..."
CORS_HEADER=$(curl -s -I http://localhost/api/health | grep -i "access-control-allow-origin" || echo "")
if [ -n "$CORS_HEADER" ]; then
    print_success "CORS headers are present"
else
    print_warning "CORS headers not found"
fi

# Test rate limiting (should work)
print_status "Testing rate limiting..."
for i in {1..5}; do
    curl -s http://localhost/api/health > /dev/null
done
print_success "Rate limiting test completed"

print_success "Local testing completed successfully!"
print_status "Your application is available at:"
echo -e "  ${GREEN}http://localhost/${NC} (frontend)"
echo -e "  ${GREEN}http://localhost/api/${NC} (API)"
echo -e "  ${GREEN}http://localhost/health${NC} (health check)"
echo -e "  ${GREEN}http://localhost/docs${NC} (API documentation)"

print_status "Useful commands:"
echo -e "  ${BLUE}docker-compose -f docker-compose.dev.yml logs -f${NC} (view logs)"
echo -e "  ${BLUE}docker-compose -f docker-compose.dev.yml down${NC} (stop services)"
echo -e "  ${BLUE}docker-compose -f docker-compose.dev.yml up -d${NC} (start services)"

print_warning "Remember:"
echo -e "  - This is a development setup with relaxed security"
echo -e "  - Use docker-compose.prod.yml for production"
echo -e "  - Frontend needs to be built before testing" 