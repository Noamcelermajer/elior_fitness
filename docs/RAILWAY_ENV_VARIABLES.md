# Railway Environment Variables

## Required Variables

Set these in Railway Dashboard → Your Service → Variables:

```bash
ACCESS_TOKEN_EXPIRE_MINUTES="1440"
CORS_ORIGINS="https://ecshape.org,http://ecshape.org,https://www.ecshape.org,http://www.ecshape.org"
DATABASE_URL="postgresql://postgres:SlECPCCUwevaBJPfQwRtLZDateaPuOIB@postgres-mgxw.railway.internal:5432/railway"
DATABASE_PUBLIC_URL="postgresql://postgres:SlECPCCUwevaBJPfQwRtLZDateaPuOIB@crossover.proxy.rlwy.net:43922/railway"
DOMAIN="https://ecshape.org"
ENVIRONMENT="production"
JWT_ALGORITHM="HS256"
JWT_SECRET="xn3h1eoum54i6akddmpnf2cw8zdfgb29"
LOG_LEVEL="INFO"
PERSISTENT_PATH="/app/persistent"
UPLOAD_DIR="/app/persistent/uploads"
LOG_DIR="/app/persistent/logs"
```

## Important Notes

1. **DATABASE_URL**: Use the actual PostgreSQL connection string, NOT the reference variable `${{Postgres-mgXw.DATABASE_URL}}`. Railway reference variables don't work reliably - copy the full connection string from the PostgreSQL service.

2. **DATABASE_PUBLIC_URL**: Optional fallback if internal URL fails. Set this if you have connectivity issues with the internal URL.

3. **CORS_ORIGINS**: Should include all domains that will access the API. Currently empty - needs to be set.

4. **DOMAIN**: Required for proper domain detection and CORS configuration.

## Optional Variables

These have defaults but can be customized:

```bash
ENABLE_DEBUG_LOGGING="false"
DATABASE_PATH="/app/data/elior_fitness.db"
```

## Email Configuration (Optional)

Only needed if email functionality is used:

```bash
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USERNAME="your-email@gmail.com"
EMAIL_PASSWORD="your-app-specific-password"
EMAIL_FROM="your-email@gmail.com"
RESET_TOKEN_SECRET="your-reset-token-secret-key"
```

## Preventing Railway Auto-Detection

Railway may try to auto-detect variables from your codebase. To prevent this:

1. **Explicitly set all variables** in the Railway dashboard
2. **Don't use `.env` files** in your repository (they're gitignored anyway)
3. **Use `railway.json`** only for build/deploy config, NOT environment variables
4. **Set variables in Railway dashboard** - they take precedence over auto-detection

## Verification

After setting variables, check logs to verify:
- `Detected ENVIRONMENT: production`
- `Database URL configured (type: PostgreSQL)`
- `✓ Database connection successful`

