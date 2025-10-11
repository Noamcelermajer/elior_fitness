@echo off
echo ================================================
echo Building Elior Fitness Frontend
echo ================================================
echo.

cd Frontend

REM Install dependencies
echo Installing dependencies...
npm install --legacy-peer-deps
echo.

REM Build the frontend
echo Building frontend for production...
npm run build
echo.

REM Copy build to static directory
echo Copying build to backend static directory...
if exist "..\static" rmdir /s /q ..\static
xcopy /E /I /Y dist ..\static

echo.
echo ================================================
echo Frontend build completed!
echo ================================================
echo Build files are in Frontend/dist and copied to static/
echo.
pause



