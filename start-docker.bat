@echo off
echo ================================================
echo Starting Elior Fitness with Docker
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

echo Docker is running. Starting services...
echo.

REM Build and start with docker-compose
docker-compose up --build

REM Wait for backend to be ready
echo.
echo ================================================
echo Application is running!
echo ================================================
echo Backend: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
echo Frontend is served by the backend at: http://localhost:8000
echo.
echo Press Ctrl+C to stop all services.
echo.

pause



