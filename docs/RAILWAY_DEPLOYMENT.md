# Railway Deployment Guide

## Overview

This guide explains how to deploy the Elior Fitness application to Railway with proper SSL termination and frontend serving.

## Railway-Specific Configuration

### Key Differences from Local Development

1. **SSL Termination**: Railway handles SSL at the load balancer level
2. **Port Configuration**: Container listens on port 80, Railway handles HTTPS
3. **Proxy Headers**: Railway sends `X-Forwarded-*` headers
4. **Environment Variables**: Production-specific settings

### Configuration Files

- **Dockerfile**: `Dockerfile` - Now uses Railway configuration
- **Nginx**: `nginx/nginx.railway.conf` - Handles SSL termination
- **Railway Config**: `railway.json` - Tells Railway how to build
- **Docker Compose**: `docker-compose.yml` - Updated for Railway compatibility

## Deployment Steps

### 1. Railway Setup

1. **Connect Repository**: Link your GitHub repository to Railway
2. **Create Service**: Create a new service from your repository
3. **Set Root Directory**: Ensure Railway uses the project root

### 2. Environment Variables

Set these environment variables in Railway:

```bash
ENVIRONMENT=production
JWT_SECRET=your-secure-jwt-secret-here
DATABASE_URL=sqlite:///./data/elior_fitness.db
CORS_ORIGINS=https://eliorfitness-production.up.railway.app
DOMAIN=eliorfitness-production.up.railway.app
LOG_LEVEL=WARNING
ENABLE_DEBUG_LOGGING=false
```

### 3. Build Configuration

Railway will automatically detect and use:
- **Dockerfile**: `Dockerfile` (now Railway-compatible)
- **Railway Config**: `railway.json` (specifies build settings)
- **Port**: 80 (Railway handles HTTPS)
- **Health Check**: `/health` endpoint

### 4. Deploy

1. **Push Changes**: Commit and push your changes
2. **Automatic Build**: Railway will build using `Dockerfile` (Railway-compatible)
3. **Deploy**: Railway automatically deploys the new version

## Configuration Details

### Nginx Configuration (`nginx/nginx.railway.conf`)

```nginx
# Railway server - handles both HTTP and HTTPS (SSL termination at load balancer)
server {
    listen 80;
    server_name _;

    # Trust Railway's proxy headers
    real_ip_header X-Forwarded-For;
    set_real_ip_from 0.0.0.0/0;

    # Frontend serving
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://api_backend;
        # ... proxy settings
    }
}
```

### Key Features

1. **SSL Termination**: No SSL configuration needed in container
2. **Proxy Headers**: Trusts Railway's `X-Forwarded-*` headers
3. **Frontend First**: Serves frontend by default
4. **API Security**: Blocks external access to sensitive endpoints
5. **CORS**: Configured for Railway domain

## Testing Deployment

### Frontend Access
```bash
# Should work - frontend application
curl https://eliorfitness-production.up.railway.app/
```

### API Access (Should Fail)
```bash
# Should return 404 - API blocked externally
curl https://eliorfitness-production.up.railway.app/health
curl https://eliorfitness-production.up.railway.app/docs
```

### Frontend API (Should Work)
```bash
# API accessible from frontend (same origin)
curl https://eliorfitness-production.up.railway.app/api/users
```

## Troubleshooting

### 403 Forbidden Error

**Problem**: Frontend returns 403 Forbidden
**Solution**: 
1. Ensure using `Dockerfile` (now Railway-compatible)
2. Check nginx configuration is `nginx.railway.conf`
3. Verify frontend files are built and copied
4. Check `railway.json` configuration exists

### SSL Issues

**Problem**: SSL certificate errors
**Solution**: 
1. Railway handles SSL automatically
2. Container should listen on port 80 only
3. No SSL configuration needed in container

### API Not Accessible

**Problem**: Frontend can't access API
**Solution**:
1. Check CORS origins include Railway domain
2. Verify API proxy configuration
3. Check Railway logs for errors

### Build Failures

**Problem**: Build fails on Railway
**Solution**:
1. Check `Dockerfile` exists and is Railway-compatible
2. Verify `railway.json` configuration exists
3. Verify all required files are present
4. Check Railway build logs

## Monitoring

### Railway Dashboard
- **Logs**: View real-time application logs
- **Metrics**: Monitor resource usage
- **Deployments**: Track deployment history

### Health Checks
- **Endpoint**: `/health` (internal only)
- **Frequency**: Every 30 seconds
- **Timeout**: 10 seconds

### Logs
- **Access Logs**: `/var/log/nginx/access.log`
- **Error Logs**: `/var/log/nginx/error.log`
- **Application Logs**: Railway dashboard

## Security Features

1. **Frontend-Only External Access**: Only frontend publicly accessible
2. **Internal API**: Backend API internal only
3. **Blocked Endpoints**: Health, docs, metrics blocked externally
4. **SSL/TLS**: Handled by Railway load balancer
5. **CORS**: Configured for Railway domain only

## Performance Optimization

1. **Resource Limits**: 512MB memory, 1 CPU core
2. **Gzip Compression**: Enabled for static files
3. **Caching**: Static files cached for 1 year
4. **Rate Limiting**: API endpoints rate limited
5. **Connection Pooling**: Database connection optimization

## Rollback

If deployment fails:
1. **Railway Dashboard**: Go to Deployments tab
2. **Previous Version**: Click on previous successful deployment
3. **Redeploy**: Click "Redeploy" to rollback

## Support

For Railway-specific issues:
1. **Railway Documentation**: https://docs.railway.app/
2. **Railway Discord**: https://discord.gg/railway
3. **Railway Support**: https://railway.app/support 