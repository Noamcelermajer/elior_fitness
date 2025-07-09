# Elior Fitness - Docker Setup Guide

## Quick Start

1. **Run the troubleshooting script first:**
   - **Windows:** Double-click `docker-troubleshoot.bat`
   - **Linux/Mac:** Run `./docker-troubleshoot.sh`

2. **If all checks pass, run:**
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - API: http://localhost:8000

## Common Issues & Solutions

### 1. "ModuleNotFoundError: No module named 'click'"
**Cause:** Dependencies not installed properly
**Solution:** The Dockerfile has been fixed to install all dependencies correctly

### 2. "Build failed" during frontend compilation
**Causes:**
- Node.js version mismatch
- Missing dependencies
- Platform-specific issues

**Solutions:**
- Clear Docker cache: `docker system prune -a`
- Rebuild with no cache: `docker-compose build --no-cache`
- Check Node.js version in Dockerfile (currently 18-slim)

### 3. "Port already in use"
**Solution:** 
- Stop other services using ports 3000/8000
- Or change ports in `docker-compose.yml`

### 4. "Permission denied" errors
**Solution:**
- On Linux/Mac: `chmod +x docker-troubleshoot.sh`
- On Windows: Run as Administrator

### 5. "Docker daemon not running"
**Solutions:**
- Start Docker Desktop
- On Linux: `sudo systemctl start docker`

## System Requirements

- **Docker:** Version 20.10 or higher
- **Docker Compose:** Version 2.0 or higher
- **RAM:** Minimum 4GB (8GB recommended)
- **Disk Space:** At least 2GB free
- **OS:** Windows 10+, macOS 10.15+, or Linux

## Platform-Specific Notes

### Windows
- Install Docker Desktop
- Enable WSL2 for better performance
- Run PowerShell as Administrator if needed

### macOS
- Install Docker Desktop
- Ensure sufficient disk space
- May need to increase Docker memory limit

### Linux
- Install Docker Engine and Docker Compose
- Add user to docker group: `sudo usermod -aG docker $USER`
- Restart system after adding user to docker group

## Troubleshooting Steps

1. **Run the troubleshooting script** (see Quick Start)
2. **Check Docker logs:**
   ```bash
   docker-compose logs api
   ```
3. **Check container status:**
   ```bash
   docker-compose ps
   ```
4. **Rebuild from scratch:**
   ```bash
   docker-compose down
   docker system prune -a
   docker-compose build --no-cache
   docker-compose up -d
   ```

## File Structure Requirements

Ensure these files exist:
```
Elior/
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── app/
│   └── main.py
└── Frontend/
    ├── package.json
    └── src/
```

## Environment Variables

The application uses these environment variables (set in docker-compose.yml):
- `ENVIRONMENT=production`
- `DATABASE_URL=sqlite:///./data/elior_fitness.db`
- `JWT_SECRET=dev-secret-key-for-testing-only`
- `CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`

## Performance Optimization

The Docker setup is optimized for minimal resource usage:
- Memory limit: 512MB
- CPU limit: 1 core
- Reduced logging
- Minimal dependencies

## Getting Help

If you're still having issues:

1. Run the troubleshooting script and share the output
2. Check the Docker logs: `docker-compose logs api`
3. Ensure all required files are present
4. Try rebuilding with `--no-cache` flag
5. Check if your system meets the requirements above

## Alternative: Local Development

If Docker continues to cause issues, you can run the application locally:

**Backend:**
```bash
cd app
pip install -r ../requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd Frontend
npm install
npm run dev
``` 