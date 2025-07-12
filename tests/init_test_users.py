#!/usr/bin/env python3
"""
Script to initialize the database with test users for frontend testing using API endpoints.
"""
import time
import requests

API_URL = "http://localhost:8000/api"
ADMIN = {"username": "admin", "email": "admin@test.com", "password": "admin123", "full_name": "Test Admin", "role": "admin"}
TRAINER = {"username": "trainer", "email": "trainer@test.com", "password": "trainer123", "full_name": "Test Trainer", "role": "trainer"}
CLIENT = {"username": "client", "email": "client@test.com", "password": "client123", "full_name": "Test Client", "role": "client"}


def wait_for_api():
    print("Waiting for API to be available...")
    for _ in range(30):
        try:
            r = requests.get(f"{API_URL}/health")
            if r.status_code == 200:
                print("API is up!")
                return True
        except Exception:
            pass
        time.sleep(2)
    print("API did not become available in time.")
    return False

def register_admin():
    # Try setup endpoint first
    r = requests.post(f"{API_URL}/auth/setup/admin", json=ADMIN)
    if r.status_code == 201:
        print("Admin user created via setup endpoint.")
        return True
    # If already exists, try login
    if r.status_code == 400 and "already exists" in r.text:
        print("Admin user already exists.")
        return True
    print(f"Admin setup failed: {r.text}")
    return False

def login(username, password):
    r = requests.post(f"{API_URL}/auth/login", json={"username": username, "password": password})
    if r.status_code == 200:
        token = r.json()["access_token"]
        print(f"Logged in as {username}")
        return token
    print(f"Login failed for {username}: {r.text}")
    return None

def register_trainer(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    r = requests.post(f"{API_URL}/auth/register/trainer", json=TRAINER, headers=headers)
    if r.status_code == 201:
        print("Trainer user created.")
        return True
    if r.status_code == 400 and "already registered" in r.text:
        print("Trainer user already exists.")
        return True
    print(f"Trainer registration failed: {r.text}")
    return False

def register_client(trainer_token):
    headers = {"Authorization": f"Bearer {trainer_token}"}
    r = requests.post(f"{API_URL}/auth/register/client", json=CLIENT, headers=headers)
    if r.status_code == 201:
        print("Client user created.")
        return r.json()["id"]
    if r.status_code == 400 and "already registered" in r.text:
        print("Client user already exists.")
        # Try to fetch client id
        users = requests.get(f"{API_URL}/users/clients", headers=headers)
        for u in users.json():
            if u["username"] == CLIENT["username"]:
                return u["id"]
        return None
    print(f"Client registration failed: {r.text}")
    return None

def assign_client_to_trainer(trainer_token, client_id):
    headers = {"Authorization": f"Bearer {trainer_token}"}
    r = requests.post(f"{API_URL}/users/clients/{client_id}/assign", headers=headers)
    if r.status_code == 200:
        print("Client assigned to trainer.")
        return True
    if r.status_code == 400 and "already assigned" in r.text:
        print("Client already assigned to trainer.")
        return True
    print(f"Client assignment failed: {r.text}")
    return False

if __name__ == "__main__":
    print("Initializing test users via API...")
    if not wait_for_api():
        exit(1)
    if not register_admin():
        exit(1)
    admin_token = login(ADMIN["username"], ADMIN["password"])
    if not admin_token:
        exit(1)
    if not register_trainer(admin_token):
        exit(1)
    trainer_token = login(TRAINER["username"], TRAINER["password"])
    if not trainer_token:
        exit(1)
    client_id = register_client(trainer_token)
    if not client_id:
        exit(1)
    if not assign_client_to_trainer(trainer_token, client_id):
        exit(1)
    print("\nTest Users:")
    print("1. Admin   - username: admin, password: admin123")
    print("2. Trainer - username: trainer, password: trainer123")
    print("3. Client  - username: client, password: client123")
    print("All test users initialized and linked via API!") 