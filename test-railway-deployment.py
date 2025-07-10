#!/usr/bin/env python3
"""
Test script for Railway deployment verification
Run this after deployment to check if everything is working
"""

import requests
import sys
import time
from urllib.parse import urljoin

def test_endpoint(base_url, endpoint, expected_status=200, description=""):
    """Test a single endpoint"""
    url = urljoin(base_url, endpoint)
    try:
        print(f"Testing {description or endpoint}...")
        response = requests.get(url, timeout=10)
        if response.status_code == expected_status:
            print(f"✅ {endpoint}: {response.status_code}")
            return True
        else:
            print(f"❌ {endpoint}: Expected {expected_status}, got {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ {endpoint}: Error - {e}")
        return False

def main():
    # Get base URL from command line or use default
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    else:
        base_url = "https://eliorfitness-production.up.railway.app"
    
    print(f"Testing Railway deployment at: {base_url}")
    print("=" * 50)
    
    # Test endpoints
    tests = [
        ("/test", 200, "Simple health check"),
        ("/health", 200, "Detailed health check"),
        ("/", 200, "Frontend root"),
        ("/api/", 404, "API root (should be 404)"),
        ("/api/auth/", 404, "Auth endpoint (should be 404 without auth)"),
    ]
    
    passed = 0
    total = len(tests)
    
    for endpoint, expected_status, description in tests:
        if test_endpoint(base_url, endpoint, expected_status, description):
            passed += 1
        print()
    
    print("=" * 50)
    print(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Deployment is working correctly.")
        return 0
    else:
        print("⚠️  Some tests failed. Check the deployment logs.")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 