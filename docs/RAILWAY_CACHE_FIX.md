# Railway Cache Fix for Static Files

## Problem
Railway was serving cached versions of `favicon.png` and `elior.png` even after files were updated, breaking immersion and showing old assets.

## Solution

### 1. Dockerfile Changes
- Added `BUILD_DATE` and `CACHE_BUST` build arguments to force cache invalidation
- Explicitly copy `elior.png` and `favicon.png` separately to ensure they're always fresh
- These files are copied after the main dist copy to avoid layer caching

### 2. Application Cache Headers
- Reduced cache time for `favicon.png`, `favicon.ico`, and `elior.png` from 1 day to **1 hour**
- Added explicit routes for `/favicon.ico` and `/elior.png` with short cache times
- Updated `OptimizedStaticFiles` to exclude these files from long-term caching

### 3. Forcing Railway to Rebuild Without Cache

If Railway still serves old files after deployment:

#### Option 1: Set Build Arguments (Recommended)
In Railway dashboard, add these environment variables:
```
RAILWAY_BUILD_DATE=$(date +%s)
RAILWAY_CACHE_BUST=$(date +%s)
```

#### Option 2: Manual Cache Clear
1. Go to Railway dashboard
2. Click on your service
3. Go to "Settings" → "Deployments"
4. Click "Redeploy" → "Clear Build Cache"
5. Redeploy

#### Option 3: Force Rebuild via Git
1. Make a small change to any file (e.g., add a comment)
2. Commit and push
3. Railway will rebuild with fresh cache

### 4. Verifying the Fix

After deployment, check:
1. Visit `https://your-domain.railway.app/favicon.ico`
2. Visit `https://your-domain.railway.app/elior.png`
3. Check response headers - should show `Cache-Control: public, max-age=3600` (1 hour)
4. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R) to clear browser cache

### 5. Browser Cache Note

Even with server-side cache fixes, browsers may cache these files. Users may need to:
- Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
- Clear browser cache
- Use incognito/private mode

## Files Changed
- `Dockerfile` - Added cache-busting build args and explicit file copies
- `app/main.py` - Reduced cache times and added explicit routes for favicon and elior.png

## Testing Locally

To test the changes locally:
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up
```

Then check:
- `http://localhost:8000/favicon.ico`
- `http://localhost:8000/elior.png`

Both should have `Cache-Control: public, max-age=3600` in response headers.

