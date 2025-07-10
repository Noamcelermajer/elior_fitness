# Railway Deployment Guide

## Quick Deploy

1. **Connect to Railway**:
   ```bash
   npm install -g @railway/cli
   railway login
   railway link
   ```

2. **Deploy**:
   ```bash
   railway up
   ```

## Environment Variables (Set in Railway Dashboard)

```
ENVIRONMENT=production
JWT_SECRET=your-secure-jwt-secret-here
DATABASE_URL=sqlite:///./data/elior_fitness.db
DOMAIN=your-railway-domain.up.railway.app
CORS_ORIGINS=https://your-railway-domain.up.railway.app
LOG_LEVEL=INFO
```

## Troubleshooting

### 502 Error on Frontend

1. **Check Railway logs**:
   ```bash
   railway logs
   ```

2. **Test endpoints**:
   - Health: `https://your-domain.up.railway.app/health`
   - Test: `https://your-domain.up.railway.app/test`
   - API: `https://your-domain.up.railway.app/api/`

3. **Verify Dockerfile is used**:
   - Check Railway build logs for "Building with Dockerfile"
   - Ensure `railway.json` is in root directory

### Common Issues

1. **Frontend not loading**: Check if nginx is running in container
2. **API not responding**: Check if FastAPI is running on port 8001
3. **Health check failing**: Verify `/health` endpoint returns 200

### Debug Commands

```bash
# Check Railway status
railway status

# View logs
railway logs

# Redeploy
railway up

# Check environment variables
railway variables
```

## Architecture

- **Port 80**: Nginx serves frontend and proxies API
- **Port 8001**: FastAPI runs internally
- **Health Check**: `/health` endpoint for Railway monitoring
- **Frontend**: React SPA served by nginx
- **API**: FastAPI proxied through nginx at `/api/`

## Expected Behavior

- ✅ Frontend loads at root URL
- ✅ API accessible at `/api/` endpoints
- ✅ Health check returns 200
- ✅ WebSocket support at `/api/ws/`
- ❌ Sensitive endpoints blocked (`/docs`, `/metrics`) 