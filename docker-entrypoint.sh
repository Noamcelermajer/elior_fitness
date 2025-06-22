#!/bin/bash
set -e

# Wait for database to be ready
echo "Waiting for database to be ready..."
while ! nc -z db 5432; do
  sleep 0.1
done
echo "Database is ready!"

# Run database migrations
echo "Running database migrations..."
alembic upgrade head

# Run tests if TEST_MODE is enabled
if [ "${TEST_MODE}" = "true" ]; then
    echo "Running tests..."
    pytest tests/ -v --cov=app
    test_exit_code=$?
    
    if [ $test_exit_code -ne 0 ]; then
        echo "Tests failed!"
        exit $test_exit_code
    fi
    echo "Tests completed successfully!"
fi

# Start the application
echo "Starting the application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload 