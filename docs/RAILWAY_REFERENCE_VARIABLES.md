# Railway Reference Variables Explained

## The Problem

You're using:
```
DATABASE_URL="${{shared.DATABASE_URL}}"
```

This is a **Railway reference variable** that tries to reference a variable from another service. However, these reference variables often don't work reliably, especially for database connections.

## Why It's Not Working

1. **Reference Format**: `${{shared.DATABASE_URL}}` might not be the correct service name
2. **Resolution Issues**: Railway reference variables sometimes don't resolve at runtime
3. **Service Naming**: The service might be named differently (e.g., `Postgres-mgXw` not `shared`)

## Solution: Use the Actual Connection String

Instead of using a reference variable, **copy the actual DATABASE_URL value** from your PostgreSQL service and set it directly.

### Step 1: Get the Actual DATABASE_URL

1. Go to Railway Dashboard
2. Click on your **PostgreSQL service** (might be named `Postgres-mgXw` or similar)
3. Go to **Variables** tab
4. Find `DATABASE_URL`
5. **Copy the entire value** (it will look like: `postgresql://postgres:password@host:port/database`)

### Step 2: Set It Directly

In your **application service** → **Variables**:

**❌ DON'T USE:**
```
DATABASE_URL="${{shared.DATABASE_URL}}"
```

**✅ USE INSTEAD:**
```
DATABASE_URL="postgresql://postgres:SlECPCCUwevaBJPfQwRtLZDateaPuOIB@postgres-mgxw.railway.internal:5432/railway"
```

(Replace with your actual connection string from Step 1)

## Alternative: Use Railway CLI

You can also get the DATABASE_URL using Railway CLI:

```bash
# List all variables for PostgreSQL service
railway variables --service=<postgres-service-id>

# Or get specific variable
railway variables get DATABASE_URL --service=<postgres-service-id>
```

## Why Direct Connection String is Better

1. **Reliability**: Always works, no resolution issues
2. **Debugging**: You can see exactly what connection string is being used
3. **Logs**: The new logging will show the exact value received
4. **No Dependencies**: Doesn't depend on Railway's reference variable system

## Reference Variable Format (If You Must Use)

If you want to try reference variables, the format should be:

```
DATABASE_URL="${{Postgres-mgXw.DATABASE_URL}}"
```

Where `Postgres-mgXw` is the **exact service name** in Railway.

But **we strongly recommend using the direct connection string** instead.

## Verification

After setting the direct connection string, check logs for:

```
DATABASE_URL received: postgresql://postgres:***@postgres-mgxw.railway.internal:5432/railway
DATABASE_URL is None: False
DATABASE_URL starts with 'postgresql': True
```

If you see `DATABASE_URL is None: True`, the variable isn't being set correctly.

