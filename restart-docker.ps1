# PowerShell script to restart Docker with no cache
# Kills processes on port 8000 and restarts Docker containers

Write-Host "=== Elior Fitness Docker Restart Script ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clear browser cache for Chrome and Edge
Write-Host "Step 1: Clearing browser cache for localhost:8000..." -ForegroundColor Yellow
Write-Host "  Closing Chrome and Edge instances..." -ForegroundColor Gray
Get-Process -Name "chrome" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name "msedge" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# Clear Chrome cache
$chromeCache = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache"
if (Test-Path $chromeCache) {
    try {
        Remove-Item -Path "$chromeCache\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  Chrome cache cleared." -ForegroundColor Green
    } catch {
        Write-Host "  Warning: Could not fully clear Chrome cache." -ForegroundColor Yellow
    }
} else {
    Write-Host "  Chrome cache not found." -ForegroundColor Gray
}

# Clear Edge cache
$edgeCache = "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache"
if (Test-Path $edgeCache) {
    try {
        Remove-Item -Path "$edgeCache\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  Edge cache cleared." -ForegroundColor Green
    } catch {
        Write-Host "  Warning: Could not fully clear Edge cache." -ForegroundColor Yellow
    }
} else {
    Write-Host "  Edge cache not found." -ForegroundColor Gray
}

Write-Host ""

# Step 2: Check and kill processes on port 8000
Write-Host "Step 2: Checking for processes on port 8000..." -ForegroundColor Yellow
$port = 8000
$processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($processes) {
    Write-Host "Found processes using port 8000. Killing them..." -ForegroundColor Yellow
    foreach ($pid in $processes) {
        try {
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "  Killing process: $($proc.ProcessName) (PID: $pid)" -ForegroundColor Red
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            }
        } catch {
            Write-Host "  Could not kill process $pid: $_" -ForegroundColor Red
        }
    }
    Start-Sleep -Seconds 2
    Write-Host "Port 8000 cleared." -ForegroundColor Green
} else {
    Write-Host "No processes found on port 8000." -ForegroundColor Green
}

Write-Host ""

# Step 3: Stop Docker containers
Write-Host "Step 3: Stopping Docker containers..." -ForegroundColor Yellow
try {
    docker-compose down
    Write-Host "Docker containers stopped." -ForegroundColor Green
} catch {
    Write-Host "Error stopping Docker containers: $_" -ForegroundColor Red
}

Write-Host ""

# Step 4: Build and start Docker with no cache
Write-Host "Step 4: Building and starting Docker with no cache..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Yellow
Write-Host ""

try {
    docker-compose build --no-cache
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Build successful! Starting containers..." -ForegroundColor Green
        docker-compose up -d
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "=== Docker containers started successfully! ===" -ForegroundColor Green
            Write-Host "Application should be available at: http://localhost:8000" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "To view logs, run: docker-compose logs -f" -ForegroundColor Yellow
        } else {
            Write-Host "Error starting Docker containers." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Error building Docker images." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

