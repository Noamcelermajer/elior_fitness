# Railway Deployment Checklist

## ✅ Pre-Deployment Checklist

### Required Files
- [x] `Dockerfile` - Updated to use Railway nginx config
- [x] `nginx/nginx.railway.conf` - Railway-specific nginx configuration
- [x] `railway.json` - Railway build configuration
- [x] `docker-compose.yml` - Updated for Railway compatibility

### Configuration Verification
- [x] Nginx listens on port 80 (not 443)
- [x] SSL termination handled by Railway (no SSL in container)
- [x] Proxy headers trusted (`X-Forwarded-*`)
- [x] Frontend serves from `/var/www/html`
- [x] API proxy to internal port 8001
- [x] Sensitive endpoints blocked externally

### Environment Variables (Set in Railway Dashboard)
- [ ] `ENVIRONMENT=production`
- [ ] `JWT_SECRET=your-secure-secret`
- [ ] `CORS_ORIGINS=https://eliorfitness-production.up.railway.app`
- [ ] `DOMAIN=eliorfitness-production.up.railway.app`
- [ ] `LOG_LEVEL=WARNING`

## 🚀 Deployment Steps

1. **Push Changes**
   ```bash
   git add .
   git commit -m "Configure for Railway deployment"
   git push origin main
   ```

2. **Railway Dashboard**
   - Go to your Railway project
   - Verify service is connected to your repository
   - Check that deployment starts automatically

3. **Monitor Build**
   - Watch Railway build logs
   - Ensure no build errors
   - Verify nginx configuration test passes

4. **Test Deployment**
   - Visit `https://eliorfitness-production.up.railway.app/`
   - Should show login page (not 403 Forbidden)
   - Frontend should be fully functional

## 🔍 Troubleshooting

### If Railway Doesn't Detect Dockerfile
- Ensure `Dockerfile` exists (not `Dockerfile.railway`)
- Check `railway.json` configuration
- Verify repository is properly connected

### If Frontend Shows 403 Forbidden
- Check Railway build logs for nginx errors
- Verify `nginx/nginx.railway.conf` is being used
- Ensure frontend files are built and copied

### If API Calls Fail
- Check CORS origins include Railway domain
- Verify API proxy configuration
- Check Railway logs for API errors

## 📋 File Structure

```
Elior/
├── Dockerfile                    # Railway-compatible
├── railway.json                  # Railway configuration
├── docker-compose.yml           # Updated for Railway
├── nginx/
│   └── nginx.railway.conf       # Railway nginx config
├── Frontend/                    # Frontend source
└── app/                         # Backend source
```

## ✅ Success Indicators

- [ ] Railway build completes successfully
- [ ] Frontend accessible at Railway URL
- [ ] Login page displays correctly
- [ ] API calls work from frontend
- [ ] Sensitive endpoints return 404 externally
- [ ] SSL works properly (handled by Railway)

## 🆘 Support

If deployment fails:
1. Check Railway build logs
2. Verify all required files are present
3. Ensure environment variables are set
4. Check Railway documentation: https://docs.railway.app/ 