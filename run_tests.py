#!/usr/bin/env python3
"""
Elior Fitness Test Runner
A comprehensive test runner that manages Docker, database resets, and logging.
"""

import os
import sys
import time
import shutil
import subprocess
import argparse
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any
import json

# Configure logging
def setup_logging(debug: bool = False, log_file: str = None) -> logging.Logger:
    """Setup logging configuration"""
    log_level = logging.DEBUG if debug else logging.INFO
    
    # Create logs directory if it doesn't exist
    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)
    
    # Clear logs directory
    for file in logs_dir.glob("*"):
        if file.is_file():
            file.unlink()
    
    # Create log file name
    if log_file is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = logs_dir / f"test_run_{timestamp}.log"
    
    # Configure logging
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    return logging.getLogger(__name__)

class TestRunner:
    """Main test runner class"""
    
    def __init__(self, debug: bool = False):
        self.logger = setup_logging(debug)
        self.project_root = Path.cwd()
        self.logs_dir = self.project_root / "logs"
        self.data_dir = self.project_root / "data"
        self.test_db_path = self.project_root / "test.db"
        self.test_uploads_dir = self.project_root / "test_uploads"
        
        # Test modules available
        self.test_modules = {
            "1": ("minimal", "Minimal Functionality Tests", "tests/test_minimal.py"),
            "2": ("all", "All Tests", "tests/test_minimal.py"),
        }
        
        self.results = {}
    
    def run_command(self, command: List[str], check: bool = True, capture_output: bool = False) -> subprocess.CompletedProcess:
        """Run a shell command with logging"""
        self.logger.info(f"Running command: {' '.join(command)}")
        
        try:
            result = subprocess.run(
                command,
                check=check,
                capture_output=capture_output,
                text=True,
                cwd=self.project_root
            )
            
            if result.stdout:
                self.logger.info(f"Command output: {result.stdout}")
            
            return result
            
        except subprocess.CalledProcessError as e:
            self.logger.error(f"Command failed: {' '.join(command)}")
            self.logger.error(f"Error: {e}")
            if e.stdout:
                self.logger.error(f"stdout: {e.stdout}")
            if e.stderr:
                self.logger.error(f"stderr: {e.stderr}")
            raise
    
    def check_docker_status(self) -> bool:
        """Check if Docker is running"""
        try:
            result = subprocess.run(["docker", "info"], capture_output=True, text=True)
            return result.returncode == 0
        except FileNotFoundError:
            self.logger.error("Docker not found. Please install Docker.")
            return False
    
    def restart_docker(self) -> bool:
        """Restart Docker containers"""
        self.logger.info("Restarting Docker containers...")
        
        try:
            # Stop existing containers
            self.run_command(["docker-compose", "down"], check=False)
            
            # Remove old containers and images
            self.run_command(["docker-compose", "down", "--rmi", "all", "--volumes"], check=False)
            
            # Build and start fresh
            self.run_command(["docker-compose", "build", "--no-cache"])
            self.run_command(["docker-compose", "up", "-d"])
            
            # Wait for service to be ready
            self.logger.info("Waiting for Docker service to be ready...")
            time.sleep(10)
            
            # Check if service is responding
            max_retries = 30
            for i in range(max_retries):
                try:
                    # Try curl first (Unix/Linux/Mac)
                    result = subprocess.run(
                        ["curl", "-f", "http://localhost:8000/health"],
                        capture_output=True,
                        timeout=5
                    )
                    if result.returncode == 0:
                        self.logger.info("Docker service is ready!")
                        return True
                except (subprocess.TimeoutExpired, FileNotFoundError):
                    try:
                        # Try PowerShell Invoke-WebRequest (Windows)
                        result = subprocess.run(
                            ["powershell", "-Command", "Invoke-WebRequest -Uri http://localhost:8000/health -UseBasicParsing"],
                            capture_output=True,
                            timeout=5
                        )
                        if result.returncode == 0:
                            self.logger.info("Docker service is ready!")
                            return True
                    except (subprocess.TimeoutExpired, FileNotFoundError):
                        pass
                
                self.logger.info(f"Waiting for service... ({i+1}/{max_retries})")
                time.sleep(2)
            
            self.logger.error("Docker service failed to start properly")
            return False
            
        except Exception as e:
            self.logger.error(f"Failed to restart Docker: {e}")
            return False
    
    def reset_database(self) -> bool:
        """Reset the test database"""
        self.logger.info("Resetting test database...")
        
        try:
            # Remove test database files
            if self.test_db_path.exists():
                self.test_db_path.unlink()
                self.logger.info("Removed test.db")
            
            # Remove test uploads
            if self.test_uploads_dir.exists():
                shutil.rmtree(self.test_uploads_dir)
                self.logger.info("Removed test_uploads directory")
            
            # Create fresh test uploads directory
            self.test_uploads_dir.mkdir(exist_ok=True)
            
            # Remove any other test-related files
            for pattern in ["test_*.db", "*.db-journal"]:
                for file in self.project_root.glob(pattern):
                    if file.name != "elior_fitness.db":  # Don't remove main db
                        file.unlink()
                        self.logger.info(f"Removed {file}")
            
            self.logger.info("Database reset completed")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to reset database: {e}")
            return False
    
    def run_test_module(self, module_key: str, module_info: tuple) -> Dict[str, Any]:
        """Run a specific test module"""
        module_name, description, test_path = module_info
        
        self.logger.info(f"\n{'='*60}")
        self.logger.info(f"Running {description}")
        self.logger.info(f"{'='*60}")
        
        # Reset database before each test
        if not self.reset_database():
            return {
                "module": module_name,
                "status": "FAILED",
                "error": "Database reset failed",
                "duration": 0
            }
        
        start_time = time.time()
        
        try:
            # Run pytest for the specific module
            if module_key == "8":  # All tests
                cmd = ["python", "-m", "pytest", test_path, "-v", "--tb=short"]
            else:
                cmd = ["python", "-m", "pytest", test_path, "-v", "--tb=short"]
            
            result = self.run_command(cmd, check=False, capture_output=True)
            
            duration = time.time() - start_time
            
            if result.returncode == 0:
                self.logger.info(f"✅ {description} PASSED ({duration:.2f}s)")
                return {
                    "module": module_name,
                    "status": "PASSED",
                    "duration": duration,
                    "output": result.stdout
                }
            else:
                self.logger.error(f"❌ {description} FAILED ({duration:.2f}s)")
                self.logger.error(f"Error output: {result.stderr}")
                return {
                    "module": module_name,
                    "status": "FAILED",
                    "duration": duration,
                    "error": result.stderr,
                    "output": result.stdout
                }
                
        except Exception as e:
            duration = time.time() - start_time
            self.logger.error(f"❌ {description} FAILED with exception ({duration:.2f}s)")
            self.logger.error(f"Exception: {e}")
            return {
                "module": module_name,
                "status": "FAILED",
                "duration": duration,
                "error": str(e)
            }
    
    def display_menu(self) -> str:
        """Display test selection menu"""
        print("\n" + "="*60)
        print("ELIOR FITNESS TEST RUNNER")
        print("="*60)
        print("Select tests to run:")
        print()
        
        for key, (_, description, _) in self.test_modules.items():
            print(f"{key}. {description}")
        
        print("\nOptions:")
        print("q. Quit")
        print("="*60)
        
        while True:
            choice = input("\nEnter your choice (1-8, or 'q' to quit): ").strip()
            if choice == "q":
                return "quit"
            elif choice in self.test_modules:
                return choice
            else:
                print("Invalid choice. Please enter a number between 1-8 or 'q' to quit.")
    
    def run_tests(self, selected_modules: Optional[List[str]] = None) -> bool:
        """Main test running method"""
        self.logger.info("Starting Elior Fitness Test Runner")
        
        # Check Docker status
        if not self.check_docker_status():
            self.logger.error("Docker is not running. Please start Docker and try again.")
            return False
        
        # Restart Docker containers
        if not self.restart_docker():
            self.logger.error("Failed to restart Docker containers")
            return False
        
        # Determine which modules to run
        if selected_modules is None:
            choice = self.display_menu()
            if choice == "quit":
                self.logger.info("Test run cancelled by user")
                return True
            
            selected_modules = [choice]
        
        # Run selected test modules
        all_passed = True
        
        for module_key in selected_modules:
            if module_key not in self.test_modules:
                self.logger.error(f"Unknown test module: {module_key}")
                continue
            
            module_info = self.test_modules[module_key]
            result = self.run_test_module(module_key, module_info)
            self.results[module_key] = result
            
            if result["status"] == "FAILED":
                all_passed = False
        
        # Generate summary report
        self.generate_summary_report()
        
        return all_passed
    
    def generate_summary_report(self):
        """Generate a summary report of test results"""
        self.logger.info("\n" + "="*60)
        self.logger.info("TEST SUMMARY REPORT")
        self.logger.info("="*60)
        
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results.values() if r["status"] == "PASSED")
        failed_tests = total_tests - passed_tests
        total_duration = sum(r.get("duration", 0) for r in self.results.values())
        
        self.logger.info(f"Total test modules: {total_tests}")
        self.logger.info(f"Passed: {passed_tests}")
        self.logger.info(f"Failed: {failed_tests}")
        self.logger.info(f"Total duration: {total_duration:.2f}s")
        
        if failed_tests > 0:
            self.logger.info("\nFailed tests:")
            for module_key, result in self.results.items():
                if result["status"] == "FAILED":
                    module_name = self.test_modules[module_key][1]
                    self.logger.info(f"  - {module_name}: {result.get('error', 'Unknown error')}")
        
        # Save detailed results to JSON
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_file = self.logs_dir / f"test_results_{timestamp}.json"
        
        with open(results_file, 'w') as f:
            json.dump({
                "timestamp": timestamp,
                "summary": {
                    "total": total_tests,
                    "passed": passed_tests,
                    "failed": failed_tests,
                    "duration": total_duration
                },
                "results": self.results
            }, f, indent=2)
        
        self.logger.info(f"\nDetailed results saved to: {results_file}")
        
        all_passed = failed_tests == 0
        if all_passed:
            self.logger.info("\n🎉 ALL TESTS PASSED! 🎉")
        else:
            self.logger.error(f"\n❌ {failed_tests} TEST(S) FAILED ❌")

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Elior Fitness Test Runner")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")
    parser.add_argument("--modules", nargs="+", help="Specific test modules to run (1-8)")
    parser.add_argument("--all", action="store_true", help="Run all tests")
    
    args = parser.parse_args()
    
    runner = TestRunner(debug=args.debug)
    
    try:
        if args.all:
            success = runner.run_tests(["8"])  # Run all tests
        elif args.modules:
            success = runner.run_tests(args.modules)
        else:
            success = runner.run_tests()
        
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        runner.logger.info("\nTest run interrupted by user")
        sys.exit(1)
    except Exception as e:
        runner.logger.error(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 