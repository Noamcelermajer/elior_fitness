@echo off
setlocal enabledelayedexpansion

echo ========================================
echo           ELIOR AUTO-COMMIT
echo ========================================
echo.

REM Check if Git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git is not installed or not in PATH
    echo Please install Git from https://git-scm.com/
    pause
    exit /b 1
)

REM Check if we're in a Git repository
git rev-parse --git-dir >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Not in a Git repository
    echo Please navigate to the project directory
    pause
    exit /b 1
)

REM Check if there are any changes to commit
git status --porcelain | findstr . >nul
if %errorlevel% neq 0 (
    echo ℹ️  No changes to commit
    echo Working directory is clean
    goto :check_remote
)

REM Show current status
echo 📊 Current Git Status:
echo.
git status --short
echo.

REM Ask for commit message
set /p commit_message="Enter commit message (or press Enter for auto-message): "

REM Generate auto-message if none provided
if "!commit_message!"=="" (
    set timestamp=%date:~-4,4%-%date:~3,2%-%date:~0,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%
    set timestamp=!timestamp: =0!
    set commit_message=Auto-commit: !timestamp!
)

echo.
echo 📝 Commit message: !commit_message!
echo.

REM Add all changes
echo 🔄 Adding all changes...
git add .
if %errorlevel% neq 0 (
    echo ❌ Failed to add changes
    pause
    exit /b 1
)

REM Commit changes
echo 💾 Committing changes...
git commit -m "!commit_message!"
if %errorlevel% neq 0 (
    echo ❌ Failed to commit changes
    pause
    exit /b 1
)

echo ✅ Changes committed successfully!
echo.

:check_remote
REM Check if remote repository is configured
git remote -v | findstr origin >nul
if %errorlevel% neq 0 (
    echo ⚠️  No remote repository configured
    echo Please add a remote repository first:
    echo   git remote add origin YOUR_REPOSITORY_URL
    pause
    exit /b 1
)

REM Get current branch
for /f "tokens=*" %%i in ('git branch --show-current') do set current_branch=%%i

echo 🌿 Current branch: !current_branch!

REM Automatically push to remote repository
echo 🚀 Pushing to remote repository...
git push origin !current_branch!
if %errorlevel% neq 0 (
    echo ❌ Failed to push changes
    echo This might be due to:
    echo   - Network issues
    echo   - Authentication problems
    echo   - Remote repository not accessible
    echo.
    echo Try pushing manually: git push origin !current_branch!
    pause
    exit /b 1
)
echo ✅ Changes pushed successfully!

echo.
echo ========================================
echo           SUMMARY
echo ========================================
echo 📅 Timestamp: %date% %time%
echo 🌿 Branch: !current_branch!
echo 📝 Last commit: !commit_message!
echo 🚀 Status: Pushed to remote
echo.

REM Show recent commits
echo 📋 Recent commits:
git log --oneline -5

echo.
echo ✅ Auto-commit completed successfully!
pause 