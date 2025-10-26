#!/usr/bin/env python3
"""
Script to ensure admin user exists at startup
"""
import sys
import time
import requests

API_URL = "http://localhost:8000/api"
ADMIN_USER = {"username": "admin", "email": "admin@elior.com", "password": "admin123", "full_name": "Admin User", "role": "ADMIN"}

def wait_for_api():
    """Wait for API to be available"""
    print("Waiting for API to be available...")
    for i in range(30):
        try:
            r = requests.get(f"{API_URL.replace('/api', '')}/health")
            if r.status_code == 200:
                print("API is up!")
                return True
        except Exception as e:
            pass
        time.sleep(1)
    print("API did not become available in time.")
    return False

def check_admin_exists():
    """Check if admin user already exists"""
    try:
        # Try to login as admin
        r = requests.post(f"{API_URL}/auth/login", 
                         json={"username": ADMIN_USER["username"], "password": ADMIN_USER["password"]})
        if r.status_code == 200:
            print("Admin user already exists.")
            return True
        return False
    except Exception as e:
        print(f"Error checking admin: {e}")
        return False

def create_admin():
    """Create admin user if it doesn't exist"""
    try:
        # Use setup endpoint
        r = requests.post(f"{API_URL}/auth/setup/admin", json=ADMIN_USER)
        if r.status_code in [201, 200]:
            print("Admin user created successfully!")
            return True
        elif "already exists" in r.text:
            print("Admin user already exists.")
            return True
        else:
            print(f"Admin creation failed: {r.text}")
            return False
    except Exception as e:
        print(f"Error creating admin: {e}")
        return False

if __name__ == "__main__":
    print("=== ELIOR FITNESS ADMIN CHECK ===")
    
    if not wait_for_api():
        sys.exit(1)
    
    if check_admin_exists():
        print("Admin user verified.")
        sys.exit(0)
    
    print("Admin user not found. Creating admin...")
    if create_admin():
        print("Admin user created: username=admin, password=admin123")
        sys.exit(0)
    else:
        print("Failed to create admin user.")
        sys.exit(1)

