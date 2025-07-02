#!/usr/bin/env python3
"""
Simple test runner for Elior Fitness API
Optionally rebuilds Docker containers and runs tests locally against the containerized application
"""

import os
import sys
import subprocess
import glob
import time
import logging
from datetime import datetime
from typing import List, Dict

# Create logs directory if it doesn't exist
os.makedirs("logs", exist_ok=True)

# Delete all existing log files before creating new ones
for f in os.listdir("logs"):
    file_path = os.path.join("logs", f)
    if os.path.isfile(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Warning: Could not delete log file {file_path}: {e}")

# Generate timestamp for log files
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
log_filename = f"logs/test_run_{timestamp}.log"
output_filename = f"logs/test_output_{timestamp}.txt"

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_filename),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Create output file handler
output_file = open(output_filename, 'w', encoding='utf-8')

def log_output(message, also_print=True):
    """Log message to both file and optionally print to console."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    output_file.write(f"[{timestamp}] {message}\n")
    output_file.flush()
    if also_print:
        print(message)

def get_test_files() -> Dict[str, str]:
    """Get all test files in the tests directory."""
    test_files = {}
    test_pattern = "tests/test_*.py"
    
    logger.debug(f"Searching for test files with pattern: {test_pattern}")
    log_output(f"Searching for test files with pattern: {test_pattern}")
    
    for test_file in glob.glob(test_pattern):
        # Extract test name from filename (e.g., test_auth.py -> auth)
        test_name = os.path.basename(test_file).replace("test_", "").replace(".py", "")
        test_files[test_name] = test_file
        logger.debug(f"Found test file: {test_name} -> {test_file}")
        log_output(f"Found test file: {test_name} -> {test_file}")
    
    logger.info(f"Found {len(test_files)} test files")
    log_output(f"Found {len(test_files)} test files")
    return test_files

def show_menu(test_files: Dict[str, str]):
    """Display the test selection menu."""
    menu_text = "\n" + "="*50 + "\n"
    menu_text += "🧪 ELIOR FITNESS API TEST RUNNER\n"
    menu_text += "="*50 + "\n"
    menu_text += "\nAvailable test categories:\n"
    
    # Display numbered options
    options = list(test_files.keys())
    for i, test_name in enumerate(options, 1):
        menu_text += f"  {i}. {test_name}\n"
    
    menu_text += f"  {len(options) + 1}. All tests\n"
    menu_text += f"  {len(options) + 2}. All tests with coverage\n"
    menu_text += f"  {len(options) + 3}. Fast tests (exclude slow)\n"
    menu_text += f"  {len(options) + 4}. Rebuild Docker + Run all tests\n"
    menu_text += f"  {len(options) + 5}. Exit\n"
    menu_text += "\n" + "-"*50 + "\n"
    
    print(menu_text)
    log_output(menu_text, also_print=False)

def run_subprocess_safe(cmd, **kwargs):
    """Run subprocess with proper encoding handling for Windows."""
    logger.debug(f"Running command: {' '.join(cmd)}")
    log_output(f"Running command: {' '.join(cmd)}")
    
    # Set encoding to handle Windows Unicode issues
    if sys.platform == "win32":
        kwargs.setdefault('encoding', 'utf-8')
        kwargs.setdefault('errors', 'ignore')
    
    try:
        result = subprocess.run(cmd, **kwargs)
        logger.debug(f"Command completed with return code: {result.returncode}")
        log_output(f"Command completed with return code: {result.returncode}")
        return result
    except Exception as e:
        logger.error(f"Command failed with exception: {e}")
        log_output(f"Command failed with exception: {e}")
        raise

def check_containers_running():
    """Check if API container is running."""
    logger.debug("Checking if containers are running...")
    log_output("Checking if containers are running...")
    try:
        result = run_subprocess_safe(
            ["docker-compose", "ps", "--services", "--filter", "status=running"],
            capture_output=True, text=True, check=True
        )
        is_running = "api" in result.stdout
        logger.debug(f"Container check result: {result.stdout.strip()}")
        log_output(f"Container check result: {result.stdout.strip()}")
        logger.info(f"API container running: {is_running}")
        log_output(f"API container running: {is_running}")
        return is_running
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        logger.error(f"Error checking containers: {e}")
        log_output(f"Error checking containers: {e}")
        return False

def check_api_health():
    """Check if API is responding."""
    logger.debug("Checking API health...")
    log_output("Checking API health...")
    try:
        # Try to import requests, if not available, use basic urllib
        try:
            import requests
            logger.debug("Using requests library for health check")
            log_output("Using requests library for health check")
            response = requests.get("http://localhost:8000/health", timeout=3)
            is_healthy = response.status_code == 200
            logger.debug(f"API health check response: {response.status_code} - {response.text[:100]}")
            log_output(f"API health check response: {response.status_code} - {response.text[:100]}")
            return is_healthy
        except ImportError:
            # Fallback to urllib if requests not available
            logger.debug("Using urllib for health check")
            log_output("Using urllib for health check")
            import urllib.request
            import urllib.error
            try:
                with urllib.request.urlopen("http://localhost:8000/health", timeout=3) as response:
                    is_healthy = response.status == 200
                    logger.debug(f"API health check response: {response.status}")
                    log_output(f"API health check response: {response.status}")
                    return is_healthy
            except (urllib.error.URLError, urllib.error.HTTPError) as e:
                logger.error(f"API health check failed: {e}")
                log_output(f"API health check failed: {e}")
                return False
    except Exception as e:
        logger.error(f"API health check exception: {e}")
        log_output(f"API health check exception: {e}")
        return False

def start_containers():
    """Start existing containers without rebuilding."""
    logger.info("Starting existing containers...")
    log_output("Starting existing containers...")
    
    try:
        result = run_subprocess_safe([
            "docker-compose", "up", "-d"
        ], check=True, capture_output=True, text=True)
        
        logger.info("Containers started successfully!")
        log_output("Containers started successfully!")
        logger.debug(f"Start containers output: {result.stdout}")
        log_output(f"Start containers output: {result.stdout}")
        
        # Wait for the application to be ready
        logger.info("Waiting for application to be ready...")
        log_output("Waiting for application to be ready...")
        for attempt in range(15):
            if check_api_health():
                logger.info("Application is ready!")
                log_output("Application is ready!")
                return True
            
            time.sleep(1)
            logger.debug(f"Waiting... ({attempt + 1}/15)")
            log_output(f"Waiting... ({attempt + 1}/15)")
        
        logger.warning("Application may not be fully ready, continuing anyway...")
        log_output("Application may not be fully ready, continuing anyway...")
        return True
        
    except subprocess.CalledProcessError as e:
        logger.error(f"Error starting containers: {e}")
        log_output(f"Error starting containers: {e}")
        if e.stderr:
            logger.error(f"Error output: {e.stderr}")
            log_output(f"Error output: {e.stderr}")
        return False

def rebuild_docker():
    """Rebuild and start Docker containers."""
    logger.info("Rebuilding Docker containers (this may take a moment)...")
    log_output("Rebuilding Docker containers (this may take a moment)...")
    
    try:
        # Stop existing containers
        logger.debug("Stopping existing containers...")
        log_output("Stopping existing containers...")
        run_subprocess_safe(["docker-compose", "down"], check=False, capture_output=True)
        
        # Build and start new containers
        logger.debug("Building and starting containers...")
        log_output("Building and starting containers...")
        result = run_subprocess_safe([
            "docker-compose", "up", "--build", "-d"
        ], check=True, capture_output=True, text=True)
        
        logger.info("Docker containers rebuilt successfully!")
        log_output("Docker containers rebuilt successfully!")
        logger.debug(f"Rebuild output: {result.stdout}")
        log_output(f"Rebuild output: {result.stdout}")
        
        # Wait for the application to be ready
        logger.info("Waiting for application to be ready...")
        log_output("Waiting for application to be ready...")
        for attempt in range(20):
            if check_api_health():
                logger.info("Application is ready!")
                log_output("Application is ready!")
                return True
            
            time.sleep(1)
            logger.debug(f"Waiting... ({attempt + 1}/20)")
            log_output(f"Waiting... ({attempt + 1}/20)")
        
        logger.warning("Application may not be fully ready, continuing anyway...")
        log_output("Application may not be fully ready, continuing anyway...")
        return True
        
    except subprocess.CalledProcessError as e:
        logger.error(f"Error rebuilding Docker: {e}")
        log_output(f"Error rebuilding Docker: {e}")
        if e.stderr:
            logger.error(f"Error output: {e.stderr}")
            log_output(f"Error output: {e.stderr}")
        return False

def ensure_containers_ready(force_rebuild=False):
    """Ensure containers are running, start or rebuild as needed."""
    logger.info(f"Ensuring containers are ready (force_rebuild={force_rebuild})")
    log_output(f"Ensuring containers are ready (force_rebuild={force_rebuild})")
    
    if force_rebuild:
        logger.info("Force rebuild requested")
        log_output("Force rebuild requested")
        return rebuild_docker()
    
    # Check if containers are running
    if check_containers_running():
        logger.info("Containers are already running...")
        log_output("Containers are already running...")
        
        # Check if API is healthy
        if check_api_health():
            logger.info("API is responding and ready!")
            log_output("API is responding and ready!")
            return True
        else:
            logger.warning("API not responding, restarting containers...")
            log_output("API not responding, restarting containers...")
            return start_containers()
    else:
        logger.info("Containers not running, starting them...")
        log_output("Containers not running, starting them...")
        return start_containers()

def setup_local_environment():
    """Ensure local testing environment is ready."""
    logger.info("Setting up local test environment...")
    log_output("Setting up local test environment...")
    
    # Check if pytest is available
    try:
        result = run_subprocess_safe(["python", "-m", "pytest", "--version"], 
                      check=True, capture_output=True)
        logger.info("pytest is available")
        log_output("pytest is available")
        logger.debug(f"pytest version: {result.stdout.strip()}")
        log_output(f"pytest version: {result.stdout.strip()}")
    except subprocess.CalledProcessError as e:
        logger.error("pytest not found.")
        log_output("pytest not found.")
        logger.error("Install dependencies: pip install -r requirements.txt")
        log_output("Install dependencies: pip install -r requirements.txt")
        return False
    
    # Set test environment variables to point to Docker
    os.environ["DATABASE_URL"] = "sqlite:///./test_elior_fitness.db"
    os.environ["JWT_SECRET"] = "test-secret-key"
    os.environ["API_BASE_URL"] = "http://localhost:8000"
    
    logger.info("Local environment configured")
    log_output("Local environment configured")
    logger.debug(f"DATABASE_URL: {os.environ.get('DATABASE_URL')}")
    log_output(f"DATABASE_URL: {os.environ.get('DATABASE_URL')}")
    logger.debug(f"API_BASE_URL: {os.environ.get('API_BASE_URL')}")
    log_output(f"API_BASE_URL: {os.environ.get('API_BASE_URL')}")
    return True

def run_tests(test_files: Dict[str, str], selection: str):
    """Run the selected tests locally."""
    logger.info(f"Running tests with selection: {selection}")
    log_output(f"Running tests with selection: {selection}")
    
    options = list(test_files.keys())
    force_rebuild = False
    
    if selection == str(len(options) + 1):  # All tests
        logger.info("Running all tests locally...")
        log_output("Running all tests locally...")
        cmd = ["python", "-m", "pytest", "tests/", "-v", "--tb=long"]
        # Only rebuild if containers aren't ready
        force_rebuild = False
    
    elif selection == str(len(options) + 2):  # All tests with coverage
        logger.info("Running all tests with coverage...")
        log_output("Running all tests with coverage...")
        # Check if coverage is available
        try:
            run_subprocess_safe(["python", "-m", "pytest", "--cov", "--help"], 
                          check=True, capture_output=True)
            cmd = ["python", "-m", "pytest", "tests/", "-v", "--cov=app", "--cov-report=term-missing", "--tb=long"]
        except subprocess.CalledProcessError:
            logger.warning("Coverage not available, running without coverage...")
            log_output("Coverage not available, running without coverage...")
            cmd = ["python", "-m", "pytest", "tests/", "-v", "--tb=long"]
        # Only rebuild if containers aren't ready
        force_rebuild = False
    
    elif selection == str(len(options) + 3):  # Fast tests
        logger.info("Running fast tests (excluding slow tests)...")
        log_output("Running fast tests (excluding slow tests)...")
        cmd = ["python", "-m", "pytest", "tests/", "-v", "-m", "not slow", "--tb=long"]
        # Only rebuild if containers aren't ready
        force_rebuild = False
    
    elif selection == str(len(options) + 4):  # Rebuild + All tests
        logger.info("Rebuilding Docker and running all tests...")
        log_output("Rebuilding Docker and running all tests...")
        cmd = ["python", "-m", "pytest", "tests/", "-v", "--tb=long"]
        force_rebuild = True
    
    elif selection == str(len(options) + 5):  # Exit
        logger.info("Exiting...")
        log_output("Exiting...")
        print("👋 Goodbye!")
        output_file.close()
        sys.exit(0)
    
    else:  # Specific test file
        try:
            test_index = int(selection) - 1
            if 0 <= test_index < len(options):
                test_name = options[test_index]
                test_file = test_files[test_name]
                logger.info(f"Running {test_name} tests locally...")
                log_output(f"Running {test_name} tests locally...")
                cmd = ["python", "-m", "pytest", test_file, "-v", "--tb=long"]
                # Only rebuild if containers aren't ready
                force_rebuild = False
            else:
                logger.error("Invalid selection!")
                log_output("Invalid selection!")
                print("❌ Invalid selection!")
                return
        except ValueError:
            logger.error("Invalid selection!")
            log_output("Invalid selection!")
            print("❌ Invalid selection!")
            return
    
    # Ensure containers are ready
    logger.info("Ensuring containers are ready...")
    log_output("Ensuring containers are ready...")
    if not ensure_containers_ready(force_rebuild):
        logger.error("Failed to prepare Docker containers")
        log_output("Failed to prepare Docker containers")
        print("❌ Failed to prepare Docker containers")
        return
    
    # Setup local environment
    logger.info("Setting up local environment...")
    log_output("Setting up local environment...")
    if not setup_local_environment():
        logger.error("Failed to setup local environment")
        log_output("Failed to setup local environment")
        print("❌ Failed to setup local environment")
        return
    
    # Run the tests locally
    logger.info(f"Executing test command: {' '.join(cmd)}")
    log_output(f"Executing test command: {' '.join(cmd)}")
    try:
        print(f"Executing: {' '.join(cmd)}")
        log_output(f"Executing: {' '.join(cmd)}")
        result = run_subprocess_safe(cmd, check=False, capture_output=True, text=True)
        
        logger.info(f"Tests completed with return code: {result.returncode}")
        log_output(f"Tests completed with return code: {result.returncode}")
        
        if result.returncode == 0:
            print("\n✅ Tests completed successfully!")
            log_output("\n✅ Tests completed successfully!")
            if result.stdout:
                print("Test output:")
                log_output("Test output:")
                print(result.stdout)
                log_output(result.stdout)
        else:
            print(f"\n❌ Tests failed with exit code {result.returncode}")
            log_output(f"\n❌ Tests failed with exit code {result.returncode}")
            if result.stdout:
                logger.error(f"Test output: {result.stdout}")
                print("Test output:")
                log_output("Test output:")
                print(result.stdout)
                log_output(result.stdout)
            if result.stderr:
                logger.error(f"Test errors: {result.stderr}")
                print("Test errors:")
                log_output("Test errors:")
                print(result.stderr)
                log_output(result.stderr)
            
    except FileNotFoundError:
        logger.error("Python or pytest not found")
        log_output("Python or pytest not found")
        print("❌ Error: Python or pytest not found.")
        print("💡 Try: pip install -r requirements.txt")
    except Exception as e:
        logger.error(f"Error running tests: {e}")
        log_output(f"Error running tests: {e}")
        print(f"❌ Error running tests: {e}")

def main():
    """Main function."""
    logger.info("Starting Elior Fitness Test Runner")
    log_output("Starting Elior Fitness Test Runner")
    print("🚀 Welcome to the Elior Fitness Test Runner!")
    print("This will ensure Docker containers are running and run tests locally.")
    print("💡 Tip: Use 'Rebuild Docker + Run all tests' if you've made code changes.")
    print("📝 Debug logs will be saved to 'test_runner.log'")
    print(f"📄 Test output will be saved to '{output_filename}'")
    
    log_output("🚀 Welcome to the Elior Fitness Test Runner!")
    log_output("This will ensure Docker containers are running and run tests locally.")
    log_output("💡 Tip: Use 'Rebuild Docker + Run all tests' if you've made code changes.")
    log_output("📝 Debug logs will be saved to 'test_runner.log'")
    log_output(f"📄 Test output will be saved to '{output_filename}'")
    
    # Check prerequisites
    try:
        result = run_subprocess_safe(["docker-compose", "--version"], 
                      check=True, capture_output=True)
        logger.info("Docker Compose is available")
        log_output("Docker Compose is available")
        logger.debug(f"Docker Compose version: {result.stdout.strip()}")
        log_output(f"Docker Compose version: {result.stdout.strip()}")
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        logger.error(f"Docker Compose not found: {e}")
        log_output(f"Docker Compose not found: {e}")
        print("❌ Error: docker-compose not found.")
        print("💡 Make sure Docker and Docker Compose are installed.")
        output_file.close()
        sys.exit(1)
    
    test_files = get_test_files()
    
    while True:
        show_menu(test_files)
        
        try:
            selection = input("\nSelect test category (or 'q' to quit): ").strip()
            log_output(f"User selection: {selection}")
            
            if selection.lower() in ['q', 'quit', 'exit']:
                logger.info("User requested exit")
                log_output("User requested exit")
                print("👋 Goodbye!")
                output_file.close()
                break
            
            run_tests(test_files, selection)
            
            input("\nPress Enter to continue...")
            
        except KeyboardInterrupt:
            logger.info("User interrupted with Ctrl+C")
            log_output("User interrupted with Ctrl+C")
            print("\n\n👋 Goodbye!")
            output_file.close()
            break
        except EOFError:
            logger.info("User interrupted with EOF")
            log_output("User interrupted with EOF")
            print("\n\n👋 Goodbye!")
            output_file.close()
            break

if __name__ == "__main__":
    main() 