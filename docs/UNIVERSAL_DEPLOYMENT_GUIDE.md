# Universal Deployment Guide

This guide explains how to deploy Elior Fitness with **universal configuration** that works with any reverse proxy or deployment platform.

## 🎯 Universal Configuration Benefits

- **No platform-specific builds** - Same code works everywhere
- **Automatic environment detection** - Adapts to any deployment scenario
- **Flexible CORS handling** - Works with any domain setup
- **Zero configuration** - Just works out of the box

## 🚀 Deployment Scenarios

### 1. Local Development (No Reverse Proxy)
```bash
# Start the application
docker-compose up -d --build

# Access at: http://localhost:8000
```

**Automatic Detection:**
- Environment: `development`
- Domain: `localhost`
- CORS: `http://localhost:3000, http://localhost:8000, etc.`

### 2. Local Development with Caddy Reverse Proxy
```bash
# Set your domain (optional)
export DOMAIN=your-domain.duckdns.org
export CORS_ORIGINS=https://your-domain.duckdns.org,http://your-domain.duckdns.org

# Start the application
docker-compose up -d --build

# Configure Caddy with Caddyfile.example
# Access at: https://your-domain.duckdns.org
```

**Automatic Detection:**
- Environment: `development` (but with production CORS)
- Domain: `your-domain.duckdns.org`
- CORS: `https://your-domain.duckdns.org, http://your-domain.duckdns.org`

### 3. Railway Deployment
```bash
# Deploy to Railway
railway up

# Railway automatically sets:
# - RAILWAY_PUBLIC_DOMAIN
# - PORT
```

**Automatic Detection:**
- Environment: `production`
- Domain: `your-app.railway.app`
- CORS: `https://your-app.railway.app, http://your-app.railway.app`

### 4. Any Other Platform (Render, Heroku, Vercel, etc.)
```bash
# Set environment variables (optional)
ENVIRONMENT=production
DOMAIN=your-domain.com
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Deploy normally
```

## 🔧 Environment Variables (Optional)

You can override automatic detection with these environment variables:

| Variable | Description | Auto-detected from |
|----------|-------------|-------------------|
| `ENVIRONMENT` | `development` or `production` | Platform indicators |
| `DOMAIN` | Your domain name | Platform domains |
| `CORS_ORIGINS` | Comma-separated origins | Domain + defaults |

## 🧪 Testing Your Configuration

### 1. Test Environment Detection
```bash
python test_env.py
```

### 2. Test API Endpoints
```bash
# Test basic functionality
curl http://localhost:8000/test

# Test API endpoints
curl http://localhost:8000/api/test

# Test environment detection
curl http://localhost:8000/api/debug/env
```

### 3. Test Authentication
1. Open browser dev tools (F12)
2. Go to Console tab
3. Try to login
4. Check for CORS errors or authentication issues

## 🔍 Debugging

### Check Environment Variables
```bash
# View current environment detection
curl http://localhost:8000/api/debug/env
```

### Check Logs
```bash
# View application logs
docker-compose logs -f elior-fitness

# Or check log files
tail -f logs/elior_api_$(date +%Y%m%d).log
```

### Common Issues

1. **CORS Errors**: Check `/api/debug/env` to verify CORS origins
2. **Authentication Fails**: Verify API URL in browser console
3. **Wrong Environment**: Check environment detection output

## 📋 Platform-Specific Notes

### Caddy Reverse Proxy
- Use `Caddyfile.example` as a starting point
- Ensure Caddy can reach `localhost:8000`
- Set `DOMAIN` environment variable for proper CORS

### Railway
- No configuration needed - automatic detection
- Uses `RAILWAY_PUBLIC_DOMAIN` for domain detection
- Uses `PORT` for production detection

### Docker Compose
- Works with any reverse proxy
- Set environment variables in `docker-compose.yml` or `.env` file
- Supports both development and production modes

## 🎉 Success Indicators

Your deployment is working correctly when:

1. ✅ `/test` endpoint returns success
2. ✅ `/api/test` endpoint returns success  
3. ✅ `/api/debug/env` shows correct environment detection
4. ✅ Login works without CORS errors
5. ✅ Frontend loads and functions normally

## 🔄 Migration from Platform-Specific Config

If you're migrating from platform-specific configuration:

1. **Remove platform-specific environment variables**
2. **Deploy with universal configuration**
3. **Test all endpoints**
4. **Verify authentication works**

The universal configuration will automatically detect your deployment environment and configure everything correctly. 