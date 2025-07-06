# Elior Fitness Test Runner

A comprehensive test runner for the Elior Fitness platform that manages Docker containers, database resets, and provides detailed logging.

## Features

- **Interactive Menu**: Choose which tests to run
- **Docker Management**: Automatically restarts Docker containers
- **Database Reset**: Cleans test data between test runs
- **Comprehensive Logging**: Detailed logs with debug options
- **Cross-Platform**: Works on Windows, Linux, and Mac
- **Multiple Run Modes**: Interactive, command-line, or batch execution

## Quick Start

### Interactive Mode (Recommended)
```bash
python run_tests.py
```

### Run All Tests
```bash
python run_tests.py --all
```

### Run Specific Test Modules
```bash
python run_tests.py --modules 1 3 5
```

### Run with Debug Logging
```bash
python run_tests.py --debug
```

## Test Modules

1. **Authentication Tests** (`tests/test_auth.py`)
   - Login/logout functionality
   - JWT token validation
   - Role-based access control

2. **User Management Tests** (`tests/test_users.py`)
   - User CRUD operations
   - Profile management
   - Role assignments

3. **Nutrition Tests** (`tests/test_nutrition.py`)
   - Nutrition tracking
   - Food database operations
   - Calorie calculations

4. **Meal Plan Tests** (`tests/test_meal_plans.py`)
   - Meal plan creation and management
   - Meal entries and components
   - Photo uploads and approvals

5. **Workout Tests** (`tests/test_workouts.py`)
   - Exercise bank management
   - Workout plans and sessions
   - Exercise completion tracking

6. **Progress Tracking Tests** (`tests/test_progress.py`)
   - Progress analytics
   - Goal tracking
   - Performance metrics

7. **Integration Tests** (`tests/test_integration.py`)
   - End-to-end workflows
   - Cross-system interactions
   - Real-world scenarios

8. **All Tests** (`tests/`)
   - Runs all test modules

## Command Line Options

```bash
python run_tests.py [OPTIONS]

Options:
  --debug           Enable debug logging
  --modules 1 3 5   Run specific test modules
  --all             Run all tests
  --help            Show help message
```

## What the Test Runner Does

1. **Environment Setup**
   - Checks if Docker is running
   - Clears the logs directory
   - Sets up logging with timestamp

2. **Docker Management**
   - Stops existing containers
   - Removes old images and volumes
   - Builds fresh containers
   - Waits for service to be ready

3. **Database Reset**
   - Removes test database files
   - Cleans test upload directories
   - Removes journal files
   - Creates fresh test environment

4. **Test Execution**
   - Runs selected test modules
   - Captures output and errors
   - Tracks execution time
   - Resets database between modules

5. **Reporting**
   - Generates summary report
   - Saves detailed results to JSON
   - Logs all output to timestamped files

## Log Files

The test runner creates several log files in the `logs/` directory:

- `test_run_YYYYMMDD_HHMMSS.log` - Main test execution log
- `test_results_YYYYMMDD_HHMMSS.json` - Detailed test results in JSON format

## Prerequisites

- Python 3.7+
- Docker and Docker Compose
- Required Python packages (see `requirements.txt`)

## Troubleshooting

### Docker Issues
- Ensure Docker Desktop is running
- Check if port 8000 is available
- Verify Docker Compose is installed

### Database Issues
- The test runner automatically resets the database
- Check file permissions for database files
- Ensure no other processes are using the database

### Test Failures
- Check the detailed logs in `logs/` directory
- Run with `--debug` flag for more information
- Verify all dependencies are installed

## Examples

### Run Authentication Tests Only
```bash
python run_tests.py --modules 1
```

### Run Nutrition and Workout Tests with Debug
```bash
python run_tests.py --modules 3 5 --debug
```

### Run All Tests and Save Results
```bash
python run_tests.py --all
```

## Integration with CI/CD

The test runner can be easily integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Run Tests
  run: |
    python run_tests.py --all
    # Check exit code for pass/fail
```

## Notes

- The test runner automatically manages Docker containers
- Database is reset between each test module
- All logs are timestamped and organized
- Failed tests are clearly reported with details
- The runner supports both interactive and automated modes 