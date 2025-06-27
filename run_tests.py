#!/usr/bin/env python3
"""
Simple test runner for Elior Fitness API
Allows selecting which tests to run with a menu interface
"""

import os
import sys
import subprocess
import glob
from typing import List, Dict

def get_test_files() -> Dict[str, str]:
    """Get all test files in the tests directory."""
    test_files = {}
    test_pattern = "tests/test_*.py"
    
    for test_file in glob.glob(test_pattern):
        # Extract test name from filename (e.g., test_auth.py -> auth)
        test_name = os.path.basename(test_file).replace("test_", "").replace(".py", "")
        test_files[test_name] = test_file
    
    return test_files

def show_menu(test_files: Dict[str, str]):
    """Display the test selection menu."""
    print("\n" + "="*50)
    print("🧪 ELIOR FITNESS API TEST RUNNER")
    print("="*50)
    print("\nAvailable test categories:")
    
    # Display numbered options
    options = list(test_files.keys())
    for i, test_name in enumerate(options, 1):
        print(f"  {i}. {test_name}")
    
    print(f"  {len(options) + 1}. All tests")
    print(f"  {len(options) + 2}. All tests with coverage")
    print(f"  {len(options) + 3}. Fast tests (exclude slow)")
    print(f"  {len(options) + 4}. Exit")
    print("\n" + "-"*50)

def clean_test_database():
    """Clean up test data from database."""
    print("🧹 Cleaning up test database...")
    
    cleanup_script = """
import psycopg2
try:
    conn = psycopg2.connect('postgresql://postgres:postgres@db:5432/elior_fitness')
    cur = conn.cursor()
    # Delete in correct order to avoid foreign key violations
    cur.execute("DELETE FROM workout_exercises WHERE workout_session_id IN (SELECT id FROM workout_sessions WHERE workout_plan_id IN (SELECT id FROM workout_plans WHERE trainer_id IN (SELECT id FROM users WHERE email LIKE '%test.com')))")
    cur.execute("DELETE FROM workout_sessions WHERE workout_plan_id IN (SELECT id FROM workout_plans WHERE trainer_id IN (SELECT id FROM users WHERE email LIKE '%test.com'))")
    cur.execute("DELETE FROM exercises WHERE created_by IN (SELECT id FROM users WHERE email LIKE '%test.com')")
    cur.execute("DELETE FROM workout_plans WHERE trainer_id IN (SELECT id FROM users WHERE email LIKE '%test.com')")
    cur.execute("DELETE FROM meal_completions WHERE notes LIKE '%test%'")
    cur.execute("DELETE FROM planned_meals WHERE notes LIKE '%test%'")
    cur.execute("DELETE FROM weigh_ins WHERE notes LIKE '%test%'")
    cur.execute("DELETE FROM recipes WHERE name LIKE '%test%'")
    cur.execute("DELETE FROM nutrition_plans WHERE name LIKE '%test%'")
    cur.execute("DELETE FROM users WHERE email LIKE '%test.com'")
    conn.commit()
    cur.close()
    conn.close()
    print('✅ Test database cleaned up successfully')
except Exception as e:
    print(f'⚠️  Warning: Could not clean up test database: {e}')
"""
    
    try:
        subprocess.run([
            "docker", "compose", "exec", "-T", "api", 
            "python", "-c", cleanup_script
        ], check=True)
    except subprocess.CalledProcessError:
        print("⚠️  Could not clean up database (containers might not be running)")

def run_tests(test_files: Dict[str, str], selection: str):
    """Run the selected tests."""
    options = list(test_files.keys())
    
    if selection == str(len(options) + 1):  # All tests
        print("🚀 Running all tests...")
        cmd = ["docker", "compose", "exec", "-T", "api", "python", "-m", "pytest", "tests/", "-v"]
    
    elif selection == str(len(options) + 2):  # All tests with coverage
        print("📊 Running all tests with coverage...")
        cmd = ["docker", "compose", "exec", "-T", "api", "python", "-m", "pytest", "tests/", "-v", "--cov=app", "--cov-report=term-missing"]
    
    elif selection == str(len(options) + 3):  # Fast tests
        print("⚡ Running fast tests (excluding slow tests)...")
        cmd = ["docker", "compose", "exec", "-T", "api", "python", "-m", "pytest", "tests/", "-v", "-m", "not slow"]
    
    elif selection == str(len(options) + 4):  # Exit
        print("👋 Goodbye!")
        sys.exit(0)
    
    else:  # Specific test file
        try:
            test_index = int(selection) - 1
            if 0 <= test_index < len(options):
                test_name = options[test_index]
                test_file = test_files[test_name]
                # Convert Windows path separators to Unix for Docker
                test_file_unix = test_file.replace("\\", "/")
                print(f"🧪 Running {test_name} tests...")
                cmd = ["docker", "compose", "exec", "-T", "api", "python", "-m", "pytest", test_file_unix, "-v"]
            else:
                print("❌ Invalid selection!")
                return
        except ValueError:
            print("❌ Invalid selection!")
            return
    
    # Clean database before running tests
    clean_test_database()
    
    # Run the tests
    try:
        print(f"Executing: {' '.join(cmd)}")
        result = subprocess.run(cmd, check=False)
        
        if result.returncode == 0:
            print("\n✅ Tests completed successfully!")
        else:
            print(f"\n❌ Tests failed with exit code {result.returncode}")
            
    except FileNotFoundError:
        print("❌ Error: docker-compose not found. Make sure Docker is running and containers are up.")
        print("💡 Try running: docker compose up -d")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error running tests: {e}")

def main():
    """Main function."""
    # Check if containers are running
    try:
        result = subprocess.run(["docker", "compose", "ps"], capture_output=True, text=True, check=True)
        if "api" not in result.stdout:
            print("⚠️  Warning: API container doesn't seem to be running.")
            print("💡 Starting containers...")
            subprocess.run(["docker", "compose", "up", "-d"], check=True)
            print("⏳ Waiting for containers to be ready...")
            import time
            time.sleep(5)
    except subprocess.CalledProcessError:
        print("❌ Error: Could not check Docker containers.")
        print("💡 Make sure Docker is running and you're in the project directory.")
        sys.exit(1)
    
    test_files = get_test_files()
    
    while True:
        show_menu(test_files)
        
        try:
            selection = input("\nSelect test category (or 'q' to quit): ").strip()
            
            if selection.lower() in ['q', 'quit', 'exit']:
                print("👋 Goodbye!")
                break
            
            run_tests(test_files, selection)
            
            input("\nPress Enter to continue...")
            
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
        except EOFError:
            print("\n\n👋 Goodbye!")
            break

if __name__ == "__main__":
    main() 