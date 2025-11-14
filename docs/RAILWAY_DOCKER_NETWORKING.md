# Railway Docker Networking Issues

## Problem

Docker containers in Railway may have network restrictions that prevent connections to external services, even if they're "public" URLs within Railway's infrastructure.

## Symptoms

- Connection timeouts to both internal (`.railway.internal`) and public (`proxy.rlwy.net`) URLs
- `psycopg2.OperationalError: timeout expired`
- Network connectivity test fails
- Services appear to be running but can't connect

## Root Causes

### 1. Services Not Properly Linked

Railway services need to be in the same project and properly linked to communicate.

**Solution:**
1. Go to Railway dashboard
2. Ensure both services (application and PostgreSQL) are in the same project
3. Check if services show as "linked" or "connected"
4. If not linked, Railway should auto-detect, but you can manually verify in service settings

### 2. PostgreSQL Service Not Ready

The PostgreSQL service might be starting up or unhealthy.

**Solution:**
1. Check PostgreSQL service logs in Railway
2. Verify service shows as "Active" and "Healthy"
3. Wait a few minutes after creating the service for it to fully initialize

### 3. Network Policies / Firewall

Railway might have network policies blocking connections between services.

**Solution:**
1. Try using the internal URL instead of public URL
2. Verify services are in the same Railway region/data center
3. Check Railway status page for network issues

### 4. SSL/TLS Handshake Failure

SSL connection might be failing even though the network is reachable.

**Solution:**
1. The code now automatically adjusts SSL mode based on URL type
2. Internal URLs use `sslmode=prefer` (doesn't require SSL)
3. Public URLs use `sslmode=require` (requires SSL)

### 5. Docker Container Network Isolation

Docker containers might not have access to external network resources.

**Solution:**
1. Verify Railway allows outbound connections (should be enabled by default)
2. Check if there are any network restrictions in Railway project settings
3. Try connecting from within the container using Railway CLI

## Diagnostic Steps

### Step 1: Verify Services are Linked

```bash
# In Railway dashboard, check:
# - Both services are in the same project
# - Services show connection indicators
# - No network isolation warnings
```

### Step 2: Check PostgreSQL Service Status

```bash
# In Railway dashboard:
# 1. Go to PostgreSQL service
# 2. Check "Logs" tab - should show "database system is ready to accept connections"
# 3. Check "Metrics" tab - should show active connections
# 4. Verify service is "Active" and "Healthy"
```

### Step 3: Test Connection from Container

```bash
# SSH into your application container
railway ssh --service <your-app-service-id>

# Test network connectivity
nc -zv crossover.proxy.rlwy.net 43922
# or
telnet crossover.proxy.rlwy.net 43922

# Test PostgreSQL connection
psql "postgresql://postgres:password@crossover.proxy.rlwy.net:43922/railway"
```

### Step 4: Verify Environment Variables

```bash
# In Railway dashboard, verify:
# - DATABASE_URL is set correctly
# - No typos in connection string
# - Password is correct
# - Hostname and port match PostgreSQL service
```

## Solutions

### Solution 1: Use Internal URL (Recommended for Railway)

Internal URLs are more reliable within Railway's network:

1. Get internal URL from PostgreSQL service variables
2. Set `DATABASE_URL` to internal URL in application service
3. Format: `postgresql://user:password@postgres-XXXX.railway.internal:5432/database`

### Solution 2: Verify Service Linking

1. Go to Railway project dashboard
2. Ensure both services show connection indicators
3. If not connected, Railway should auto-detect, but verify in settings

### Solution 3: Check Railway Network Settings

1. Go to Railway project settings
2. Check for any network isolation or firewall rules
3. Verify outbound connections are allowed (default: yes)

### Solution 4: Wait for PostgreSQL to be Ready

PostgreSQL can take 1-2 minutes to fully initialize:

1. Check PostgreSQL logs for "database system is ready"
2. Wait a few minutes after service creation
3. Verify service health status

### Solution 5: Use Railway's Service Discovery

Railway provides automatic service discovery. Instead of hardcoding URLs:

1. Use Railway's reference variables (if supported)
2. Or ensure services are in the same project for auto-discovery

## Code Changes Made

The application now:

1. **Automatically detects URL type** and adjusts SSL mode:
   - Public URLs (`proxy.rlwy.net`): `sslmode=require`
   - Internal URLs (`.railway.internal`): `sslmode=prefer`

2. **Increased connection timeout** to 60 seconds

3. **Added network diagnostics** that test connectivity before attempting connection

4. **Better error messages** that guide you to the solution

5. **Exponential backoff retry** with up to 5 attempts

## Verification

After applying fixes, check logs for:

✅ **Success indicators:**
```
✓ Network connectivity test passed
✓ Connection test successful
✓ Database tables initialized successfully
```

❌ **Failure indicators:**
```
⚠ Network connectivity test failed
Connection timeout detected
Failed to initialize database after 5 attempts
```

## Still Not Working?

If none of the above solutions work:

1. **Contact Railway Support** with:
   - Service IDs
   - Error logs
   - Connection string format (with password masked)
   - Network test results

2. **Check Railway Status**: https://status.railway.app

3. **Try Alternative**: Use Railway's managed PostgreSQL connection method if available

## Important Notes

- Railway services in the same project should be able to communicate
- Internal URLs are more reliable than public URLs for service-to-service communication
- Public URLs are meant for external access, not internal service communication
- Docker containers in Railway should have network access by default


