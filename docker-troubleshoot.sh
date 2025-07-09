#!/bin/bash

echo "=== ELIOR DOCKER TROUBLESHOOTING ==="
echo "This script will help identify common Docker issues"
echo ""

# Check Docker installation
echo "1. Checking Docker installation..."
if command -v docker &> /dev/null; then
    echo "✅ Docker is installed"
    docker --version
else
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

# Check Docker Compose
echo ""
echo "2. Checking Docker Compose..."
if command -v docker-compose &> /dev/null; then
    echo "✅ Docker Compose is installed"
    docker-compose --version
elif docker compose version &> /dev/null; then
    echo "✅ Docker Compose (v2) is installed"
    docker compose version
else
    echo "❌ Docker Compose is not installed"
    exit 1
fi

# Check Docker daemon
echo ""
echo "3. Checking Docker daemon..."
if docker info &> /dev/null; then
    echo "✅ Docker daemon is running"
else
    echo "❌ Docker daemon is not running"
    echo "Please start Docker Desktop or Docker daemon"
    exit 1
fi

# Check available disk space
echo ""
echo "4. Checking disk space..."
df -h . | head -2

# Check available memory
echo ""
echo "5. Checking available memory..."
free -h

# Check if ports are available
echo ""
echo "6. Checking if required ports are available..."
if lsof -i :3000 &> /dev/null; then
    echo "⚠️  Port 3000 is already in use"
else
    echo "✅ Port 3000 is available"
fi

if lsof -i :8000 &> /dev/null; then
    echo "⚠️  Port 8000 is already in use"
else
    echo "✅ Port 8000 is available"
fi

# Check file permissions
echo ""
echo "7. Checking file permissions..."
if [ -r "Dockerfile" ]; then
    echo "✅ Dockerfile is readable"
else
    echo "❌ Dockerfile is not readable"
fi

if [ -r "docker-compose.yml" ]; then
    echo "✅ docker-compose.yml is readable"
else
    echo "❌ docker-compose.yml is not readable"
fi

if [ -r "requirements.txt" ]; then
    echo "✅ requirements.txt is readable"
else
    echo "❌ requirements.txt is not readable"
fi

# Check if Frontend directory exists
echo ""
echo "8. Checking Frontend directory..."
if [ -d "Frontend" ]; then
    echo "✅ Frontend directory exists"
    if [ -f "Frontend/package.json" ]; then
        echo "✅ Frontend package.json exists"
    else
        echo "❌ Frontend package.json missing"
    fi
else
    echo "❌ Frontend directory missing"
fi

# Check if app directory exists
echo ""
echo "9. Checking app directory..."
if [ -d "app" ]; then
    echo "✅ app directory exists"
    if [ -f "app/main.py" ]; then
        echo "✅ app/main.py exists"
    else
        echo "❌ app/main.py missing"
    fi
else
    echo "❌ app directory missing"
fi

echo ""
echo "=== TROUBLESHOOTING COMPLETE ==="
echo ""
echo "If all checks passed, try running:"
echo "  docker-compose down"
echo "  docker-compose build --no-cache"
echo "  docker-compose up -d"
echo ""
echo "If you see errors, check the specific failing step above." 