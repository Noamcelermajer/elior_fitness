# Railway PostgreSQL Connection Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: Connection Timeout Errors

**Symptoms:**
```
psycopg2.OperationalError: connection to server at "postgres-mgxw.railway.internal" ... port 5432 failed: timeout expired
```

**Solutions:**

1. **Verify DATABASE_URL is set correctly in Railway:**
   - Go to your application service in Railway dashboard
   - Navigate to "Variables" tab
   - Ensure `DATABASE_URL` is set to the full connection string from PostgreSQL service
   - **DO NOT** use reference variables like `${{ Postgres.DATABASE_URL }}` - use the full connection string directly

2. **Check if services are linked:**
   - In Railway dashboard, ensure your application service is linked to the PostgreSQL service
   - Both services should be in the same project

3. **Use DATABASE_PUBLIC_URL as fallback:**
   - If internal connection fails, try using `DATABASE_PUBLIC_URL` from PostgreSQL service
   - This uses the public endpoint instead of internal network

4. **Verify PostgreSQL service is running:**
   - Check PostgreSQL service logs in Railway dashboard
   - Ensure the service shows as "Active" and "Healthy"

### Issue 2: ModuleNotFoundError: No module named 'psycopg2'

**Symptoms:**
```
ModuleNotFoundError: No module named 'psycopg2'
```

**Solutions:**

1. **Verify requirements.txt includes psycopg2-binary:**
   ```txt
   psycopg2-binary>=2.9.9
   ```

2. **Trigger a rebuild:**
   - Push changes to GitHub
   - Railway will automatically rebuild
   - Or manually trigger rebuild in Railway dashboard

3. **Check Dockerfile:**
   - Ensure `requirements.txt` is copied before `pip install`
   - Verify the install step runs: `RUN pip install --no-cache-dir -r requirements.txt`

### Issue 3: Network Unreachable

**Symptoms:**
```
connection to server at "postgres.railway.internal" ... failed: Network is unreachable
```

**Solutions:**

1. **Use correct service hostname:**
   - Railway internal hostnames are service-specific
   - Use the exact hostname from PostgreSQL service's `DATABASE_URL`
   - Format: `postgres-XXXX.railway.internal` (where XXXX is unique)

2. **Check service naming:**
   - Ensure you're using the correct PostgreSQL service name
   - Railway generates unique service names

3. **Try public URL:**
   - Use `DATABASE_PUBLIC_URL` instead of `DATABASE_URL`
   - This bypasses internal networking issues

## Testing Connection

### Method 1: Using the Test Script

1. **Copy test script to Railway:**
   ```bash
   # The test_postgres_connection.py script is in the repo root
   ```

2. **Run in Railway container:**
   ```bash
   railway run --service <your-app-service-id> python test_postgres_connection.py
   ```

### Method 2: Using Railway CLI

1. **SSH into application service:**
   ```bash
   railway ssh --service <your-app-service-id>
   ```

2. **Test connection:**
   ```bash
   python test_postgres_connection.py
   ```

### Method 3: Check Environment Variables

1. **List all database-related variables:**
   ```bash
   railway variables --service <your-app-service-id>
   ```

2. **Verify DATABASE_URL format:**
   ```
   postgresql://username:password@hostname:port/database
   ```

## Correct Configuration Steps

### Step 1: Get PostgreSQL Connection String

1. Go to Railway dashboard
2. Select your PostgreSQL service
3. Go to "Variables" tab
4. Copy the `DATABASE_URL` value
5. It should look like:
   ```
   postgresql://postgres:password@postgres-XXXX.railway.internal:5432/railway
   ```

### Step 2: Set in Application Service

1. Go to your application service in Railway
2. Navigate to "Variables" tab
3. Add or update `DATABASE_URL`:
   - **Key:** `DATABASE_URL`
   - **Value:** (paste the full connection string from Step 1)
4. **DO NOT** use reference variables - paste the full string

### Step 3: Verify Services are Linked

1. In Railway dashboard, check both services are in the same project
2. Application service should show PostgreSQL as a dependency
3. If not linked, Railway should auto-detect, but you can manually link in service settings

### Step 4: Rebuild and Deploy

1. Push your code changes to GitHub
2. Railway will automatically rebuild
3. Or manually trigger rebuild in Railway dashboard
4. Check logs for connection success

## Connection String Format

**Correct format:**
```
postgresql://username:password@hostname:port/database
```

**Example:**
```
postgresql://postgres:SlECPCCUwevaBJPfQwRtLZDateaPuOIB@postgres-mgxw.railway.internal:5432/railway
```

**Components:**
- `postgresql://` - Protocol
- `postgres` - Username
- `SlECPCCUwevaBJPfQwRtLZDateaPuOIB` - Password
- `postgres-mgxw.railway.internal` - Hostname (internal Railway network)
- `5432` - Port
- `railway` - Database name

## Using Public URL (Fallback)

If internal connection fails, use `DATABASE_PUBLIC_URL`:

1. Get `DATABASE_PUBLIC_URL` from PostgreSQL service variables
2. Set it as `DATABASE_URL` in application service
3. This uses Railway's public endpoint (slightly slower but more reliable)

## Verification Checklist

- [ ] `psycopg2-binary` is in `requirements.txt`
- [ ] `DATABASE_URL` is set in application service variables
- [ ] Connection string is complete (not a reference variable)
- [ ] PostgreSQL service is running and healthy
- [ ] Services are in the same Railway project
- [ ] Application service has been rebuilt after changes
- [ ] Logs show connection attempts (not immediate failures)

## Still Having Issues?

1. **Check Railway status page:** https://status.railway.app
2. **Review Railway logs:** Application service logs and PostgreSQL service logs
3. **Test with test script:** Run `test_postgres_connection.py` in Railway container
4. **Contact Railway support:** If issues persist, contact Railway support with:
   - Service IDs
   - Error logs
   - Connection string format (with password masked)


