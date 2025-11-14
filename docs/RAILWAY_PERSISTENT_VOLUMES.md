# Railway Persistent Volumes Configuration

This guide explains what data needs to persist across deployments and how to configure persistent volumes on Railway.

## Data That Must Persist

### 1. **Database** (CRITICAL - Required)
- **Path**: `/app/data/`
- **Files**: 
  - `elior_fitness.db` (SQLite database)
  - `elior_fitness.db-shm` (SQLite shared memory file)
  - `elior_fitness.db-wal` (SQLite write-ahead log)
- **Why**: Contains all application data (users, workouts, meals, progress, chat messages)
- **Size**: Grows with usage (typically 1-100MB depending on data)
- **Backup**: **Highly recommended** - This is your most critical data

### 2. **Uploaded Files** (CRITICAL - Required)
- **Path**: `/app/uploads/`
- **Subdirectories**:
  - `profile_photos/` - User profile pictures
  - `progress_photos/` - Client progress photos (compressed)
  - `meal_photos/` - Meal photos uploaded by clients
  - `documents/` - Any uploaded documents
  - `thumbnails/` - Generated thumbnail images
  - `temp/` - Temporary upload files (can be excluded)
- **Why**: User-uploaded content that cannot be regenerated
- **Size**: Can grow significantly (depends on number of users and photos)
- **Note**: Progress photos are compressed to save space (70-90% reduction)

### 3. **Logs** (OPTIONAL - Recommended for Production)
- **Path**: `/app/logs/`
- **Files**: `elior_api_YYYYMMDD.log` (daily log files)
- **Why**: Useful for debugging and monitoring
- **Size**: Moderate (can be rotated/cleaned periodically)
- **Note**: Can be excluded if you use external logging services

## Railway Volume Configuration

### Step 1: Create Volumes in Railway Dashboard

1. Go to your Railway project
2. Select your service
3. Go to **Settings** → **Volumes**
4. Click **"+ New Volume"**

### Step 2: Add Required Volumes

#### Volume 1: Database
- **Mount Path**: `/app/data`
- **Name**: `elior-fitness-db` (or any name you prefer)
- **Size**: Start with 1GB (can be increased later)

#### Volume 2: Uploads
- **Mount Path**: `/app/uploads`
- **Name**: `elior-fitness-uploads` (or any name you prefer)
- **Size**: Start with 5GB (adjust based on expected usage)

#### Volume 3: Logs (Optional)
- **Mount Path**: `/app/logs`
- **Name**: `elior-fitness-logs` (or any name you prefer)
- **Size**: 500MB (logs can be rotated)

### Step 3: Verify Environment Variables

Ensure these environment variables are set correctly:

```bash
DATABASE_PATH=/app/data/elior_fitness.db
DATABASE_URL=sqlite:////app/data/elior_fitness.db
UPLOAD_DIR=/app/uploads
```

These should already be configured in your `railway.json` or Railway dashboard.

## What Happens Without Persistent Volumes?

⚠️ **WARNING**: Without persistent volumes, all data will be **LOST** on every deployment:

- ❌ All user accounts
- ❌ All workout plans and progress
- ❌ All meal plans and completions
- ❌ All uploaded photos
- ❌ All chat messages
- ❌ All progress entries

**This is why persistent volumes are CRITICAL for production!**

## Volume Size Recommendations

### Small Deployment (< 50 users)
- Database: 1GB
- Uploads: 5GB
- Logs: 500MB
- **Total**: ~6.5GB

### Medium Deployment (50-200 users)
- Database: 5GB
- Uploads: 20GB
- Logs: 2GB
- **Total**: ~27GB

### Large Deployment (200+ users)
- Database: 10GB
- Uploads: 50GB+
- Logs: 5GB
- **Total**: 65GB+

## Backup Strategy

### Database Backup
The database is the most critical data. Consider:

1. **Automated Backups**: Set up a cron job or scheduled task to backup the database
2. **External Storage**: Copy backups to external storage (S3, Google Drive, etc.)
3. **Frequency**: Daily backups recommended for production

### Upload Backup
Uploaded files are also important but can be regenerated (though inconvenient):

1. **Periodic Backups**: Weekly or monthly backups may be sufficient
2. **External Storage**: Consider using external storage (S3) for photos instead of volumes

## Monitoring Volume Usage

Railway provides volume usage metrics in the dashboard:

1. Go to your service → **Metrics**
2. Check **Volume Usage** section
3. Set up alerts if volume usage exceeds 80%

## Cost Considerations

Railway charges for persistent volumes based on size:
- Check Railway's pricing page for current rates
- Volumes are charged even when the service is stopped
- Consider archiving old data to reduce volume size

## Migration from Non-Persistent to Persistent

If you've already deployed without volumes:

1. **Before adding volumes**: Export/backup all data
2. **Add volumes** as described above
3. **Restore data** from backup
4. **Verify** data is accessible

## Troubleshooting

### Volume Not Mounting
- Check volume mount path matches exactly (`/app/data`, `/app/uploads`)
- Verify volumes are created and attached to the service
- Check Railway logs for mount errors

### Permission Issues
- The Dockerfile sets proper permissions (`chmod 755`)
- If issues persist, check Railway service logs

### Out of Space
- Monitor volume usage in Railway dashboard
- Clean up old logs: `rm -rf /app/logs/*.log` (older than X days)
- Archive old photos to external storage
- Increase volume size if needed

## Best Practices

1. ✅ **Always use persistent volumes** for production
2. ✅ **Monitor volume usage** regularly
3. ✅ **Set up automated backups** for database
4. ✅ **Clean up temporary files** periodically
5. ✅ **Archive old data** to reduce volume size
6. ✅ **Test restore procedures** regularly

## Summary

**Required Volumes:**
- ✅ `/app/data` - Database (CRITICAL)
- ✅ `/app/uploads` - User uploads (CRITICAL)
- ⚠️ `/app/logs` - Logs (Optional but recommended)

**Without these volumes, all data will be lost on every deployment!**

