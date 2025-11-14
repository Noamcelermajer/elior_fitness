# Railway PostgreSQL Public URL Setup

## Problem

Railway's internal URLs (`.railway.internal`) sometimes have connectivity issues, causing connection timeouts. The solution is to use the **public URL** instead.

## Solution: Use Public URL

Railway provides a public URL for PostgreSQL that's more reliable than the internal one.

### Step 1: Get Your Connection Details

From your PostgreSQL service in Railway:

1. **Internal URL** (from `DATABASE_URL`):
   ```
   postgresql://postgres:password@postgres-mgxw.railway.internal:5432/railway
   ```

2. **Public URL** (from Railway dashboard):
   ```
   Host: crossover.proxy.rlwy.net
   Port: 43922
   ```

### Step 2: Construct Public Connection String

Take the username, password, and database name from the internal URL, and combine with the public hostname and port:

**Format:**
```
postgresql://USERNAME:PASSWORD@PUBLIC_HOST:PUBLIC_PORT/DATABASE
```

**Example:**
```
postgresql://postgres:SlECPCCUwevaBJPfQwRtLZDateaPuOIB@crossover.proxy.rlwy.net:43922/railway
```

### Step 3: Set in Railway

**Option A: Use DATABASE_PUBLIC_URL (Automatic Fallback)**

1. Go to your PostgreSQL service in Railway
2. Copy the `DATABASE_PUBLIC_URL` value
3. Go to your application service
4. Add variable:
   - **Key:** `DATABASE_PUBLIC_URL`
   - **Value:** (paste the full connection string)

The application will automatically use the public URL if it detects an internal URL.

**Option B: Replace DATABASE_URL Directly**

1. Go to your application service in Railway
2. Update `DATABASE_URL`:
   - Replace `postgres-mgxw.railway.internal:5432` with `crossover.proxy.rlwy.net:43922`
   - Keep everything else the same (username, password, database)

**Example:**
```
# Before (internal - may timeout):
postgresql://postgres:password@postgres-mgxw.railway.internal:5432/railway

# After (public - more reliable):
postgresql://postgres:password@crossover.proxy.rlwy.net:43922/railway
```

## Automatic Fallback

The application now automatically:
- Detects if `DATABASE_URL` contains `.railway.internal`
- Checks if `DATABASE_PUBLIC_URL` is available
- Automatically switches to the public URL for better connectivity

You'll see this in logs:
```
Internal Railway URL detected but public URL available.
Switching to public URL for better connectivity.
```

## Verification

After setting up, check logs for:

✅ **Success:**
```
PostgreSQL connection details: host=crossover.proxy.rlwy.net, port=43922, database=railway, user=postgres
PostgreSQL engine created with performance optimizations
Database tables initialized successfully
```

❌ **Failure:**
```
connection to server at "crossover.proxy.rlwy.net" ... failed: timeout expired
```

If you still see timeouts with the public URL:
1. Verify the public URL is correct
2. Check PostgreSQL service is running
3. Verify firewall/network settings in Railway

## Security Note

Public URLs are still secure:
- They use SSL/TLS encryption (required)
- They're only accessible with the correct credentials
- Railway manages the proxy layer

## Quick Reference

**Your Public Connection String:**
```
postgresql://postgres:YOUR_PASSWORD@crossover.proxy.rlwy.net:43922/railway
```

Replace `YOUR_PASSWORD` with the actual password from your internal `DATABASE_URL`.


