# Security Configuration - Frontend-Only Access

## Overview

The application has been configured to serve **only the frontend by default** with restricted API access for enhanced security.

## Access Control

### Public Access (Port 3000)
- **Frontend Application**: `http://localhost:3000`
- **Static Files**: CSS, JS, images, etc.
- **Uploaded Files**: `/uploads/` (images, documents)
- **API Access**: Only through frontend requests (`/api/*`)

### Internal Access Only
- **Health Check**: `/health` - Internal networks only
- **API Documentation**: `/docs`, `/redoc`, `/openapi.json` - Internal networks only
- **Metrics**: `/metrics` - Completely blocked externally
- **Direct API**: Port 8000 - Internal networks only

### Blocked Access
- **Direct API calls** from external sources
- **Sensitive files**: `.env`, `.sql`, `.log`, `.ini`
- **Hidden files**: Files starting with `.`
- **Executable files**: `.php`, `.py`, `.exe`, `.sh`, `.bat`

## Network Restrictions

### Internal Networks Allowed
- `127.0.0.1` (localhost)
- `10.0.0.0/8` (private network)
- `172.16.0.0/12` (private network)
- `192.168.0.0/16` (private network)

### External Access
- All external IPs are denied access to internal endpoints
- Only frontend application is accessible externally

## Security Features

### Frontend Security
- Content Security Policy (CSP) headers
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: enabled
- Referrer-Policy: strict-origin-when-cross-origin

### API Security
- CORS headers for frontend requests
- Rate limiting on API endpoints
- Connection limiting per IP
- Request timeouts and size limits

### File Security
- File type restrictions for uploads
- Blocked access to sensitive file types
- Secure file serving with proper headers

## Configuration Files

### Nginx Configuration
- **File**: `nginx/nginx.secure.conf`
- **Purpose**: Secure frontend-only configuration
- **Features**: 
  - Frontend serving on port 80
  - Internal API proxy on port 8000
  - FastAPI backend on port 8001 (internal)
  - Restricted access controls

### Docker Configuration
- **File**: `docker-compose.yml`
- **Ports**: 
  - `3000:80` (Frontend only)
  - API port 8000 not exposed externally
  - FastAPI port 8001 internal only
- **Security**: Internal API access only

## Testing Access

### Frontend Access
```bash
# Should work - frontend application
curl http://localhost:3000
```

### API Access (Should Fail)
```bash
# Should return 404 - API blocked externally
curl http://localhost:3000/health
curl http://localhost:3000/docs
# API endpoints accessible for frontend requests (same origin)
curl http://localhost:3000/api/users  # Should work for frontend
```

### Internal Access (Should Work)
```bash
# From inside the container or internal network
curl http://localhost:8000/health
curl http://localhost:8000/docs
# Direct API access (internal only)
curl http://localhost:8001/health
curl http://localhost:8001/docs
```

## Deployment

### Production Deployment
1. Copy `env.production.example` to `.env.production`
2. Set environment variables
3. Run: `docker-compose up -d --build`

### Development
1. Run: `docker-compose up -d --build`
2. Access frontend at: `http://localhost:3000`
3. API is internal only

## Monitoring

### Health Checks
- Internal health endpoint: `/health`
- Container health checks configured
- Logging with size limits

### Logs
- Access logs: `/var/log/nginx/access.log`
- Error logs: `/var/log/nginx/error.log`
- Application logs: Docker container logs

## Troubleshooting

### Frontend Can't Access API
- Check if frontend is making requests to `/api/*`
- Verify CORS headers are present
- Check nginx error logs

### Health Check Failing
- Verify internal network access
- Check if health endpoint is accessible internally
- Review container logs

### File Upload Issues
- Check file size limits (5MB)
- Verify file type restrictions
- Review upload directory permissions

## Security Benefits

1. **Reduced Attack Surface**: API not exposed externally
2. **Frontend Isolation**: Only frontend accessible publicly
3. **Internal Monitoring**: Health and docs accessible internally
4. **File Security**: Restricted file access and uploads
5. **Network Security**: Internal-only API access
6. **CORS Protection**: Proper CORS configuration for frontend

## Compliance

This configuration provides:
- **Defense in Depth**: Multiple security layers
- **Principle of Least Privilege**: Minimal external access
- **Secure by Default**: Frontend-only external access
- **Internal Monitoring**: Health and documentation access
- **File Security**: Restricted file access patterns 