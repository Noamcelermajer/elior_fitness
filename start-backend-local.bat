@echo off
echo ================================================
echo Starting Elior Fitness Backend (Local Python)
echo ================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed!
    echo Please install Python 3.11 or higher and try again.
    pause
    exit /b 1
)

echo Python is installed. Setting up environment...
echo.

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    echo.
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt
echo.

REM Create necessary directories
if not exist "data" mkdir data
if not exist "uploads" mkdir uploads
if not exist "uploads\profile_photos" mkdir uploads\profile_photos
if not exist "uploads\progress_photos" mkdir uploads\progress_photos
if not exist "uploads\meal_photos" mkdir uploads\meal_photos
if not exist "uploads\documents" mkdir uploads\documents
if not exist "uploads\thumbnails" mkdir uploads\thumbnails
if not exist "uploads\temp" mkdir uploads\temp
if not exist "logs" mkdir logs
echo.

REM Initialize test users
echo Initializing test users...
python tests\init_test_users.py
echo.

REM Start the backend
echo Starting FastAPI backend on http://localhost:8000
echo API Documentation: http://localhost:8000/docs
echo.
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

pause



