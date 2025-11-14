# Docker Restart Scripts

Simple scripts to restart Docker containers with no cache, killing any processes on port 8000 first.

## Quick Start

**Recommended: Use the batch file (works on all Windows versions)**
```cmd
restart-docker.bat
```

Or double-click `restart-docker.bat` in Windows Explorer.

## Available Scripts

### 1. `restart-docker.bat` (Recommended)
- Works on all Windows versions
- No execution policy issues
- Simple batch file - just double-click to run

### 2. `restart-docker.ps1` (PowerShell)
- More advanced error handling
- Better output formatting
- Requires PowerShell execution policy to be set

**To run the PowerShell script:**
```powershell
powershell.exe -ExecutionPolicy Bypass -File ".\restart-docker.ps1"
```

Or use the wrapper:
```cmd
run-restart-docker.ps1
```

## What the Scripts Do

1. **Kill processes on port 8000** - Finds and terminates any process using port 8000
2. **Stop Docker containers** - Runs `docker-compose down`
3. **Rebuild with no cache** - Runs `docker-compose build --no-cache`
4. **Start containers** - Runs `docker-compose up -d`

## Troubleshooting

### "Scripts are disabled on this system"
- Use `restart-docker.bat` instead (no execution policy needed)
- Or run: `powershell.exe -ExecutionPolicy Bypass -File ".\restart-docker.ps1"`

### Port 8000 still in use
- The script tries to kill processes, but if it fails:
  - Manually find the process: `netstat -ano | findstr :8000`
  - Kill it: `taskkill /F /PID <process_id>`

### Docker build fails
- Check Docker is running: `docker ps`
- Check disk space
- Try: `docker system prune -a` to clean up

## Manual Commands

If you prefer to run commands manually:

```cmd
REM Kill processes on port 8000
netstat -ano | findstr :8000

REM Stop containers
docker-compose down

REM Rebuild with no cache
docker-compose build --no-cache

REM Start containers
docker-compose up -d
```

