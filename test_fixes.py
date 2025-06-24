#!/usr/bin/env python3
"""
Quick test script to verify fixes are working.
"""

import requests
import json

# Test the basic endpoints
def test_basic_endpoints():
    base_url = "http://localhost:8000"
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/health")
        print(f"Health check: {response.status_code}")
    except Exception as e:
        print(f"Health check failed: {e}")
        return
    
    # Test registration
    try:
        user_data = {
            "email": "test_user@example.com",
            "password": "securepassword123",
            "full_name": "Test User",
            "role": "client"
        }
        response = requests.post(f"{base_url}/api/auth/register", json=user_data)
        print(f"Registration: {response.status_code}")
        if response.status_code == 201:
            print("Registration successful")
        else:
            print(f"Registration failed: {response.json()}")
    except Exception as e:
        print(f"Registration test failed: {e}")
    
    # Test login
    try:
        login_data = {
            "email": "test_user@example.com",
            "password": "securepassword123"
        }
        response = requests.post(f"{base_url}/api/auth/login", json=login_data)
        print(f"Login: {response.status_code}")
        if response.status_code == 200:
            token = response.json()["access_token"]
            print("Login successful")
            
            # Test protected endpoint
            headers = {"Authorization": f"Bearer {token}"}
            response = requests.get(f"{base_url}/api/auth/me", headers=headers)
            print(f"Protected endpoint: {response.status_code}")
        else:
            print(f"Login failed: {response.json()}")
    except Exception as e:
        print(f"Login test failed: {e}")

if __name__ == "__main__":
    test_basic_endpoints() 