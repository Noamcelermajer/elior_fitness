@echo off
REM Elior Fitness Test Runner - Windows Batch File
REM Usage: run_tests.bat [options]

echo Elior Fitness Test Runner
echo ========================

if "%1"=="--help" (
    echo.
    echo Usage:
    echo   run_tests.bat              - Interactive mode
    echo   run_tests.bat --all        - Run all tests
    echo   run_tests.bat --debug      - Run with debug logging
    echo   run_tests.bat --modules 1 3 5 - Run specific test modules
    echo.
    echo Test Modules:
    echo   1 - Authentication Tests
    echo   2 - User Management Tests
    echo   3 - Nutrition Tests
    echo   4 - Meal Plan Tests
    echo   5 - Workout Tests
    echo   6 - Progress Tracking Tests
    echo   7 - Integration Tests
    echo   8 - All Tests
    echo.
    echo Note: All tests are run using: python run_tests.py
    echo.
    pause
    exit /b 0
)

echo Starting test runner with: python run_tests.py %*
python run_tests.py %*

echo.
echo Test run completed.
pause 