#!/usr/bin/env python3
"""
Script to create a test training plan with multiple days and exercises.
Run this from the project root directory.
"""

import requests
import json
import sys

API_BASE_URL = "http://localhost:8000/api"

def login_as_trainer():
    """Login as trainer and get token"""
    response = requests.post(
        f"{API_BASE_URL}/auth/login",
        json={
            "username": "trainer@elior.com",
            "password": "trainer123"
        }
    )
    if response.status_code != 200:
        print(f"Failed to login: {response.status_code}")
        print(response.text)
        sys.exit(1)
    return response.json()["access_token"]

def get_client_id(token):
    """Get client user ID"""
    response = requests.get(
        f"{API_BASE_URL}/users/",
        headers={"Authorization": f"Bearer {token}"}
    )
    if response.status_code != 200:
        print(f"Failed to get users: {response.status_code}")
        sys.exit(1)
    
    users = response.json()
    client = next((u for u in users if u.get("email") == "client@elior.com"), None)
    if not client:
        print("Client user not found")
        sys.exit(1)
    return client["id"]

def get_exercises(token):
    """Get available exercises"""
    response = requests.get(
        f"{API_BASE_URL}/exercises/",
        headers={"Authorization": f"Bearer {token}"}
    )
    if response.status_code != 200:
        print(f"Failed to get exercises: {response.status_code}")
        return []
    return response.json()

def create_exercise(token, name, muscle_group, equipment="None"):
    """Create a new exercise"""
    response = requests.post(
        f"{API_BASE_URL}/exercises/",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        json={
            "name": name,
            "description": f"Exercise: {name}",
            "muscle_group": muscle_group,
            "equipment_needed": equipment,
            "instructions": f"Instructions for {name}"
        }
    )
    if response.status_code in [200, 201]:
        return response.json()
    print(f"Failed to create exercise {name}: {response.status_code}")
    return None

