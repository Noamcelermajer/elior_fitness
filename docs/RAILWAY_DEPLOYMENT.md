# Railway Deployment Guide

This guide will walk you through deploying the Elior Fitness application to Railway.

## Prerequisites

- A Railway account (sign up at https://railway.app)
- A GitHub account with the repository pushed
- Basic understanding of environment variables

## Step 1: Connect GitHub Repository to Railway

1. Log in to your Railway account
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Authorize Railway to access your GitHub account if prompted
5. Select the `elior_fitness` repository
6. Railway will automatically detect the Dockerfile and start building

## Step 2: Configure Environment Variables

In the Railway project dashboard, go to the "Variables" tab and add the following environment variables:

### Required Variables

```
ENVIRONMENT=production
DOMAIN=your-railway-domain.railway.app
CORS_ORIGINS=https://your-railway-domain.railway.app,https://www.your-railway-domain.railway.app
JWT_SECRET=your-secure-jwt-secret-here-minimum-32-characters
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
DATABASE_PATH=/app/data/elior_fitness.db
DATABASE_URL=sqlite:////app/data/elior_fitness.db
LOG_LEVEL=WARNING
PORT=8000
```

### Generating JWT Secret

Generate a secure JWT secret using:
```bash
openssl rand -hex 32
```

### Optional Variables

```
MAX_FILE_SIZE=5242880
UPLOAD_DIR=/app/uploads
WORKERS=1
MAX_CONCURRENT_REQUESTS=50
MAX_REQUESTS_PER_WORKER=1000
ENABLE_DEBUG_LOGGING=false
```

## Step 3: Configure Persistent Storage

Railway provides ephemeral storage by default. For database persistence:

1. Go to your service in Railway dashboard
2. Click on "Settings"
3. Scroll to "Volumes" section
4. Add a volume for `/app/data` to persist the SQLite database
5. Optionally add volumes for `/app/uploads` and `/app/logs` if needed

**Important**: Without volumes, data will be lost on redeployments.

## Step 4: Domain Configuration

### Using Railway's Default Domain

Railway automatically provides a domain like `your-app-name.up.railway.app`. This is HTTPS-enabled by default.

### Using Custom Domain

1. Go to your service settings
2. Click on "Networking" tab
3. Click "Add Domain"
4. Enter your custom domain
5. Follow Railway's DNS configuration instructions
6. Update `CORS_ORIGINS` environment variable to include your custom domain

## Step 5: Deploy

Railway will automatically:
1. Build the Docker image from your Dockerfile
2. Deploy the container
3. Run the startup script which:
   - Starts FastAPI server
   - Initializes admin user (username: `admin`, password: `2354wetr`)

### Monitoring Deployment

1. Go to the "Deployments" tab to see build logs
2. Check the "Logs" tab for runtime logs
3. Monitor the "Metrics" tab for resource usage

## Step 6: Verify Deployment

1. Visit your Railway domain (e.g., `https://your-app-name.up.railway.app`)
2. You should see the login page
3. Log in with admin credentials:
   - Username: `admin`
   - Password: `2354wetr`

## Step 7: Health Check

Railway uses the health check endpoint configured in the Dockerfile:
- Endpoint: `/health`
- Railway will automatically restart the service if health checks fail

## Troubleshooting

### Build Failures

- Check the build logs in Railway dashboard
- Ensure Dockerfile is in the root directory
- Verify all dependencies are correctly specified

### Runtime Errors

- Check application logs in Railway dashboard
- Verify all environment variables are set correctly
- Ensure database path is writable

### Database Issues

- Verify volume is mounted correctly
- Check database file permissions
- Ensure `/app/data` directory exists

### Port Issues

- Railway automatically sets the `PORT` environment variable
- The Dockerfile uses `${PORT:-8000}` to handle this
- Do not hardcode port 8000 in production

## Updating the Application

Railway automatically redeploys when you push to the connected GitHub branch:

1. Make changes to your code
2. Commit and push to GitHub
3. Railway detects the push and starts a new deployment
4. Monitor the deployment in Railway dashboard

## Environment-Specific Notes

### Production Best Practices

1. **Security**:
   - Use a strong JWT secret (minimum 32 characters)
   - Never commit `.env` files
   - Use Railway's secret management for sensitive data

2. **Performance**:
   - Monitor resource usage in Railway dashboard
   - Adjust `WORKERS` based on traffic
   - Use Railway's auto-scaling if needed

3. **Backups**:
   - Regularly backup the database volume
   - Export database using Railway's volume export feature
   - Consider automated backup solutions

4. **Monitoring**:
   - Use Railway's built-in metrics
   - Set up alerts for errors
   - Monitor application logs regularly

## Cost Considerations

Railway offers:
- Free tier with limited usage
- Pay-as-you-go pricing
- Volume storage costs extra

Monitor your usage in the Railway dashboard to avoid unexpected charges.

## Support

- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Railway Status: https://status.railway.app

## Additional Configuration

### Custom Build Command

If needed, you can specify a custom build command in `railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  }
}
```

### Health Check Configuration

The health check is configured in the Dockerfile:
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1
```

Railway respects this health check configuration.

## Notes

- Railway automatically handles HTTPS/SSL certificates
- Railway sets the `PORT` environment variable automatically
- The application uses SQLite by default (suitable for small to medium deployments)
- For larger deployments, consider migrating to PostgreSQL (Railway offers managed PostgreSQL)
