# Testing Guide for Elior Fitness API

This guide explains how to run tests for different sprints and features of the Elior Fitness API.

## 🚀 Quick Start

### Run Sprint 2 Tests (Current)
```bash
python run_sprint_tests.py sprint2
```

### Run All Tests
```bash
python run_sprint_tests.py all
```

### List Available Tests
```bash
python run_sprint_tests.py --list
```

## 📋 Available Test Modules

### Sprint 1 Tests
- `tests.test_auth` - Authentication and authorization
- `tests.test_users` - User management and profiles
- `tests.test_database` - Database operations and relationships

### Sprint 2 Tests
- `tests.test_exercises` - Exercise bank CRUD and search
- `tests.test_workouts` - Workout plan and session management

## 🎯 Running Specific Tests

### By Sprint
```bash
# Run Sprint 1 tests only
python run_sprint_tests.py sprint1

# Run Sprint 2 tests only  
python run_sprint_tests.py sprint2

# Run all tests
python run_sprint_tests.py all
```

### By Module
```bash
# Run only exercise tests
python run_sprint_tests.py tests.test_exercises

# Run only workout tests
python run_sprint_tests.py tests.test_workouts

# Run only auth tests
python run_sprint_tests.py tests.test_auth
```

### By Test Class (using pytest directly)
```bash
# Run specific test class
docker-compose run --rm api python -m pytest tests.test_exercises::TestExerciseCRUD

# Run specific test method
docker-compose run --rm api python -m pytest tests.test_exercises::TestExerciseCRUD::test_create_exercise_success
```

## 🔧 Test Options

### Verbose Output
```bash
python run_sprint_tests.py sprint2 -v
```

### With Coverage Report
```bash
python run_sprint_tests.py sprint2 --coverage
```

### Combined Options
```bash
python run_sprint_tests.py sprint2 -v --coverage
```

## 📊 Test Structure

### Exercise Tests (`tests.test_exercises`)
- **TestExerciseCRUD** - Create, read, update, delete exercises
- **TestExerciseSearch** - Search and filtering functionality
- **TestExerciseAuthorization** - Role-based access control

### Workout Tests (`tests.test_workouts`)
- **TestWorkoutPlanCRUD** - Workout plan management
- **TestWorkoutSessions** - Session management
- **TestWorkoutExercises** - Exercise ordering and management
- **TestExerciseCompletions** - Completion tracking

## 🧪 Test Data

Tests automatically create:
- Test users (trainers and clients)
- Sample exercises
- Workout plans and sessions
- Exercise completions

All test data is isolated and cleaned up after each test.

## 🔍 Debugging Tests

### Run Single Test with Full Output
```bash
docker-compose run --rm api python -m pytest tests.test_exercises::TestExerciseCRUD::test_create_exercise_success -v -s
```

### Run Tests with Database Logging
```bash
docker-compose run --rm api python -m pytest tests.test_exercises --log-cli-level=DEBUG
```

### Check Test Database
```bash
# Connect to test database
docker-compose exec db psql -U postgres -d elior_test

# List tables
\dt

# Check test data
SELECT * FROM exercises LIMIT 5;
```

## 🚨 Common Issues

### Database Connection Issues
If tests fail with database connection errors:
```bash
# Restart containers
docker-compose down
docker-compose up -d

# Wait for database to be ready
docker-compose logs db
```

### Import Errors
If you get import errors:
```bash
# Rebuild the API container
docker-compose build api
```

### Test Data Conflicts
If tests fail due to existing data:
```bash
# Clean up test database
docker-compose run --rm api python -m pytest --setup-plan
```

## 📈 Adding New Tests

### For New Sprint Features
1. Create new test file: `tests/test_new_feature.py`
2. Add test classes with descriptive names
3. Update `run_sprint_tests.py` with new module
4. Add to appropriate sprint in `SPRINT_TESTS`

### Test Class Template
```python
class TestNewFeature:
    """Test new feature functionality."""
    
    @pytest.fixture
    def setup_data(self, db_session: Session):
        """Setup test data."""
        # Create test data
        pass
    
    def test_feature_functionality(self, setup_data):
        """Test the main functionality."""
        # Test implementation
        pass
```

## 🎯 Best Practices

1. **Isolation** - Each test should be independent
2. **Descriptive Names** - Use clear test and class names
3. **Fixtures** - Reuse setup code with pytest fixtures
4. **Assertions** - Test both success and failure cases
5. **Cleanup** - Tests should clean up after themselves

## 📝 Test Output Examples

### Successful Test Run
```
Running tests: tests.test_exercises tests.test_workouts
Command: docker-compose run --rm api python -m pytest tests.test_exercises tests.test_workouts --tb=short --strict-markers -W ignore::DeprecationWarning
--------------------------------------------------
============================= test session starts ==============================
collecting ... collected 25 items

tests/test_exercises.py::TestExerciseCRUD::test_create_exercise_success PASSED
tests/test_exercises.py::TestExerciseCRUD::test_get_exercise_success PASSED
...

============================== 25 passed in 12.34s ==============================

✅ All tests passed!
```

### Failed Test Run
```
❌ Tests failed with exit code 1
============================== 2 failed, 23 passed in 10.12s ==============================
```

## 🔗 Related Files

- `run_sprint_tests.py` - Main test runner script
- `tests/conftest.py` - Shared test fixtures
- `tests/test_exercises.py` - Exercise-related tests
- `tests/test_workouts.py` - Workout-related tests
- `pytest.ini` - Pytest configuration 