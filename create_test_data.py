#!/usr/bin/env python3
"""
Script to create test data - exercises, clients with meal plans, and progress data.
"""
import requests
import json
import time

API_URL = "http://localhost:8000/api"

def wait_for_api():
    print("Waiting for API to be available...")
    for _ in range(30):
        try:
            r = requests.get("http://localhost:8000/health")
            if r.status_code == 200:
                print("API is up!")
                return True
        except Exception:
            pass
        time.sleep(2)
    print("API did not become available in time.")
    return False

def login(username, password):
    r = requests.post(f"{API_URL}/auth/login", json={"username": username, "password": password})
    if r.status_code == 200:
        token = r.json()["access_token"]
        print(f"Logged in as {username}")
        return token
    print(f"Login failed for {username}: {r.text}")
    return None

def create_exercises(trainer_token):
    """Create some sample exercises"""
    headers = {"Authorization": f"Bearer {trainer_token}"}
    
    exercises = [
        {
            "name": "Push-ups",
            "description": "Classic bodyweight exercise for chest, shoulders, and triceps",
            "category": "Strength",
            "muscle_group": "chest",
            "equipment": "bodyweight",
            "difficulty": "beginner"
        },
        {
            "name": "Squats",
            "description": "Fundamental lower body exercise",
            "category": "Strength", 
            "muscle_group": "legs",
            "equipment": "bodyweight",
            "difficulty": "beginner"
        },
        {
            "name": "Deadlifts",
            "description": "Compound exercise targeting posterior chain",
            "category": "Strength",
            "muscle_group": "back",
            "equipment": "barbell",
            "difficulty": "intermediate"
        },
        {
            "name": "Bench Press",
            "description": "Upper body compound movement",
            "category": "Strength",
            "muscle_group": "chest",
            "equipment": "barbell",
            "difficulty": "intermediate"
        },
        {
            "name": "Pull-ups",
            "description": "Upper body pulling exercise",
            "category": "Strength",
            "muscle_group": "back",
            "equipment": "pull_up_bar",
            "difficulty": "intermediate"
        }
    ]
    
    created_exercises = []
    for exercise in exercises:
        r = requests.post(f"{API_URL}/exercises/", json=exercise, headers=headers)
        if r.status_code == 201:
            created_exercises.append(r.json())
            print(f"Created exercise: {exercise['name']}")
        elif r.status_code == 400 and "already exists" in r.text:
            print(f"Exercise already exists: {exercise['name']}")
        else:
            print(f"Failed to create exercise {exercise['name']}: {r.text}")
    
    return created_exercises

def create_additional_clients(trainer_token):
    """Create additional test clients"""
    headers = {"Authorization": f"Bearer {trainer_token}"}
    
    clients = [
        {
            "username": "john.doe@example.com",
            "email": "john.doe@example.com", 
            "password": "password123",
            "full_name": "John Doe",
            "role": "CLIENT"
        },
        {
            "username": "jane.smith@example.com",
            "email": "jane.smith@example.com",
            "password": "password123", 
            "full_name": "Jane Smith",
            "role": "CLIENT"
        },
        {
            "username": "mike.johnson@example.com",
            "email": "mike.johnson@example.com",
            "password": "password123",
            "full_name": "Mike Johnson", 
            "role": "CLIENT"
        }
    ]
    
    created_clients = []
    for client_data in clients:
        r = requests.post(f"{API_URL}/auth/register/client", json=client_data, headers=headers)
        if r.status_code == 201:
            client = r.json()
            created_clients.append(client)
            print(f"Created client: {client_data['full_name']}")
            
            # Assign client to trainer
            assign_r = requests.post(f"{API_URL}/users/clients/{client['id']}/assign", headers=headers)
            if assign_r.status_code == 200:
                print(f"Assigned {client_data['full_name']} to trainer")
            elif assign_r.status_code == 400 and "already assigned" in assign_r.text:
                print(f"{client_data['full_name']} already assigned to trainer")
        elif r.status_code == 400 and "already registered" in r.text:
            print(f"Client already exists: {client_data['full_name']}")
        else:
            print(f"Failed to create client {client_data['full_name']}: {r.text}")
    
    return created_clients

