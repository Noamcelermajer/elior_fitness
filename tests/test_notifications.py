#!/usr/bin/env python3
"""
Test script for the notification system
"""
import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

def log(message):
    """Print timestamped log message"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")

def test_notification_system():
    """Test the notification system"""
    log("=" * 60)
    log("NOTIFICATION SYSTEM TEST")
    log("=" * 60)
    
    try:
        # Test 1: Health check
        log("Testing health endpoint...")
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            log("✅ Health check passed")
        else:
            log(f"❌ Health check failed: {response.status_code}")
            return False
        
        # Test 2: Login as admin
        log("Logging in as admin...")
        login_data = {
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data["access_token"]
            log("✅ Admin login successful")
        else:
            log(f"❌ Admin login failed: {response.status_code}")
            log(f"Response: {response.text}")
            return False
        
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # Test 3: Get notifications
        log("Getting notifications...")
        response = requests.get(f"{BASE_URL}/api/notifications/", headers=headers)
        if response.status_code == 200:
            notifications = response.json()
            log(f"✅ Got {len(notifications)} notifications")
        else:
            log(f"❌ Failed to get notifications: {response.status_code}")
            log(f"Response: {response.text}")
            return False
        
        # Test 4: Create a test notification
        log("Creating test notification...")
        notification_data = {
            "title": "Test Notification",
            "message": "This is a test notification from the test script",
            "type": "info",
            "recipient_id": 1  # Admin user
        }
        response = requests.post(f"{BASE_URL}/api/notifications/", 
                               json=notification_data, headers=headers)
        if response.status_code == 200:
            log("✅ Test notification created")
        else:
            log(f"❌ Failed to create test notification: {response.status_code}")
            log(f"Response: {response.text}")
            return False
        
        # Test 5: Trigger critical error notification
        log("Triggering critical error notification...")
        response = requests.post(f"{BASE_URL}/api/notifications/trigger/critical-error",
                               headers=headers)
        if response.status_code == 200:
            log("✅ Critical error notification triggered")
        else:
            log(f"❌ Failed to trigger critical error notification: {response.status_code}")
            log(f"Response: {response.text}")
            return False
        
        # Test 6: Get notification count
        log("Getting notification count...")
        response = requests.get(f"{BASE_URL}/api/notifications/count", headers=headers)
        if response.status_code == 200:
            count_data = response.json()
            log(f"✅ Notification count: {count_data['unread_count']} unread, {count_data['total_count']} total")
        else:
            log(f"❌ Failed to get notification count: {response.status_code}")
            log(f"Response: {response.text}")
            return False
        
        log("=" * 60)
        log("✅ ALL NOTIFICATION TESTS PASSED")
        log("=" * 60)
        return True
        
    except requests.exceptions.ConnectionError:
        log("❌ Connection error - make sure the API is running on localhost:8000")
        return False
    except Exception as e:
        log(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_notification_system()
    exit(0 if success else 1) 