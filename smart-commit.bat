@echo off
setlocal enabledelayedexpansion

echo ========================================
echo         ELIOR SMART COMMIT
echo ========================================
echo.

REM Check if Git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git is not installed
    pause
    exit /b 1
)

REM Check if we're in a Git repository
git rev-parse --git-dir >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Not in a Git repository
    pause
    exit /b 1
)

REM Get current branch
for /f "tokens=*" %%i in ('git branch --show-current') do set current_branch=%%i

REM Check if there are any changes
git status --porcelain | findstr . >nul
if %errorlevel% neq 0 (
    echo ℹ️  No changes to commit
    goto :show_status
)

REM Show what files have changed
echo 📊 Changed files:
git status --short
echo.

REM Analyze changes to suggest commit type
set commit_type=feat
git diff --cached --name-only | findstr /i "test" >nul && set commit_type=test
git diff --cached --name-only | findstr /i "fix\|bug\|error" >nul && set commit_type=fix
git diff --cached --name-only | findstr /i "doc\|readme" >nul && set commit_type=docs
git diff --cached --name-only | findstr /i "style\|format" >nul && set commit_type=style
git diff --cached --name-only | findstr /i "refactor" >nul && set commit_type=refactor

REM Show suggested commit type
echo 💡 Suggested commit type: !commit_type!
echo.

REM Ask for commit type
echo Available types:
echo   feat     - New feature
echo   fix      - Bug fix
echo   docs     - Documentation
echo   style    - Formatting
echo   refactor - Code refactoring
echo   test     - Tests
echo   chore    - Maintenance
echo.
set /p user_type="Commit type (or press Enter for !commit_type!): "
if not "!user_type!"=="" set commit_type=!user_type!

REM Ask for commit message
set /p commit_message="Enter commit message: "
if "!commit_message!"=="" (
    echo ❌ Commit message is required
    pause
    exit /b 1
)

REM Create full commit message
set full_message=!commit_type!: !commit_message!

echo.
echo 📝 Full commit message: !full_message!
echo.

REM Add all changes
echo 🔄 Adding changes...
git add .
if %errorlevel% neq 0 (
    echo ❌ Failed to add changes
    pause
    exit /b 1
)

REM Commit changes
echo 💾 Committing...
git commit -m "!full_message!"
if %errorlevel% neq 0 (
    echo ❌ Failed to commit
    pause
    exit /b 1
)

echo ✅ Committed successfully!
echo.

REM Check if we should create a new branch
set /p new_branch="Create new branch for next feature? (y/n): "
if /i "!new_branch!"=="y" (
    set /p branch_name="Enter branch name: "
    if not "!branch_name!"=="" (
        echo 🌿 Creating new branch: !branch_name!
        git checkout -b !branch_name!
        echo ✅ Switched to new branch
    )
)

REM Push changes
set /p push_choice="Push to remote? (y/n): "
if /i "!push_choice!"=="y" (
    echo 🚀 Pushing to remote...
    git push origin HEAD
    if %errorlevel% neq 0 (
        echo ❌ Push failed
        echo Try: git push origin !current_branch!
    ) else (
        echo ✅ Pushed successfully!
    )
)

:show_status
echo.
echo ========================================
echo           CURRENT STATUS
echo ========================================
echo 🌿 Branch: !current_branch!
echo 📅 Last commit: 
git log --oneline -1
echo.
echo 📋 Recent commits:
git log --oneline -3
echo.

echo ✅ Smart commit completed!
pause 