def create_meal_plans(trainer_token, clients):
    """Create meal plans for clients"""
    headers = {"Authorization": f"Bearer {trainer_token}"}
    
    for client in clients:
        meal_plan_data = {
            "client_id": client["id"],
            "name": f"{client['full_name']} - Cutting Plan",
            "description": f"Personalized meal plan for {client['full_name']}",
            "number_of_meals": 4,
            "total_calories": 2000,
            "protein_target": 150,
            "carb_target": 200,
            "fat_target": 80,
            "meal_slots": [
                {
                    "name": "Breakfast",
                    "time_suggestion": "08:00",
                    "macro_categories": [
                        {
                            "macro_type": "protein",
                            "quantity_instruction": "30g",
                            "food_options": [
                                {
                                    "name": "Greek Yogurt",
                                    "name_hebrew": "יוגורט יווני",
                                    "calories": 130,
                                    "protein": 20,
                                    "carbs": 8,
                                    "fat": 0,
                                    "serving_size": "1 cup"
                                },
                                {
                                    "name": "Eggs",
                                    "name_hebrew": "ביצים",
                                    "calories": 140,
                                    "protein": 12,
                                    "carbs": 1,
                                    "fat": 10,
                                    "serving_size": "2 large"
                                }
                            ]
                        },
                        {
                            "macro_type": "carb",
                            "quantity_instruction": "40g",
                            "food_options": [
                                {
                                    "name": "Oatmeal",
                                    "name_hebrew": "שיבולת שועל",
                                    "calories": 150,
                                    "protein": 5,
                                    "carbs": 27,
                                    "fat": 3,
                                    "serving_size": "1/2 cup dry"
                                },
                                {
                                    "name": "Banana",
                                    "name_hebrew": "בננה",
                                    "calories": 105,
                                    "protein": 1,
                                    "carbs": 27,
                                    "fat": 0,
                                    "serving_size": "1 medium"
                                }
                            ]
                        },
                        {
                            "macro_type": "fat",
                            "quantity_instruction": "15g",
                            "food_options": [
                                {
                                    "name": "Almonds",
                                    "name_hebrew": "שקדים",
                                    "calories": 164,
                                    "protein": 6,
                                    "carbs": 6,
                                    "fat": 14,
                                    "serving_size": "1 oz"
                                }
                            ]
                        }
                    ]
                },
                {
                    "name": "Lunch",
                    "time_suggestion": "13:00",
                    "macro_categories": [
                        {
                            "macro_type": "protein",
                            "quantity_instruction": "40g",
                            "food_options": [
                                {
                                    "name": "Chicken Breast",
                                    "name_hebrew": "חזה עוף",
                                    "calories": 165,
                                    "protein": 31,
                                    "carbs": 0,
                                    "fat": 3.6,
                                    "serving_size": "100g"
                                }
                            ]
                        },
                        {
                            "macro_type": "carb",
                            "quantity_instruction": "50g",
                            "food_options": [
                                {
                                    "name": "Brown Rice",
                                    "name_hebrew": "אורז חום",
                                    "calories": 112,
                                    "protein": 2.6,
                                    "carbs": 22,
                                    "fat": 0.9,
                                    "serving_size": "1/2 cup cooked"
                                },
                                {
                                    "name": "Sweet Potato",
                                    "name_hebrew": "בטטה",
                                    "calories": 112,
                                    "protein": 2,
                                    "carbs": 26,
                                    "fat": 0.1,
                                    "serving_size": "1 medium"
                                }
                            ]
                        },
                        {
                            "macro_type": "fat",
                            "quantity_instruction": "20g",
                            "food_options": [
                                {
                                    "name": "Olive Oil",
                                    "name_hebrew": "שמן זית",
                                    "calories": 120,
                                    "protein": 0,
                                    "carbs": 0,
                                    "fat": 14,
                                    "serving_size": "1 tbsp"
                                },
                                {
                                    "name": "Avocado",
                                    "name_hebrew": "אבוקדו",
                                    "calories": 160,
                                    "protein": 2,
                                    "carbs": 9,
                                    "fat": 15,
                                    "serving_size": "1/2 medium"
                                }
                            ]
                        }
                    ]
                },
                {
                    "name": "Snack",
                    "time_suggestion": "16:00",
                    "macro_categories": [
                        {
                            "macro_type": "protein",
                            "quantity_instruction": "25g",
                            "food_options": [
                                {
                                    "name": "Protein Shake",
                                    "name_hebrew": "שייק חלבון",
                                    "calories": 120,
                                    "protein": 24,
                                    "carbs": 3,
                                    "fat": 1,
                                    "serving_size": "1 scoop"
                                }
                            ]
                        },
                        {
                            "macro_type": "carb",
                            "quantity_instruction": "20g",
                            "food_options": [
                                {
                                    "name": "Apple",
                                    "name_hebrew": "תפוח",
                                    "calories": 95,
                                    "protein": 0.5,
                                    "carbs": 25,
                                    "fat": 0.3,
                                    "serving_size": "1 medium"
                                }
                            ]
                        },
                        {
                            "macro_type": "fat",
                            "quantity_instruction": "10g",
                            "food_options": [
                                {
                                    "name": "Peanut Butter",
                                    "name_hebrew": "חמאת בוטנים",
                                    "calories": 94,
                                    "protein": 4,
                                    "carbs": 3,
                                    "fat": 8,
                                    "serving_size": "1 tbsp"
                                }
                            ]
                        }
                    ]
                },
                {
                    "name": "Dinner",
                    "time_suggestion": "19:00",
                    "macro_categories": [
                        {
                            "macro_type": "protein",
                            "quantity_instruction": "35g",
                            "food_options": [
                                {
                                    "name": "Salmon",
                                    "name_hebrew": "סלמון",
                                    "calories": 206,
                                    "protein": 22,
                                    "carbs": 0,
                                    "fat": 12,
                                    "serving_size": "100g"
                                }
                            ]
                        },
                        {
                            "macro_type": "carb",
                            "quantity_instruction": "30g",
                            "food_options": [
                                {
                                    "name": "Quinoa",
                                    "name_hebrew": "קינואה",
                                    "calories": 120,
                                    "protein": 4,
                                    "carbs": 22,
                                    "fat": 2,
                                    "serving_size": "1/2 cup cooked"
                                }
                            ]
                        },
                        {
                            "macro_type": "fat",
                            "quantity_instruction": "15g",
                            "food_options": [
                                {
                                    "name": "Coconut Oil",
                                    "name_hebrew": "שמן קוקוס",
                                    "calories": 120,
                                    "protein": 0,
                                    "carbs": 0,
                                    "fat": 14,
                                    "serving_size": "1 tbsp"
                                }
                            ]
                        }
                    ]
                }
            ]
        }
        
        r = requests.post(f"{API_URL}/v2/meals/plans/complete", json=meal_plan_data, headers=headers)
        if r.status_code == 201:
            print(f"Created meal plan for {client['full_name']}")
        else:
            print(f"Failed to create meal plan for {client['full_name']}: {r.text}")

