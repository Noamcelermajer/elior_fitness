# Production PostgreSQL Enforcement

## Changes Made

The application now **strictly enforces PostgreSQL in production** and will **fail fast** if SQLite is detected or if DATABASE_URL is not properly configured.

## What Changed

### 1. Database Configuration (`app/database.py`)

**Before:**
- Application would silently fall back to SQLite if `DATABASE_URL` was not set
- No validation of database type in production

**After:**
- **Production mode requires `DATABASE_URL` to be set**
- **Production mode rejects SQLite URLs** (raises `ValueError`)
- **Production mode requires PostgreSQL URLs** (must start with `postgresql://`)
- Development mode still allows SQLite fallback for local development

### 2. psycopg2 Verification

- Application now verifies `psycopg2-binary` is installed when using PostgreSQL
- **In production, missing psycopg2 will cause immediate failure** with clear error message
- In development, it logs a warning but continues

## Error Messages

If you see these errors in production, here's what they mean:

### Error 1: DATABASE_URL Not Set
```
CRITICAL: DATABASE_URL environment variable is not set in production!
PostgreSQL connection string is required.
Please set DATABASE_URL in Railway service variables.
```

**Solution:** Set `DATABASE_URL` in Railway application service variables to the PostgreSQL connection string.

### Error 2: SQLite Detected in Production
```
CRITICAL: SQLite is not allowed in production!
DATABASE_URL must be a PostgreSQL connection string.
Current value starts with 'sqlite://' which is not allowed in production.
```

**Solution:** Remove any SQLite `DATABASE_URL` from Railway variables. Ensure `DATABASE_URL` points to PostgreSQL.

### Error 3: Invalid Database URL
```
CRITICAL: Invalid database URL in production!
DATABASE_URL must be a PostgreSQL connection string (starting with 'postgresql://').
```

**Solution:** Verify `DATABASE_URL` starts with `postgresql://` (not `postgres://` or anything else).

### Error 4: psycopg2 Not Installed
```
CRITICAL: psycopg2-binary is not installed!
PostgreSQL requires psycopg2-binary package.
Please ensure requirements.txt includes 'psycopg2-binary>=2.9.9' and rebuild the Docker image.
```

**Solution:** 
1. Verify `requirements.txt` includes `psycopg2-binary>=2.9.9`
2. Push changes to trigger Railway rebuild
3. Or manually trigger rebuild in Railway dashboard

## Railway Configuration

### Required Environment Variables

In Railway application service, ensure these are set:

1. **ENVIRONMENT** = `production`
2. **DATABASE_URL** = `postgresql://user:password@host:port/database` (from PostgreSQL service)

### How to Get DATABASE_URL

1. Go to Railway dashboard
2. Select your PostgreSQL service
3. Go to "Variables" tab
4. Copy the `DATABASE_URL` value
5. Paste it into your application service's `DATABASE_URL` variable

**Important:** 
- Do NOT use reference variables like `${{ Postgres.DATABASE_URL }}`
- Paste the full connection string directly
- Ensure it starts with `postgresql://`

## Verification

After deployment, check logs for:

✅ **Success indicators:**
```
Production mode: Using PostgreSQL database (SQLite fallback disabled)
psycopg2 is available (version: X.X.X)
PostgreSQL connection details: host=..., port=..., database=..., user=...
PostgreSQL engine created with performance optimizations
```

❌ **Failure indicators:**
- Any of the CRITICAL errors listed above
- `ModuleNotFoundError: No module named 'psycopg2'`
- `ValueError: CRITICAL: SQLite is not allowed in production!`

## Development vs Production

| Mode | SQLite Allowed | DATABASE_URL Required | psycopg2 Required |
|------|---------------|----------------------|-------------------|
| Development | ✅ Yes (fallback) | ❌ No (uses SQLite) | ❌ No (warning only) |
| Production | ❌ No (fails fast) | ✅ Yes (required) | ✅ Yes (fails fast) |

## Testing Locally

To test production mode locally:

```bash
export ENVIRONMENT=production
export DATABASE_URL=postgresql://user:password@localhost:5432/dbname
python -m app.main
```

The application will fail immediately if:
- `DATABASE_URL` is not set
- `DATABASE_URL` is SQLite
- `psycopg2-binary` is not installed

## Summary

✅ **Production is now PostgreSQL-only**
✅ **SQLite fallback is disabled in production**
✅ **Clear error messages guide you to fix issues**
✅ **Fails fast instead of silently using wrong database**

This ensures your production environment always uses PostgreSQL and prevents accidental SQLite usage.


