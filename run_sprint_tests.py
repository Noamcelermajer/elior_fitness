#!/usr/bin/env python3
"""
Test runner for Elior Fitness API sprints.
Allows selective running of test modules for different sprints.
"""

import sys
import subprocess
import argparse
from typing import List, Optional

# Test module mapping
SPRINT_TESTS = {
    "sprint1": [
        "tests.test_auth",
        "tests.test_users", 
        "tests.test_database"
    ],
    "sprint2": [
        "tests.test_exercises",
        "tests.test_workouts"
    ],
    "all": [
        "tests.test_auth",
        "tests.test_users",
        "tests.test_database", 
        "tests.test_exercises",
        "tests.test_workouts"
    ]
}

def run_tests(test_modules: List[str], verbose: bool = False, coverage: bool = False) -> int:
    """
    Run specified test modules using pytest.
    
    Args:
        test_modules: List of test module names to run
        verbose: Whether to run in verbose mode
        coverage: Whether to generate coverage report
    
    Returns:
        Exit code from pytest
    """
    cmd = ["docker-compose", "run", "--rm", "api", "python", "-m", "pytest"]
    
    # Add test modules
    cmd.extend(test_modules)
    
    # Add options
    if verbose:
        cmd.append("-v")
    
    if coverage:
        cmd.extend(["--cov=app", "--cov-report=term-missing"])
    
    # Add common pytest options
    cmd.extend([
        "--tb=short",  # Shorter traceback format
        "--strict-markers",  # Strict marker checking
        "-W", "ignore::DeprecationWarning"  # Ignore deprecation warnings
    ])
    
    print(f"Running tests: {' '.join(test_modules)}")
    print(f"Command: {' '.join(cmd)}")
    print("-" * 50)
    
    try:
        result = subprocess.run(cmd, check=False)
        return result.returncode
    except KeyboardInterrupt:
        print("\nTest run interrupted by user.")
        return 1
    except Exception as e:
        print(f"Error running tests: {e}")
        return 1

def list_available_tests():
    """List all available test modules and sprints."""
    print("Available test modules and sprints:")
    print("=" * 40)
    
    for sprint, modules in SPRINT_TESTS.items():
        print(f"\n{sprint.upper()}:")
        for module in modules:
            print(f"  - {module}")
    
    print(f"\nIndividual test classes:")
    print("  - TestExerciseCRUD")
    print("  - TestExerciseSearch") 
    print("  - TestExerciseAuthorization")
    print("  - TestWorkoutPlanCRUD")
    print("  - TestWorkoutSessions")
    print("  - TestWorkoutExercises")
    print("  - TestExerciseCompletions")

def main():
    parser = argparse.ArgumentParser(
        description="Run tests for Elior Fitness API sprints",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_sprint_tests.py sprint1                    # Run Sprint 1 tests
  python run_sprint_tests.py sprint2                    # Run Sprint 2 tests  
  python run_sprint_tests.py all                        # Run all tests
  python run_sprint_tests.py tests.test_exercises       # Run specific module
  python run_sprint_tests.py sprint2 -v                 # Verbose output
  python run_sprint_tests.py sprint2 --coverage         # With coverage report
  python run_sprint_tests.py --list                     # List available tests
        """
    )
    
    parser.add_argument(
        "sprint_or_module",
        nargs="?",
        help="Sprint name (sprint1, sprint2, all) or specific test module"
    )
    
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Run tests in verbose mode"
    )
    
    parser.add_argument(
        "--coverage",
        action="store_true", 
        help="Generate coverage report"
    )
    
    parser.add_argument(
        "--list",
        action="store_true",
        help="List available test modules and sprints"
    )
    
    args = parser.parse_args()
    
    if args.list:
        list_available_tests()
        return 0
    
    if not args.sprint_or_module:
        parser.print_help()
        return 1
    
    # Determine which tests to run
    if args.sprint_or_module in SPRINT_TESTS:
        test_modules = SPRINT_TESTS[args.sprint_or_module]
    elif args.sprint_or_module.startswith("tests."):
        test_modules = [args.sprint_or_module]
    else:
        print(f"Error: Unknown sprint or module '{args.sprint_or_module}'")
        print("Use --list to see available options")
        return 1
    
    # Run the tests
    exit_code = run_tests(test_modules, args.verbose, args.coverage)
    
    if exit_code == 0:
        print("\n✅ All tests passed!")
    else:
        print(f"\n❌ Tests failed with exit code {exit_code}")
    
    return exit_code

if __name__ == "__main__":
    sys.exit(main()) 