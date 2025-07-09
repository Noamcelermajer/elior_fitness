@echo off
echo === ELIOR DOCKER TROUBLESHOOTING ===
echo This script will help identify common Docker issues
echo.

REM Check Docker installation
echo 1. Checking Docker installation...
docker --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Docker is installed
    docker --version
) else (
    echo ❌ Docker is not installed or not in PATH
    pause
    exit /b 1
)

REM Check Docker Compose
echo.
echo 2. Checking Docker Compose...
docker-compose --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Docker Compose is installed
    docker-compose --version
) else (
    docker compose version >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Docker Compose (v2) is installed
        docker compose version
    ) else (
        echo ❌ Docker Compose is not installed
        pause
        exit /b 1
    )
)

REM Check Docker daemon
echo.
echo 3. Checking Docker daemon...
docker info >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Docker daemon is running
) else (
    echo ❌ Docker daemon is not running
    echo Please start Docker Desktop or Docker daemon
    pause
    exit /b 1
)

REM Check available disk space
echo.
echo 4. Checking disk space...
wmic logicaldisk get size,freespace,caption

REM Check available memory
echo.
echo 5. Checking available memory...
wmic computersystem get TotalPhysicalMemory

REM Check if ports are available
echo.
echo 6. Checking if required ports are available...
netstat -an | findstr :3000 >nul
if %errorlevel% equ 0 (
    echo ⚠️  Port 3000 is already in use
) else (
    echo ✅ Port 3000 is available
)

netstat -an | findstr :8000 >nul
if %errorlevel% equ 0 (
    echo ⚠️  Port 8000 is already in use
) else (
    echo ✅ Port 8000 is available
)

REM Check file permissions
echo.
echo 7. Checking file permissions...
if exist "Dockerfile" (
    echo ✅ Dockerfile exists
) else (
    echo ❌ Dockerfile missing
)

if exist "docker-compose.yml" (
    echo ✅ docker-compose.yml exists
) else (
    echo ❌ docker-compose.yml missing
)

if exist "requirements.txt" (
    echo ✅ requirements.txt exists
) else (
    echo ❌ requirements.txt missing
)

REM Check if Frontend directory exists
echo.
echo 8. Checking Frontend directory...
if exist "Frontend" (
    echo ✅ Frontend directory exists
    if exist "Frontend\package.json" (
        echo ✅ Frontend package.json exists
    ) else (
        echo ❌ Frontend package.json missing
    )
) else (
    echo ❌ Frontend directory missing
)

REM Check if app directory exists
echo.
echo 9. Checking app directory...
if exist "app" (
    echo ✅ app directory exists
    if exist "app\main.py" (
        echo ✅ app/main.py exists
    ) else (
        echo ❌ app/main.py missing
    )
) else (
    echo ❌ app directory missing
)

echo.
echo === TROUBLESHOOTING COMPLETE ===
echo.
echo If all checks passed, try running:
echo   docker-compose down
echo   docker-compose build --no-cache
echo   docker-compose up -d
echo.
echo If you see errors, check the specific failing step above.
pause 