def create_progress_entries(trainer_token, clients):
    """Create progress entries for clients"""
    headers = {"Authorization": f"Bearer {trainer_token}"}
    
    import datetime
    from datetime import timedelta
    
    for client in clients:
        # Create some weight progress entries over the last month
        base_weight = 80.0 if "john" in client["full_name"].lower() else 65.0
        
        for i in range(10):
            date = datetime.datetime.now() - timedelta(days=i*3)
            weight = base_weight - (i * 0.5)  # Losing weight over time
            
            progress_data = {
                "client_id": client["id"],
                "weight": round(weight, 1),
                "body_fat": round(15.0 + (i * 0.3), 1),
                "notes": f"Week {i+1} progress - feeling great!",
                "recorded_at": date.isoformat()
            }
            
            r = requests.post(f"{API_URL}/progress", json=progress_data, headers=headers)
            if r.status_code == 201:
                print(f"Created progress entry for {client['full_name']} - {weight}kg on {date.strftime('%Y-%m-%d')}")
            else:
                print(f"Failed to create progress entry for {client['full_name']}: {r.text}")

if __name__ == "__main__":
    print("Creating test data...")
    if not wait_for_api():
        exit(1)
    
    # Login as trainer
    trainer_token = login("trainer@elior.com", "trainer123")
    if not trainer_token:
        print("Failed to login as trainer")
        exit(1)
    
    print("\n=== Creating Exercises ===")
    exercises = create_exercises(trainer_token)
    
    print("\n=== Creating Additional Clients ===")
    clients = create_additional_clients(trainer_token)
    
    print("\n=== Creating Meal Plans ===")
    create_meal_plans(trainer_token, clients)
    
    print("\n=== Creating Progress Entries ===")
    create_progress_entries(trainer_token, clients)
    
    print("\n=== Test Data Created Successfully! ===")
    print("You can now:")
    print("1. Login as trainer@elior.com / trainer123")
    print("2. View clients with real data")
    print("3. See meal plans with 3 macro categories")
    print("4. Check progress tracking with real weight data")
    print("5. Browse exercises in the exercise bank")
