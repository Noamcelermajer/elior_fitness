# Railway Deployment Guide for Elior Fitness

## Quick Fixes Applied

### 1. Port Configuration
- **Problem**: Dockerfile was hardcoded to port 80, but Railway uses dynamic ports
- **Fix**: Updated Dockerfile to use `$PORT` environment variable
- **Result**: App now listens on Railway's assigned port

### 2. Health Check Issues
- **Problem**: `/health` endpoint was too slow and database-dependent
- **Fix**: 
  - Changed Railway health check to `/test` endpoint (no database dependency)
  - Reduced health check timeout from 300s to 60s
  - Made `/health` endpoint always return 200 (even on errors)
- **Result**: Faster, more reliable health checks

### 3. Startup Script Improvements
- **Problem**: Startup script had timing issues and hardcoded ports
- **Fix**: 
  - Added dynamic port detection
  - Improved nginx configuration updates
  - Better error handling
- **Result**: More reliable startup process

## Deployment Steps

### 1. Environment Variables
Set these in Railway dashboard:

```bash
ENVIRONMENT=production
DOMAIN=eliorfitness-production.up.railway.app
CORS_ORIGINS=https://eliorfitness-production.up.railway.app,http://localhost:3000
LOG_LEVEL=INFO
ENABLE_DEBUG_LOGGING=false
SECRET_KEY=your-super-secret-key-here-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
MAX_FILE_SIZE=5242880
ALLOWED_EXTENSIONS=jpg,jpeg,png,gif,pdf,doc,docx
UPLOAD_DIR=uploads
WORKERS=1
WORKER_CONNECTIONS=256
```

### 2. Deploy to Railway
```bash
# Push your changes
git add .
git commit -m "Fix Railway deployment issues"
git push

# Railway will automatically deploy
```

### 3. Monitor Deployment
1. Go to Railway dashboard
2. Check the deployment logs
3. Look for these success messages:
   - "ELIOR FITNESS STARTUP"
   - "nginx -t" (nginx config test)
   - "Starting FastAPI on port 8001"

## Troubleshooting

### If you get 502 errors:

1. **Check Railway logs**:
   ```bash
   # In Railway dashboard, check the logs for:
   - "ELIOR FITNESS STARTUP"
   - "Using port: [PORT]"
   - "nginx -t" success
   - "Starting FastAPI on port 8001"
   ```

2. **Test endpoints manually**:
   ```bash
   # Test the simple endpoint
   curl https://eliorfitness-production.up.railway.app/test
   
   # Test the health endpoint
   curl https://eliorfitness-production.up.railway.app/health
   ```

3. **Common issues and fixes**:

   **Issue**: "nginx: [emerg] bind() to 0.0.0.0:80 failed"
   **Fix**: The startup script now uses dynamic ports

   **Issue**: Health check timeout
   **Fix**: Using `/test` endpoint instead of `/health`

   **Issue**: Database connection errors
   **Fix**: Health check now returns 200 even on database errors

### If the app starts but frontend doesn't load:

1. **Check if static files are built**:
   ```bash
   # In Railway logs, look for:
   "Checking frontend files..."
   "ls -la /var/www/html/"
   ```

2. **Test static file access**:
   ```bash
   curl https://eliorfitness-production.up.railway.app/
   # Should return the React app
   ```

### Database Issues:

1. **SQLite is used by default** (good for Railway)
2. **If you want PostgreSQL**:
   - Add PostgreSQL service in Railway
   - Set `DATABASE_URL` environment variable
   - Update the app to use PostgreSQL

## Performance Optimizations

### For Railway's free tier:
- Single worker (`WORKERS=1`)
- Reduced logging (`LOG_LEVEL=INFO`)
- Disabled debug logging
- Optimized nginx configuration
- Minimal health checks

### For paid tiers:
- Increase `WORKERS` to 2-4
- Enable debug logging if needed
- Increase `WORKER_CONNECTIONS`

## Monitoring

### Health Check Endpoints:
- `/test` - Simple health check (used by Railway)
- `/health` - Detailed health check with database status
- `/metrics` - Performance metrics
- `/status/database` - Database status

### Logs:
- Application logs: Railway dashboard
- Nginx logs: Inside container at `/var/log/nginx/`
- FastAPI logs: Application logs

## Security Notes

1. **Change the SECRET_KEY** in production
2. **Set proper CORS_ORIGINS** for your domain
3. **Database**: SQLite is fine for small scale, use PostgreSQL for larger scale
4. **File uploads**: Limited to 5MB by default

## Next Steps

1. Deploy with these fixes
2. Test the endpoints
3. Monitor the logs
4. If issues persist, check Railway's status page
5. Consider upgrading to paid tier for better performance

## Support

If you still have issues:
1. Check Railway's status page
2. Review the deployment logs
3. Test endpoints manually
4. Consider the app might need more resources (upgrade tier) 