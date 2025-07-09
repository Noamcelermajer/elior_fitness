#!/bin/bash

# Railway Deployment Script
# This script helps prepare the application for Railway deployment

set -e

echo "=== ELIOR FITNESS RAILWAY DEPLOYMENT ==="
echo "Timestamp: $(date)"
echo ""

# Check if required files exist
echo "Checking required files..."
if [ ! -f "Dockerfile.railway" ]; then
    echo "❌ Dockerfile.railway not found"
    exit 1
fi

if [ ! -f "nginx/nginx.railway.conf" ]; then
    echo "❌ nginx/nginx.railway.conf not found"
    exit 1
fi

if [ ! -f "docker-compose.railway.yml" ]; then
    echo "❌ docker-compose.railway.yml not found"
    exit 1
fi

echo "✅ All required files found"

# Test nginx configuration
echo ""
echo "Testing nginx configuration..."
if nginx -t -c nginx/nginx.railway.conf; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration is invalid"
    exit 1
fi

# Check frontend build
echo ""
echo "Checking frontend build..."
if [ -d "Frontend/dist" ]; then
    echo "✅ Frontend dist directory exists"
    echo "   Files: $(find Frontend/dist -type f | wc -l)"
else
    echo "⚠️  Frontend dist directory not found"
    echo "   This is okay if building on Railway"
fi

# Environment variables check
echo ""
echo "Checking environment variables..."
if [ -z "$JWT_SECRET" ]; then
    echo "⚠️  JWT_SECRET not set (will use default)"
else
    echo "✅ JWT_SECRET is set"
fi

if [ -z "$DOMAIN" ]; then
    echo "⚠️  DOMAIN not set (will use default)"
else
    echo "✅ DOMAIN is set to: $DOMAIN"
fi

# Railway-specific checks
echo ""
echo "Railway deployment checklist:"
echo "1. ✅ Dockerfile.railway exists"
echo "2. ✅ nginx/nginx.railway.conf exists"
echo "3. ✅ docker-compose.railway.yml exists"
echo "4. ✅ Nginx configuration is valid"
echo ""
echo "Next steps:"
echo "1. Push these changes to your repository"
echo "2. Railway will automatically detect and use Dockerfile.railway"
echo "3. Set environment variables in Railway dashboard:"
echo "   - ENVIRONMENT=production"
echo "   - JWT_SECRET=your-secure-secret"
echo "   - CORS_ORIGINS=https://your-railway-domain.up.railway.app"
echo "   - DOMAIN=your-railway-domain.up.railway.app"
echo ""
echo "✅ Ready for Railway deployment!" 