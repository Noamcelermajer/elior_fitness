#!/bin/bash

# Elior Fitness Test Runner - Unix/Linux/Mac Shell Script
# Usage: ./run_tests.sh [options]

echo "Elior Fitness Test Runner"
echo "========================"

# Function to show help
show_help() {
    echo ""
    echo "Usage:"
    echo "  ./run_tests.sh              - Interactive mode"
    echo "  ./run_tests.sh --all        - Run all tests"
    echo "  ./run_tests.sh --debug      - Run with debug logging"
    echo "  ./run_tests.sh --modules 1 3 5 - Run specific test modules"
    echo ""
    echo "Test Modules:"
    echo "  1 - Authentication Tests"
    echo "  2 - User Management Tests"
    echo "  3 - Nutrition Tests"
    echo "  4 - Meal Plan Tests"
    echo "  5 - Workout Tests"
    echo "  6 - Progress Tracking Tests"
    echo "  7 - Integration Tests"
    echo "  8 - All Tests"
    echo ""
    echo "Note: All tests are run using: python run_tests.py"
    echo ""
}

# Check if help is requested
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    show_help
    exit 0
fi

echo "Starting test runner with: python run_tests.py $*"
python run_tests.py "$@"

echo ""
echo "Test run completed." 