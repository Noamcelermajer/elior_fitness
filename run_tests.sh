#!/bin/bash

# Elior Fitness API Test Runner
# This script provides convenient ways to run the test suite

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Elior Fitness API Test Runner"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  all              Run all tests with coverage"
    echo "  unit             Run unit tests only"
    echo "  integration      Run integration tests only"
    echo "  security         Run security tests only"
    echo "  performance      Run performance tests only"
    echo "  auth             Run authentication tests only"
    echo "  users            Run user management tests only"
    echo "  coverage         Run tests with coverage report"
    echo "  fast             Run tests without slow markers"
    echo "  docker           Run tests in Docker container"
    echo "  help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 all           # Run all tests"
    echo "  $0 unit          # Run unit tests only"
    echo "  $0 docker        # Run tests in Docker"
    echo "  $0 coverage      # Run with coverage report"
}

# Function to run tests in Docker
run_docker_tests() {
    print_status "Running tests in Docker container..."
    
    # Clean up test database first
    print_status "Cleaning up test database..."
    docker-compose exec api python -c "
import psycopg2
try:
    conn = psycopg2.connect('postgresql://postgres:postgres@db:5432/elior_fitness')
    cur = conn.cursor()
    cur.execute('DELETE FROM users WHERE email LIKE \"%test.com\"')
    cur.execute('DELETE FROM nutrition_plans WHERE name LIKE \"%test%\"')
    cur.execute('DELETE FROM recipes WHERE name LIKE \"%test%\"')
    cur.execute('DELETE FROM planned_meals WHERE notes LIKE \"%test%\"')
    cur.execute('DELETE FROM meal_completions WHERE notes LIKE \"%test%\"')
    cur.execute('DELETE FROM weigh_ins WHERE notes LIKE \"%test%\"')
    conn.commit()
    cur.close()
    conn.close()
    print('✅ Test database cleaned up successfully')
except Exception as e:
    print(f'⚠️  Warning: Could not clean up test database: {e}')
"
    
    if [ "$1" = "all" ] || [ -z "$1" ]; then
        docker-compose exec api python -m pytest -v --cov=app --cov-report=term-missing
    elif [ "$1" = "coverage" ]; then
        docker-compose exec api python -m pytest -v --cov=app --cov-report=term-missing --cov-report=html
    elif [ "$1" = "fast" ]; then
        docker-compose exec api python -m pytest -v -m "not slow"
    else
        docker-compose exec api python -m pytest -v tests/test_$1.py
    fi
}

# Function to run tests locally
run_local_tests() {
    print_status "Running tests locally..."
    
    if [ "$1" = "all" ] || [ -z "$1" ]; then
        python -m pytest -v --cov=app --cov-report=term-missing
    elif [ "$1" = "coverage" ]; then
        python -m pytest -v --cov=app --cov-report=term-missing --cov-report=html
    elif [ "$1" = "fast" ]; then
        python -m pytest -v -m "not slow"
    else
        python -m pytest -v tests/test_$1.py
    fi
}

# Main script logic
case "${1:-all}" in
    "all")
        print_status "Running all tests..."
        if command -v docker-compose &> /dev/null && docker-compose ps | grep -q "api"; then
            run_docker_tests "all"
        else
            run_local_tests "all"
        fi
        ;;
    "unit")
        print_status "Running unit tests..."
        if command -v docker-compose &> /dev/null && docker-compose ps | grep -q "api"; then
            run_docker_tests "database"
        else
            run_local_tests "database"
        fi
        ;;
    "integration")
        print_status "Running integration tests..."
        if command -v docker-compose &> /dev/null && docker-compose ps | grep -q "api"; then
            run_docker_tests "integration"
        else
            run_local_tests "integration"
        fi
        ;;
    "security")
        print_status "Running security tests..."
        if command -v docker-compose &> /dev/null && docker-compose ps | grep -q "api"; then
            run_docker_tests "security"
        else
            run_local_tests "security"
        fi
        ;;
    "performance")
        print_status "Running performance tests..."
        if command -v docker-compose &> /dev/null && docker-compose ps | grep -q "api"; then
            run_docker_tests "performance"
        else
            run_local_tests "performance"
        fi
        ;;
    "auth")
        print_status "Running authentication tests..."
        if command -v docker-compose &> /dev/null && docker-compose ps | grep -q "api"; then
            run_docker_tests "auth"
        else
            run_local_tests "auth"
        fi
        ;;
    "users")
        print_status "Running user management tests..."
        if command -v docker-compose &> /dev/null && docker-compose ps | grep -q "api"; then
            run_docker_tests "users"
        else
            run_local_tests "users"
        fi
        ;;
    "coverage")
        print_status "Running tests with coverage report..."
        if command -v docker-compose &> /dev/null && docker-compose ps | grep -q "api"; then
            run_docker_tests "coverage"
        else
            run_local_tests "coverage"
        fi
        ;;
    "fast")
        print_status "Running fast tests (excluding slow tests)..."
        if command -v docker-compose &> /dev/null && docker-compose ps | grep -q "api"; then
            run_docker_tests "fast"
        else
            run_local_tests "fast"
        fi
        ;;
    "docker")
        print_status "Running tests in Docker container..."
        if ! command -v docker-compose &> /dev/null; then
            print_error "docker-compose is not installed or not in PATH"
            exit 1
        fi
        
        if ! docker-compose ps | grep -q "api"; then
            print_warning "Docker containers are not running. Starting them..."
            docker-compose up -d
            sleep 10  # Wait for containers to be ready
        fi
        
        run_docker_tests "${2:-all}"
        ;;
    "help"|"-h"|"--help")
        show_usage
        ;;
    *)
        print_error "Unknown option: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac

print_success "Test execution completed!"

echo "📊 Cleaning up test database..."

# Clean up test data
python -c "
import psycopg2
try:
    conn = psycopg2.connect('postgresql://postgres:postgres@db:5432/elior_fitness')
    cur = conn.cursor()
    cur.execute('DELETE FROM users WHERE email LIKE \"%test.com\"')
    cur.execute('DELETE FROM nutrition_plans WHERE name LIKE \"%test%\"')
    cur.execute('DELETE FROM recipes WHERE name LIKE \"%test%\"')
    cur.execute('DELETE FROM planned_meals WHERE notes LIKE \"%test%\"')
    cur.execute('DELETE FROM meal_completions WHERE notes LIKE \"%test%\"')
    cur.execute('DELETE FROM weigh_ins WHERE notes LIKE \"%test%\"')
    conn.commit()
    cur.close()
    conn.close()
    print('✅ Test database cleaned up successfully')
except Exception as e:
    print(f'⚠️  Warning: Could not clean up test database: {e}')
"

echo "📈 Test execution completed!"
echo "📁 Coverage report available in htmlcov/index.html" 