def create_training_plan(token, client_id, exercises):
    """Create a complete training plan with multiple days"""
    
    # Ensure we have enough exercises
    exercise_names = [
        "Bench Press", "Squat", "Deadlift", "Overhead Press", 
        "Barbell Row", "Pull-ups", "Leg Press", "Bicep Curls",
        "Tricep Dips", "Lunges", "Shoulder Press", "Lat Pulldown"
    ]
    
    created_exercises = []
    for name in exercise_names:
        # Check if exercise exists
        existing = next((e for e in exercises if e.get("name") == name), None)
        if existing:
            created_exercises.append(existing)
        else:
            # Create exercise
            muscle_groups = {
                "Bench Press": "CHEST",
                "Squat": "LEGS",
                "Deadlift": "BACK",
                "Overhead Press": "SHOULDERS",
                "Barbell Row": "BACK",
                "Pull-ups": "BACK",
                "Leg Press": "LEGS",
                "Bicep Curls": "ARMS",
                "Tricep Dips": "ARMS",
                "Lunges": "LEGS",
                "Shoulder Press": "SHOULDERS",
                "Lat Pulldown": "BACK"
            }
            new_exercise = create_exercise(
                token, 
                name, 
                muscle_groups.get(name, "OTHER")
            )
            if new_exercise:
                created_exercises.append(new_exercise)
    
    if len(created_exercises) < 12:
        print(f"Warning: Only {len(created_exercises)} exercises available")
    
    # Create workout plan with 3 days
    plan_data = {
        "client_id": client_id,
        "name": "Complete Training Plan - 3 Days",
        "description": "A comprehensive 3-day training plan with multiple exercises per day",
        "split_type": "PUSH_PULL_LEGS",
        "days_per_week": 3,
        "duration_weeks": 12,
        "is_active": True,
        "workout_days": [
            {
                "name": "Day 1 - Push Day",
                "day_type": "PUSH",
                "order_index": 1,
                "notes": "Focus on chest, shoulders, and triceps",
                "estimated_duration": 60,
                "workout_exercises": [
                    {
                        "exercise_id": created_exercises[0]["id"] if len(created_exercises) > 0 else 1,  # Bench Press
                        "order_index": 1,
                        "target_sets": 4,
                        "target_reps": "8-10",
                        "target_weight": None,
                        "rest_seconds": 90,
                        "notes": "Focus on form"
                    },
                    {
                        "exercise_id": created_exercises[3]["id"] if len(created_exercises) > 3 else 1,  # Overhead Press
                        "order_index": 2,
                        "target_sets": 3,
                        "target_reps": "10-12",
                        "target_weight": None,
                        "rest_seconds": 60,
                        "notes": "Keep core tight"
                    },
                    {
                        "exercise_id": created_exercises[8]["id"] if len(created_exercises) > 8 else 1,  # Tricep Dips
                        "order_index": 3,
                        "target_sets": 3,
                        "target_reps": "12-15",
                        "target_weight": None,
                        "rest_seconds": 45,
                        "notes": "Bodyweight or weighted"
                    }
                ]
            },
            {
                "name": "Day 2 - Pull Day",
                "day_type": "PULL",
                "order_index": 2,
                "notes": "Focus on back and biceps",
                "estimated_duration": 60,
                "workout_exercises": [
                    {
                        "exercise_id": created_exercises[2]["id"] if len(created_exercises) > 2 else 1,  # Deadlift
                        "order_index": 1,
                        "target_sets": 4,
                        "target_reps": "5-6",
                        "target_weight": None,
                        "rest_seconds": 120,
                        "notes": "Heavy compound movement"
                    },
                    {
                        "exercise_id": created_exercises[4]["id"] if len(created_exercises) > 4 else 1,  # Barbell Row
                        "order_index": 2,
                        "target_sets": 4,
                        "target_reps": "8-10",
                        "target_weight": None,
                        "rest_seconds": 90,
                        "notes": "Pull to lower chest"
                    },
                    {
                        "exercise_id": created_exercises[5]["id"] if len(created_exercises) > 5 else 1,  # Pull-ups
                        "order_index": 3,
                        "target_sets": 3,
                        "target_reps": "8-12",
                        "target_weight": None,
                        "rest_seconds": 60,
                        "notes": "Assisted if needed"
                    },
                    {
                        "exercise_id": created_exercises[7]["id"] if len(created_exercises) > 7 else 1,  # Bicep Curls
                        "order_index": 4,
                        "target_sets": 3,
                        "target_reps": "12-15",
                        "target_weight": None,
                        "rest_seconds": 45,
                        "notes": "Focus on squeeze"
                    }
                ]
            },
            {
                "name": "Day 3 - Legs Day",
                "day_type": "LEGS",
                "order_index": 3,
                "notes": "Focus on legs and glutes",
                "estimated_duration": 75,
                "workout_exercises": [
                    {
                        "exercise_id": created_exercises[1]["id"] if len(created_exercises) > 1 else 1,  # Squat
                        "order_index": 1,
                        "target_sets": 4,
                        "target_reps": "8-10",
                        "target_weight": None,
                        "rest_seconds": 120,
                        "notes": "Full depth"
                    },
                    {
                        "exercise_id": created_exercises[6]["id"] if len(created_exercises) > 6 else 1,  # Leg Press
                        "order_index": 2,
                        "target_sets": 4,
                        "target_reps": "12-15",
                        "target_weight": None,
                        "rest_seconds": 90,
                        "notes": "Controlled movement"
                    },
                    {
                        "exercise_id": created_exercises[9]["id"] if len(created_exercises) > 9 else 1,  # Lunges
                        "order_index": 3,
                        "target_sets": 3,
                        "target_reps": "12 each leg",
                        "target_weight": None,
                        "rest_seconds": 60,
                        "notes": "Alternating legs"
                    }
                ]
            }
        ]
    }
    
    response = requests.post(
        f"{API_BASE_URL}/v2/workouts/plans/complete",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        json=plan_data
    )
    
    if response.status_code in [200, 201]:
        print("✅ Training plan created successfully!")
        plan = response.json()
        print(f"Plan ID: {plan.get('id')}")
        print(f"Plan Name: {plan.get('name')}")
        print(f"Days: {len(plan.get('workout_days', []))}")
        return plan
    else:
        print(f"❌ Failed to create training plan: {response.status_code}")
        print(response.text)
        return None

def main():
    print("🚀 Creating test training plan...")
    
    # Login as trainer
    print("1. Logging in as trainer...")
    token = login_as_trainer()
    print("✅ Logged in successfully")
    
    # Get client ID
    print("2. Getting client ID...")
    client_id = get_client_id(token)
    print(f"✅ Client ID: {client_id}")
    
    # Get existing exercises
    print("3. Getting existing exercises...")
    exercises = get_exercises(token)
    print(f"✅ Found {len(exercises)} existing exercises")
    
    # Create training plan
    print("4. Creating training plan...")
    plan = create_training_plan(token, client_id, exercises)
    
    if plan:
        print("\n🎉 Training plan creation complete!")
        print(f"\nPlan Details:")
        print(f"  - Name: {plan.get('name')}")
        print(f"  - Days: {len(plan.get('workout_days', []))}")
        for day in plan.get('workout_days', []):
            print(f"    • {day.get('name')}: {len(day.get('workout_exercises', []))} exercises")
    else:
        print("\n❌ Failed to create training plan")
        sys.exit(1)

if __name__ == "__main__":
    main()

