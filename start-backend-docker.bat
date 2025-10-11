@echo off
echo ================================================
echo Starting Elior Fitness Backend with Docker
echo ================================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo Docker is running. Building and starting backend...
echo.

REM Build and start with docker-compose
docker-compose up --build

pause



