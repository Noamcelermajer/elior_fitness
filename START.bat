@echo off
echo ================================================
echo    ELIOR FITNESS - Docker Start
echo ================================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo.
    echo ❌ ERROR: Docker Desktop is not running!
    echo.
    echo Please start Docker Desktop and wait for it to fully start.
    echo Then run this script again.
    echo.
    pause
    exit /b 1
)

echo ✓ Docker is running
echo.
echo Starting Elior Fitness with Docker...
echo This will take a few minutes on first run.
echo.
echo Once started, access at: http://localhost:8000
echo API Documentation at: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the application
echo.

docker-compose up --build

pause

