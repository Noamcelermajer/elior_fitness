# Fixing Railway Error Code 11 (Network Connectivity)

## Error Code 11 Meaning

Error code 11 from `socket.connect_ex()` means **EAGAIN - Resource temporarily unavailable**, which in practice usually indicates:
- Connection refused (service not running or port closed)
- Host unreachable (network routing issue)
- Services not properly linked in Railway

## Immediate Steps to Fix

### Step 1: Verify Services are Linked

1. Go to Railway dashboard
2. Check that both services (application + PostgreSQL) are in the **same project**
3. Verify services show connection indicators (they should be linked automatically)
4. If not linked, services won't be able to communicate

### Step 2: Check PostgreSQL Service Status

1. Go to PostgreSQL service in Railway
2. Check **Logs** tab - should show:
   ```
   database system is ready to accept connections
   ```
3. Check service is **Active** and **Healthy**
4. Wait 2-3 minutes after service creation for full initialization

### Step 3: Verify DATABASE_URL

1. In Railway dashboard, go to your **application service**
2. Go to **Variables** tab
3. Check `DATABASE_URL` is set correctly
4. For internal URL, should be: `postgresql://user:pass@postgres-XXXX.railway.internal:5432/database`
5. For public URL, should be: `postgresql://user:pass@crossover.proxy.rlwy.net:43922/database`

### Step 4: Rebuild Docker Image

The Docker image needs to be rebuilt to include `psycopg2-binary`:

1. **Option A: Push to trigger rebuild**
   ```bash
   git add .
   git commit -m "Fix PostgreSQL connection diagnostics"
   git push
   ```
   Railway will automatically rebuild

2. **Option B: Manual rebuild in Railway**
   - Go to Railway dashboard
   - Click on your application service
   - Click "Deploy" → "Redeploy"

### Step 5: Check Network Diagnostics

After rebuild, check logs for:

✅ **Success indicators:**
```
✓ DNS resolution successful: hostname -> IP
✓ Network connectivity test passed - port is reachable
```

❌ **Failure indicators:**
```
✗ DNS resolution failed
✗ Network connectivity test failed: EAGAIN - Resource temporarily unavailable
```

## Common Causes and Solutions

### Cause 1: Services Not in Same Project

**Symptom:** DNS resolution fails

**Solution:**
- Ensure both services are in the same Railway project
- Railway services in the same project can communicate via internal DNS

### Cause 2: PostgreSQL Not Ready

**Symptom:** Connection refused (error code 111) or timeout

**Solution:**
- Wait 2-3 minutes after creating PostgreSQL service
- Check PostgreSQL logs for "ready to accept connections"
- Verify service health status

### Cause 3: Wrong DATABASE_URL

**Symptom:** DNS resolution fails or connection refused

**Solution:**
- Copy `DATABASE_URL` directly from PostgreSQL service variables
- Don't use reference variables like `${{ Postgres.DATABASE_URL }}`
- Set the full connection string directly

### Cause 4: Network Isolation

**Symptom:** Error code 11 or 113 (EHOSTUNREACH)

**Solution:**
- Check Railway project settings for network isolation
- Verify outbound connections are allowed (default: yes)
- Try using internal URL instead of public URL

### Cause 5: Docker Image Not Rebuilt

**Symptom:** `ModuleNotFoundError: No module named 'psycopg2'`

**Solution:**
- Push code changes to trigger rebuild
- Or manually redeploy in Railway dashboard
- Verify `psycopg2-binary` is in `requirements.txt`

## Testing Connection from Container

If you have Railway CLI access:

```bash
# SSH into application container
railway ssh --service <your-app-service-id>

# Test DNS resolution
nslookup crossover.proxy.rlwy.net
# or
host crossover.proxy.rlwy.net

# Test network connectivity
nc -zv crossover.proxy.rlwy.net 43922
# or
telnet crossover.proxy.rlwy.net 43922

# Test PostgreSQL connection
psql "postgresql://postgres:password@crossover.proxy.rlwy.net:43922/railway"
```

## Next Steps After Fix

Once connection works, you should see:
1. ✓ DNS resolution successful
2. ✓ Network connectivity test passed
3. ✓ Connection test successful
4. ✓ Database tables initialized successfully

If you still see errors after following these steps, the issue is likely:
- Railway platform issue (check status.railway.app)
- Services in different regions/data centers
- Network policy restrictions

Contact Railway support with:
- Service IDs
- Error logs
- Network test results

