#!/usr/bin/env python3
"""
Script to create meal plans and training plans for clients to demonstrate the system.
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

def get_clients(trainer_token):
    """Get all clients"""
    headers = {"Authorization": f"Bearer {trainer_token}"}
    r = requests.get(f"{API_URL}/users/clients", headers=headers)
    if r.status_code == 200:
        clients = r.json()
        print(f"Found {len(clients)} clients")
        return clients
    print(f"Failed to get clients: {r.text}")
    return []

def create_comprehensive_meal_plan(trainer_token, client_id, client_name):
    """Create a comprehensive meal plan for the client"""
    headers = {"Authorization": f"Bearer {trainer_token}"}
    
    meal_plan_data = {
        "client_id": client_id,
        "name": f"{client_name} - Complete Nutrition Plan",
        "description": f"Comprehensive meal plan designed specifically for {client_name}. This plan focuses on balanced macronutrients, proper meal timing, and sustainable eating habits.",
        "number_of_meals": 5,
        "total_calories": 2200,
        "protein_target": 165,
        "carb_target": 220,
        "fat_target": 85,
        "meal_slots": [
            {
                "name": "Pre-Workout Fuel",
                "time_suggestion": "07:30",
                "macro_categories": [
                    {
                        "macro_type": "protein",
                        "quantity_instruction": "25g",
                        "food_options": [
                            {
                                "name": "Greek Yogurt",
                                "name_hebrew": "יוגורט יווני",
                                "calories": 130,
                                "protein": 20,
                                "carbs": 8,
                                "fat": 0,
                                "serving_size": "1 cup (170g)"
                            },
                            {
                                "name": "Protein Shake",
                                "name_hebrew": "שייק חלבון",
                                "calories": 120,
                                "protein": 24,
                                "carbs": 3,
                                "fat": 1,
                                "serving_size": "1 scoop (30g)"
                            }
                        ]
                    },
                    {
                        "macro_type": "carb",
                        "quantity_instruction": "30g",
                        "food_options": [
                            {
                                "name": "Banana",
                                "name_hebrew": "בננה",
                                "calories": 105,
                                "protein": 1,
                                "carbs": 27,
                                "fat": 0,
                                "serving_size": "1 medium (118g)"
                            },
                            {
                                "name": "Oatmeal",
                                "name_hebrew": "שיבולת שועל",
                                "calories": 150,
                                "protein": 5,
                                "carbs": 27,
                                "fat": 3,
                                "serving_size": "1/2 cup dry (40g)"
                            }
                        ]
                    },
                    {
                        "macro_type": "fat",
                        "quantity_instruction": "10g",
                        "food_options": [
                            {
                                "name": "Almonds",
                                "name_hebrew": "שקדים",
                                "calories": 164,
                                "protein": 6,
                                "carbs": 6,
                                "fat": 14,
                                "serving_size": "1 oz (28g)"
                            }
                        ]
                    }
                ]
            },
            {
                "name": "Post-Workout Recovery",
                "time_suggestion": "09:30",
                "macro_categories": [
                    {
                        "macro_type": "protein",
                        "quantity_instruction": "35g",
                        "food_options": [
                            {
                                "name": "Eggs",
                                "name_hebrew": "ביצים",
                                "calories": 140,
                                "protein": 12,
                                "carbs": 1,
                                "fat": 10,
                                "serving_size": "2 large (100g)"
                            },
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
                        "quantity_instruction": "45g",
                        "food_options": [
                            {
                                "name": "Sweet Potato",
                                "name_hebrew": "בטטה",
                                "calories": 112,
                                "protein": 2,
                                "carbs": 26,
                                "fat": 0.1,
                                "serving_size": "1 medium (114g)"
                            },
                            {
                                "name": "Brown Rice",
                                "name_hebrew": "אורז חום",
                                "calories": 112,
                                "protein": 2.6,
                                "carbs": 22,
                                "fat": 0.9,
                                "serving_size": "1/2 cup cooked (98g)"
                            }
                        ]
                    },
                    {
                        "macro_type": "fat",
                        "quantity_instruction": "15g",
                        "food_options": [
                            {
                                "name": "Olive Oil",
                                "name_hebrew": "שמן זית",
                                "calories": 120,
                                "protein": 0,
                                "carbs": 0,
                                "fat": 14,
                                "serving_size": "1 tbsp (14g)"
                            },
                            {
                                "name": "Avocado",
                                "name_hebrew": "אבוקדו",
                                "calories": 160,
                                "protein": 2,
                                "carbs": 9,
                                "fat": 15,
                                "serving_size": "1/2 medium (68g)"
                            }
                        ]
                    }
                ]
            },
            {
                "name": "Midday Sustenance",
                "time_suggestion": "13:00",
                "macro_categories": [
                    {
                        "macro_type": "protein",
                        "quantity_instruction": "30g",
                        "food_options": [
                            {
                                "name": "Salmon",
                                "name_hebrew": "סלמון",
                                "calories": 206,
                                "protein": 22,
                                "carbs": 0,
                                "fat": 12,
                                "serving_size": "100g"
                            },
                            {
                                "name": "Turkey Breast",
                                "name_hebrew": "חזה הודו",
                                "calories": 135,
                                "protein": 30,
                                "carbs": 0,
                                "fat": 1,
                                "serving_size": "100g"
                            }
                        ]
                    },
                    {
                        "macro_type": "carb",
                        "quantity_instruction": "40g",
                        "food_options": [
                            {
                                "name": "Quinoa",
                                "name_hebrew": "קינואה",
                                "calories": 120,
                                "protein": 4,
                                "carbs": 22,
                                "fat": 2,
                                "serving_size": "1/2 cup cooked (92g)"
                            },
                            {
                                "name": "Mixed Vegetables",
                                "name_hebrew": "ירקות מעורבים",
                                "calories": 50,
                                "protein": 3,
                                "carbs": 10,
                                "fat": 0.5,
                                "serving_size": "1 cup (150g)"
                            }
                        ]
                    },
                    {
                        "macro_type": "fat",
                        "quantity_instruction": "18g",
                        "food_options": [
                            {
                                "name": "Coconut Oil",
                                "name_hebrew": "שמן קוקוס",
                                "calories": 120,
                                "protein": 0,
                                "carbs": 0,
                                "fat": 14,
                                "serving_size": "1 tbsp (14g)"
                            },
                            {
                                "name": "Walnuts",
                                "name_hebrew": "אגוזי מלך",
                                "calories": 185,
                                "protein": 4,
                                "carbs": 4,
                                "fat": 18,
                                "serving_size": "1/4 cup (28g)"
                            }
                        ]
                    }
                ]
            },
            {
                "name": "Afternoon Boost",
                "time_suggestion": "16:00",
                "macro_categories": [
                    {
                        "macro_type": "protein",
                        "quantity_instruction": "20g",
                        "food_options": [
                            {
                                "name": "Cottage Cheese",
                                "name_hebrew": "גבינה לבנה",
                                "calories": 110,
                                "protein": 20,
                                "carbs": 6,
                                "fat": 1,
                                "serving_size": "1/2 cup (113g)"
                            }
                        ]
                    },
                    {
                        "macro_type": "carb",
                        "quantity_instruction": "25g",
                        "food_options": [
                            {
                                "name": "Apple",
                                "name_hebrew": "תפוח",
                                "calories": 95,
                                "protein": 0.5,
                                "carbs": 25,
                                "fat": 0.3,
                                "serving_size": "1 medium (182g)"
                            },
                            {
                                "name": "Berries",
                                "name_hebrew": "פירות יער",
                                "calories": 80,
                                "protein": 1,
                                "carbs": 20,
                                "fat": 0.5,
                                "serving_size": "1 cup (150g)"
                            }
                        ]
                    },
                    {
                        "macro_type": "fat",
                        "quantity_instruction": "12g",
                        "food_options": [
                            {
                                "name": "Peanut Butter",
                                "name_hebrew": "חמאת בוטנים",
                                "calories": 94,
                                "protein": 4,
                                "carbs": 3,
                                "fat": 8,
                                "serving_size": "1 tbsp (16g)"
                            },
                            {
                                "name": "Chia Seeds",
                                "name_hebrew": "זרעי צ'יה",
                                "calories": 138,
                                "protein": 4.7,
                                "carbs": 12,
                                "fat": 8.7,
                                "serving_size": "2 tbsp (28g)"
                            }
                        ]
                    }
                ]
            },
            {
                "name": "Evening Restoration",
                "time_suggestion": "19:30",
                "macro_categories": [
                    {
                        "macro_type": "protein",
                        "quantity_instruction": "30g",
                        "food_options": [
                            {
                                "name": "Lean Beef",
                                "name_hebrew": "בשר בקר רזה",
                                "calories": 250,
                                "protein": 26,
                                "carbs": 0,
                                "fat": 17,
                                "serving_size": "100g"
                            },
                            {
                                "name": "White Fish",
                                "name_hebrew": "דג לבן",
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
                        "quantity_instruction": "35g",
                        "food_options": [
                            {
                                "name": "Wild Rice",
                                "name_hebrew": "אורז בר",
                                "calories": 166,
                                "protein": 6.5,
                                "carbs": 35,
                                "fat": 0.6,
                                "serving_size": "1 cup cooked (164g)"
                            },
                            {
                                "name": "Roasted Vegetables",
                                "name_hebrew": "ירקות צלויים",
                                "calories": 82,
                                "protein": 3,
                                "carbs": 18,
                                "fat": 1,
                                "serving_size": "1 cup (150g)"
                            }
                        ]
                    },
                    {
                        "macro_type": "fat",
                        "quantity_instruction": "20g",
                        "food_options": [
                            {
                                "name": "Extra Virgin Olive Oil",
                                "name_hebrew": "שמן זית כתית",
                                "calories": 120,
                                "protein": 0,
                                "carbs": 0,
                                "fat": 14,
                                "serving_size": "1 tbsp (14g)"
                            },
                            {
                                "name": "Pumpkin Seeds",
                                "name_hebrew": "גרעיני דלעת",
                                "calories": 180,
                                "protein": 9,
                                "carbs": 4,
                                "fat": 16,
                                "serving_size": "1/4 cup (32g)"
                            }
                        ]
                    }
                ]
            }
        ]
    }
    
    r = requests.post(f"{API_URL}/v2/meals/plans/complete", json=meal_plan_data, headers=headers)
    if r.status_code == 201:
        print(f"Created comprehensive meal plan for {client_name}")
        return r.json()
    else:
        print(f"Failed to create meal plan for {client_name}: {r.text}")
        return None

def create_training_plan(trainer_token, client_id, client_name):
    """Create a comprehensive training plan for the client"""
    headers = {"Authorization": f"Bearer {trainer_token}"}
    
    # First, get available exercises
    exercises_r = requests.get(f"{API_URL}/exercises/", headers=headers)
    if exercises_r.status_code != 200:
        print(f"Failed to get exercises: {exercises_r.text}")
        return None
    
    exercises = exercises_r.json()
    print(f"Found {len(exercises)} exercises to choose from")
    
    # Create a comprehensive training plan
    training_plan_data = {
        "client_id": client_id,
        "name": f"{client_name} - Strength & Conditioning Program",
        "description": f"Comprehensive 4-week training program designed for {client_name}. This program focuses on building strength, improving cardiovascular health, and developing functional movement patterns.",
        "duration_weeks": 4,
        "workout_slots": [
            {
                "name": "Upper Body Strength",
                "day_of_week": "Monday",
                "time_suggestion": "08:00",
                "duration_minutes": 60,
                "exercises": [
                    {
                        "exercise_id": exercises[0]["id"] if len(exercises) > 0 else 1,  # Push-ups
                        "sets": 4,
                        "reps": "12-15",
                        "rest_seconds": 60,
                        "notes": "Focus on full range of motion, controlled tempo"
                    },
                    {
                        "exercise_id": exercises[2]["id"] if len(exercises) > 2 else 3,  # Deadlifts
                        "sets": 4,
                        "reps": "6-8",
                        "rest_seconds": 120,
                        "notes": "Heavy weight, perfect form. Engage core throughout"
                    },
                    {
                        "exercise_id": exercises[3]["id"] if len(exercises) > 3 else 4,  # Bench Press
                        "sets": 3,
                        "reps": "8-10",
                        "rest_seconds": 90,
                        "notes": "Moderate weight, focus on chest activation"
                    }
                ]
            },
            {
                "name": "Lower Body Power",
                "day_of_week": "Wednesday",
                "time_suggestion": "08:00",
                "duration_minutes": 55,
                "exercises": [
                    {
                        "exercise_id": exercises[1]["id"] if len(exercises) > 1 else 2,  # Squats
                        "sets": 4,
                        "reps": "10-12",
                        "rest_seconds": 90,
                        "notes": "Deep squats, drive through heels"
                    },
                    {
                        "exercise_id": exercises[0]["id"] if len(exercises) > 0 else 1,  # Push-ups variation
                        "sets": 3,
                        "reps": "15-20",
                        "rest_seconds": 45,
                        "notes": "Plyometric push-ups for power"
                    }
                ]
            },
            {
                "name": "Full Body Conditioning",
                "day_of_week": "Friday",
                "time_suggestion": "08:00",
                "duration_minutes": 70,
                "exercises": [
                    {
                        "exercise_id": exercises[4]["id"] if len(exercises) > 4 else 5,  # Pull-ups
                        "sets": 4,
                        "reps": "8-12",
                        "rest_seconds": 75,
                        "notes": "Assisted if needed, focus on lat activation"
                    },
                    {
                        "exercise_id": exercises[2]["id"] if len(exercises) > 2 else 3,  # Deadlifts
                        "sets": 3,
                        "reps": "5-6",
                        "rest_seconds": 120,
                        "notes": "Heavy deadlifts, perfect technique"
                    },
                    {
                        "exercise_id": exercises[1]["id"] if len(exercises) > 1 else 2,  # Squats
                        "sets": 3,
                        "reps": "12-15",
                        "rest_seconds": 60,
                        "notes": "Goblet squats with dumbbell"
                    }
                ]
            },
            {
                "name": "Active Recovery",
                "day_of_week": "Sunday",
                "time_suggestion": "10:00",
                "duration_minutes": 45,
                "exercises": [
                    {
                        "exercise_id": exercises[0]["id"] if len(exercises) > 0 else 1,  # Push-ups
                        "sets": 2,
                        "reps": "10-15",
                        "rest_seconds": 30,
                        "notes": "Easy pace, focus on mobility"
                    },
                    {
                        "exercise_id": exercises[1]["id"] if len(exercises) > 1 else 2,  # Squats
                        "sets": 2,
                        "reps": "15-20",
                        "rest_seconds": 30,
                        "notes": "Bodyweight only, full range of motion"
                    }
                ]
            }
        ]
    }
    
    r = requests.post(f"{API_URL}/v2/workouts/plans/complete", json=training_plan_data, headers=headers)
    if r.status_code == 201:
        print(f"Created comprehensive training plan for {client_name}")
        return r.json()
    else:
        print(f"Failed to create training plan for {client_name}: {r.text}")
        return None

def main():
    print("Creating comprehensive meal and training plans...")
    
    if not wait_for_api():
        exit(1)
    
    # Login as trainer
    trainer_token = login("trainer@elior.com", "trainer123")
    if not trainer_token:
        print("Failed to login as trainer")
        exit(1)
    
    # Get clients
    clients = get_clients(trainer_token)
    if not clients:
        print("No clients found")
        exit(1)
    
    # Select the first client (John Doe)
    target_client = None
    for client in clients:
        if "john" in client["full_name"].lower():
            target_client = client
            break
    
    if not target_client:
        target_client = clients[0]  # Use first client if John Doe not found
    
    print(f"\n=== Creating Plans for {target_client['full_name']} ===")
    
    # Create meal plan
    print("\nCreating comprehensive meal plan...")
    meal_plan = create_comprehensive_meal_plan(trainer_token, target_client["id"], target_client["full_name"])
    
    # Create training plan
    print("\nCreating comprehensive training plan...")
    training_plan = create_training_plan(trainer_token, target_client["id"], target_client["full_name"])
    
    print(f"\n=== Plans Created Successfully! ===")
    print(f"Client: {target_client['full_name']}")
    print(f"Meal Plan: {'Created' if meal_plan else 'Failed'}")
    print(f"Training Plan: {'Created' if training_plan else 'Failed'}")
    
    print(f"\nReady to Test:")
    print(f"1. Login as trainer@elior.com / trainer123")
    print(f"2. Go to {target_client['full_name']}'s profile")
    print(f"3. Check 'Meal Plans' tab - see 5 meals with 3 macro categories each")
    print(f"4. Check 'Workout Plans' tab - see 4-day weekly program")
    print(f"5. Test the flexible meal creation system")
    print(f"6. View the comprehensive exercise database")

if __name__ == "__main__":
    main()
