@echo off
echo ========================================
echo           ELIOR FITNESS COMMIT
echo ========================================
echo.

:: Check if git is available
git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git is not installed or not in PATH
    pause
    exit /b 1
)

:: Check if we're in a git repository
git status >nul 2>&1
if errorlevel 1 (
    echo ERROR: Not in a git repository
    pause
    exit /b 1
)

:: Check for changes
git diff --quiet
if errorlevel 1 (
    echo Changes detected! Committing...
    echo.
    
    :: Add all changes
    echo Adding files...
    git add .
    
    :: Generate commit message with timestamp
    for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
    set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
    set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
    set "datestamp=%YYYY%-%MM%-%DD% %HH%:%Min%:%Sec%"
    
    :: Commit with timestamp
    echo Committing with timestamp: %datestamp%
    git commit -m "Auto-commit: %datestamp% - Elior Fitness updates"
    
    :: Push to remote
    echo.
    echo Pushing to remote repository...
    git push
    
    echo.
    echo ✅ Commit completed successfully!
    echo.
) else (
    echo No changes detected. Nothing to commit.
    echo.
)

echo ========================================
echo           COMMIT COMPLETE
echo ========================================
pause 