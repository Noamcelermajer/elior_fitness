# RAM Optimization Changes

This document outlines all RAM optimization changes made to reduce memory usage from 76% to a lower baseline.

## Optimizations Applied

### 1. SQLite Database Optimizations ✅
**File**: `app/database.py`

- **Cache Size**: Reduced from 8MB to **2MB** (75% reduction)
  - `PRAGMA cache_size=-2048` (was -8192)
- **Memory Mapping**: Reduced from 32MB to **8MB** (75% reduction)
  - `PRAGMA mmap_size=8388608` (was 33554432)

**Expected Savings**: ~30MB RAM

### 2. PostgreSQL Connection Pool Optimization ✅
**File**: `app/database.py`

- **Pool Size**: Reduced from 20 to **5** (75% reduction)
- **Max Overflow**: Reduced from 30 to **5** (83% reduction)
- **Work Memory**: Reduced from 32MB to **16MB** (50% reduction)
- **Parallel Workers**: Reduced from 4 to **2** (50% reduction)
- **Pool Recycle**: Reduced from 3600s to **1800s** (30 minutes)

**Expected Savings**: ~50-100MB RAM (depending on connection usage)

### 3. PIL Image Processing Optimization ✅
**File**: `app/services/file_service.py`

- **Lazy Loading**: PIL is now imported only when processing images
- **Memory Management**: Images are processed one at a time and immediately freed
- **Quality Reduction**: 
  - Thumbnails: 85 → **75** (12% reduction)
  - Medium: 90 → **75** (17% reduction)
  - Large: 95 → **80** (16% reduction)
- **Explicit Memory Cleanup**: `del img` after each processing step

**Expected Savings**: ~20-50MB RAM during image processing

### 4. Logging Optimization ✅
**File**: `app/main.py`

- **File Logging Level**: Only WARNING and above logged to file (reduces I/O buffer)
- **Immediate File Opening**: `delay=False` to avoid buffering
- **Reduced Log Volume**: INFO logs only go to console, not file

**Expected Savings**: ~5-10MB RAM

### 5. Lazy Loading of Heavy Libraries ✅
**Files**: `app/services/system_service.py`, `app/services/file_service.py`

- **psutil**: Lazy loaded only when system stats are requested
- **docker**: Lazy loaded only when Docker stats are requested
- **PIL/Image**: Lazy loaded only when processing images

**Expected Savings**: ~30-50MB RAM at startup

### 6. System Service Optimization ✅
**File**: `app/services/system_service.py`

- **Process Stats**: Only current process and direct children (not all processes)
- **Reduced Results**: Top 5 processes instead of top 10
- **Lazy Loading**: psutil and docker only loaded when needed

**Expected Savings**: ~10-20MB RAM

### 7. Uvicorn Configuration ✅
**File**: `Dockerfile`

- **Workers**: Already set to 1 (optimal for Railway)
- **Concurrency Limit**: Added `--limit-concurrency 50` to prevent memory spikes
- **Keep-Alive Timeout**: Added `--timeout-keep-alive 30` to reduce connection overhead

**Expected Savings**: ~10-20MB RAM

## Total Expected RAM Reduction

**Conservative Estimate**: 155-280MB reduction
**Optimistic Estimate**: 200-350MB reduction

This should bring RAM usage from **76%** down to approximately **40-50%** at idle.

## Monitoring

After deployment, monitor:
1. Railway Dashboard → Metrics → Memory Usage
2. Check `/api/system/status` endpoint for detailed stats
3. Watch for any performance degradation

## Rollback Plan

If issues occur, revert these commits:
- All changes are in the `optimizing` branch
- Can easily revert specific optimizations if needed

## Additional Recommendations

If RAM is still high after these changes:

1. **Disable system monitoring** if not needed (psutil/docker)
2. **Reduce thumbnail generation** (only generate thumbnails, skip medium/large)
3. **Increase SQLite cache reduction** (from 2MB to 1MB)
4. **Disable file logging** entirely in production
5. **Use external image processing service** (e.g., Cloudinary) instead of PIL

