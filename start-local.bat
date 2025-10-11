@echo off
echo ================================================
echo Starting Elior Fitness (Local Development)
echo ================================================
echo.
echo This will start both backend and frontend servers.
echo.
echo Backend will be available at: http://localhost:8000
echo Frontend will be available at: http://localhost:5173
echo API Docs will be available at: http://localhost:8000/docs
echo.
echo Press Ctrl+C in each window to stop the servers.
echo.
pause

REM Start backend in a new window
echo Starting backend...
start "Elior Backend" cmd /k call start-backend-local.bat

REM Wait a moment for backend to start
timeout /t 5 /nobreak

REM Start frontend in a new window
echo Starting frontend...
start "Elior Frontend" cmd /k call start-frontend.bat

echo.
echo ================================================
echo Both servers are starting in separate windows!
echo ================================================
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo.
pause



