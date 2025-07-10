# System Monitoring Guide

## Overview

The System Management page provides comprehensive monitoring of your Elior Fitness application, including:
- Real-time system resource usage
- Docker container monitoring
- Database statistics
- Application process monitoring
- System logs and health status

## Features

### 1. System Health Overview
- **CPU Usage**: Real-time CPU utilization percentage
- **Memory Usage**: Current memory consumption
- **Disk Usage**: Storage utilization
- **Network I/O**: Data sent/received metrics
- **Uptime**: How long the system has been running

### 2. Docker Container Monitoring

When Docker is available, you'll see:
- Number of running containers vs total
- Docker images and volumes count
- Individual container statistics:
  - CPU usage per container
  - Memory usage and limits
  - Container status

**Note**: If Docker is not installed or running, the system will display helpful instructions and show application process monitoring instead.

### 3. Database Statistics
- Database file size
- Active connections
- Record counts per table
- Last backup timestamp

### 4. Application Process Monitoring

When Docker is not available, the system monitors:
- Python/Uvicorn processes (API server)
- Node.js processes (if frontend dev server is running)
- Process ID, CPU, and memory usage for each

### 5. System Logs
- Real-time application logs
- Log level filtering (info, warning, error)
- Timestamp and source information

### 6. Quick Actions
- **Create Backup**: Instantly backup the database
- **Optimize Database**: Run SQLite VACUUM to optimize storage
- **Restart Services**: Restart application services
- **Toggle Maintenance**: Enable/disable maintenance mode

## Setting Up Docker Monitoring

To enable full Docker container monitoring:

### Windows
1. Install Docker Desktop from https://docker.com
2. Start Docker Desktop
3. Run your application with Docker Compose:
   ```bash
   docker-compose up -d --build
   ```

### Linux/Mac
1. Install Docker and Docker Compose
2. Ensure your user has Docker permissions:
   ```bash
   sudo usermod -aG docker $USER
   ```
3. Start the application:
   ```bash
   docker-compose up -d --build
   ```

## Troubleshooting

### "Docker is not available" Message

This appears when:
1. **Docker not installed**: Install Docker Desktop
2. **Docker not running**: Start Docker Desktop
3. **Permission issues**: Ensure the application has access to Docker socket

### Process Monitoring Alternative

When Docker is unavailable, the system automatically switches to process monitoring mode, showing:
- All Python processes (API server)
- Node.js processes (development servers)
- System resource usage per process

### Database Backup Location

Backups are stored in the `backups/` directory with timestamps:
```
backups/elior_fitness_backup_20250710_171400.db
```

## Performance Tips

1. **Monitor CPU/Memory**: Keep usage below 80% for optimal performance
2. **Regular Backups**: Use the backup feature daily or weekly
3. **Database Optimization**: Run optimization monthly or when performance degrades
4. **Log Rotation**: Application logs are automatically rotated to prevent disk space issues

## Security Notes

- Only admin users can access system monitoring
- Database backups contain sensitive data - store securely
- System logs may contain user information - handle appropriately 