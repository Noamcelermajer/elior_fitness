# Railway Single Volume Setup

Since Railway allows only **one volume per service**, we need to use a single volume with organized subdirectories.

## Solution: Single Volume with Subdirectories

Mount one volume to `/app/persistent` and organize all persistent data within it:

```
/app/persistent/
├── data/
│   └── elior_fitness.db
├── uploads/
│   ├── profile_photos/
│   ├── progress_photos/
│   ├── meal_photos/
│   ├── documents/
│   └── thumbnails/
└── logs/
    └── elior_api_*.log
```

## Railway Volume Configuration

### Step 1: Create Single Volume

1. Go to Railway Dashboard → Your Service → Settings → Volumes
2. Click **"+ New Volume"**
3. **Mount Path**: `/app/persistent`
4. **Name**: `elior-fitness-storage` (or any name)
5. **Size**: Start with **10GB** (can be increased later)
   - Small deployment: 10GB
   - Medium deployment: 25GB
   - Large deployment: 50GB+

### Step 2: Environment Variables (Already Configured)

The `railway.json` file already includes these environment variables:

```json
{
  "envVars": {
    "PERSISTENT_PATH": "/app/persistent",
    "DATABASE_PATH": "/app/persistent/data/elior_fitness.db",
    "DATABASE_URL": "sqlite:////app/persistent/data/elior_fitness.db",
    "UPLOAD_DIR": "/app/persistent/uploads",
    "LOG_DIR": "/app/persistent/logs"
  }
}
```

**Note**: These are automatically set when you deploy. You don't need to manually configure them unless you want to override them in the Railway dashboard.

### Step 3: Application Code

The application code has been updated to:
- ✅ Automatically use the persistent volume paths
- ✅ Create subdirectories on startup (`data/`, `uploads/`, `logs/`)
- ✅ Handle both local development and Railway production

## Directory Structure

The single volume will contain:

```
/app/persistent/
├── data/              # Database files
│   ├── elior_fitness.db
│   ├── elior_fitness.db-shm
│   └── elior_fitness.db-wal
├── uploads/           # All user uploads
│   ├── profile_photos/
│   ├── progress_photos/
│   ├── meal_photos/
│   ├── documents/
│   ├── thumbnails/
│   └── temp/
└── logs/              # Application logs
    └── elior_api_YYYYMMDD.log
```

## Benefits of Single Volume

✅ **Simpler setup** - Only one volume to manage  
✅ **Easier backups** - Backup entire `/app/persistent` directory  
✅ **Cost effective** - One volume instead of multiple  
✅ **Organized** - Clear subdirectory structure  

## Backup Strategy

Since everything is in one place, backing up is easier:

```bash
# Backup entire persistent directory
tar -czf backup-$(date +%Y%m%d).tar.gz /app/persistent/

# Or backup specific subdirectories
tar -czf db-backup-$(date +%Y%m%d).tar.gz /app/persistent/data/
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz /app/persistent/uploads/
```

## Monitoring

Monitor the single volume usage:
- Railway Dashboard → Service → Metrics → Volume Usage
- Set alerts at 80% capacity
- Clean up old logs and temp files regularly

## Migration from Multiple Volumes

If you previously had multiple volumes:

1. **Export data** from old volumes
2. **Create single volume** at `/app/persistent`
3. **Update environment variables**
4. **Restore data** to new structure:
   ```bash
   # Database
   cp /old/data/elior_fitness.db /app/persistent/data/
   
   # Uploads
   cp -r /old/uploads/* /app/persistent/uploads/
   ```

## Cost Optimization

- **Start small**: Begin with 10GB and increase as needed
- **Clean regularly**: Remove old logs and temp files
- **Compress photos**: Already implemented (70-90% reduction)
- **Archive old data**: Move old data to external storage if needed

## Troubleshooting

### Volume Not Mounting
- Verify mount path is exactly `/app/persistent`
- Check Railway service logs for mount errors

### Permission Issues
- Application creates directories with proper permissions on startup
- If issues persist, check Railway logs

### Out of Space
- Monitor usage in Railway dashboard
- Clean up: `rm -rf /app/persistent/logs/*.log` (old logs)
- Clean temp: `rm -rf /app/persistent/uploads/temp/*`
- Increase volume size if needed

## Summary

✅ **One volume** mounted at `/app/persistent`  
✅ **Three subdirectories**: `data/`, `uploads/`, `logs/`  
✅ **Update environment variables** to point to new paths  
✅ **Application handles directory creation** automatically  

This approach works perfectly with Railway's single volume limitation!

