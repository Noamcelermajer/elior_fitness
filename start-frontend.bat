@echo off
echo ================================================
echo Starting Elior Fitness Frontend
echo ================================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js 18 or higher and try again.
    pause
    exit /b 1
)

echo Node.js is installed. Setting up frontend...
echo.

cd Frontend

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    npm install --legacy-peer-deps
    echo.
)

REM Start the development server
echo Starting frontend development server on http://localhost:5173
echo.
npm run dev

pause



