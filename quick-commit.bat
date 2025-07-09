@echo off
setlocal enabledelayedexpansion

echo 🔄 Quick Auto-Commit...
echo.

REM Check if Git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git not found
    exit /b 1
)

REM Check if we're in a Git repository
git rev-parse --git-dir >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Not a Git repository
    exit /b 1
)

REM Check if there are changes
git status --porcelain | findstr . >nul
if %errorlevel% neq 0 (
    echo ℹ️  No changes to commit
    exit /b 0
)

REM Generate timestamp
set timestamp=%date:~-4,4%-%date:~3,2%-%date:~0,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%
set timestamp=!timestamp: =0!

REM Add and commit
git add .
git commit -m "Quick commit: !timestamp!"

REM Push if successful
if %errorlevel% equ 0 (
    git push origin HEAD
    echo ✅ Quick commit and push completed!
) else (
    echo ❌ Commit failed
    exit /b 1
) 