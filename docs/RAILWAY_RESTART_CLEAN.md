# Railway Service Restart & Clean Cache Guide

## Problem: Railway Serving Old Files

If Railway is serving old `favicon.png` or `elior.png` files even after deployment, follow these steps to force a clean rebuild.

## Solution 1: Clear Build Cache & Redeploy (Recommended)

### In Railway Dashboard:

1. **Go to your Railway project**
   - Open https://railway.app
   - Select your project

2. **Go to Deployments tab**
   - Click on "Deployments" in the left sidebar
   - Find the latest deployment

3. **Redeploy with Cache Clear**
   - Click the **three dots (⋯)** next to the deployment
   - Select **"Redeploy"**
   - **IMPORTANT**: Check the box **"Clear Build Cache"** or **"Rebuild from scratch"**
   - Click **"Redeploy"**

4. **Wait for build to complete**
   - Monitor the build logs
   - Verify files are being copied correctly

## Solution 2: Force Rebuild via Git

1. **Make a small change to trigger rebuild**
   ```bash
   # Add a comment to Dockerfile or any file
   echo "# Force rebuild $(date)" >> Dockerfile
   git add Dockerfile
   git commit -m "Force Railway rebuild"
   git push
   ```

2. **Railway will automatically rebuild**
   - Railway detects the push
   - Starts a new deployment
   - This forces a fresh build

## Solution 3: Delete and Recreate Service

**⚠️ WARNING: This will delete your service and you'll need to reconfigure it**

1. **Backup your environment variables**
   - Go to Settings → Variables
   - Copy all environment variables

2. **Delete the service**
   - Go to Settings
   - Scroll to bottom
   - Click "Delete Service"
   - Confirm deletion

3. **Create new service**
   - Create new service from GitHub repo
   - Re-add all environment variables
   - Configure volumes if needed

## Solution 4: Use Railway CLI

If you have Railway CLI installed:

```bash
# Login to Railway
railway login

# Link to your project
railway link

# Force rebuild without cache
railway up --detach
```

## Solution 5: Add Build Cache Bust Variable

Add this environment variable in Railway:

1. Go to **Settings** → **Variables**
2. Add new variable:
   - **Name**: `RAILWAY_BUILD_DATE`
   - **Value**: `$(date +%s)` (or current timestamp)
3. **Save** and **Redeploy**

This forces Docker to rebuild layers that use this variable.

## Verification Steps

After redeploying, verify the files are updated:

1. **Check build logs**
   - Look for file copy operations
   - Verify `elior.png` and `favicon.png` are being copied
   - Check for MD5 hashes in logs

2. **Check runtime logs**
   - Go to "Logs" tab
   - Look for startup messages showing file verification
   - Should see file sizes and hashes

3. **Test the files directly**
   - Visit: `https://your-domain.railway.app/elior.png`
   - Visit: `https://your-domain.railway.app/favicon.ico`
   - Check response headers (should show 1 hour cache)
   - **Hard refresh** browser (Ctrl+Shift+R)

4. **Check file hashes**
   ```bash
   # Compare local file hash with Railway file
   md5sum Frontend/public/elior.png
   # Then check Railway logs for the hash
   ```

## Why This Happens

Railway caches Docker build layers for performance. If files haven't changed according to Docker's layer cache, it reuses old layers. The solutions above force Railway to rebuild from scratch.

## Prevention

1. **Always commit file changes before deploying**
   ```bash
   git add Frontend/public/elior.png Frontend/public/favicon.png
   git commit -m "Update favicon and elior.png"
   git push
   ```

2. **Use version numbers or timestamps in filenames** (if needed)
   - `elior-v2.png`, `favicon-2025.png`
   - Forces Docker to see them as new files

3. **Check build logs after every deployment**
   - Verify files are being copied
   - Look for any errors

## Quick Checklist

- [ ] Cleared build cache in Railway dashboard
- [ ] Redeployed service
- [ ] Checked build logs for file copy operations
- [ ] Verified files in runtime logs
- [ ] Tested files directly via URL
- [ ] Hard refreshed browser
- [ ] Files are now updated

## Still Not Working?

If files are still old after all steps:

1. **Check if files are actually in git**
   ```bash
   git ls-files Frontend/public/elior.png
   git ls-files Frontend/public/favicon.png
   ```

2. **Verify files are in the repository**
   - Check GitHub web interface
   - Ensure files are committed and pushed

3. **Check Railway build logs**
   - Look for errors during file copy
   - Verify Dockerfile COPY commands are executing

4. **Contact Railway support**
   - Railway Discord: https://discord.gg/railway
   - Include build logs and deployment ID


