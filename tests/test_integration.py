import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json
import io

from app.main import app
from app.database import get_db, engine, Base
from app.models.user import User
from app.models.workout import Exercise, WorkoutPlan, WorkoutSession, WorkoutExercise, ExerciseCompletion, MuscleGroup
from app.models.nutrition import MealPlan, MealEntry, MealComponent, MealUpload, NutritionEntry
from app.models.progress import ProgressEntry
from app.services.auth_service import create_access_token
from app.services.password_service import get_password_hash

client = TestClient(app)

@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test"""
    Base.metadata.create_all(bind=engine)
    session = next(get_db())
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def trainer_user(db_session: Session):
    """Create a trainer user for testing"""
    user = User(
        email="trainer@test.com",
        hashed_password=get_password_hash("testpassword123"),
        full_name="Test Trainer",
        is_trainer=True,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def client_user(db_session: Session):
    """Create a client user for testing"""
    user = User(
        email="client@test.com",
        hashed_password=get_password_hash("clientpass123"),
        full_name="Test Client",
        is_trainer=False,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def trainer_token(trainer_user: User):
    """Create access token for trainer"""
    return create_access_token(data={"sub": trainer_user.email})

@pytest.fixture
def client_token(client_user: User):
    """Create access token for client"""
    return create_access_token(data={"sub": client_user.email})

class TestCompleteUserWorkflow:
    """Test complete user workflow from registration to full system usage"""
    
    def test_complete_user_registration_and_onboarding(self):
        """Test complete user registration and onboarding process"""
        # 1. Register trainer
        trainer_data = {
            "email": "newtrainer@test.com",
            "password": "trainerpass123",
            "full_name": "New Trainer",
            "is_trainer": True
        }
        
        response = client.post("/api/auth/register", json=trainer_data)
        assert response.status_code == 201
        trainer_response = response.json()
        assert trainer_response["user"]["is_trainer"] == True
        
        # 2. Register client
        client_data = {
            "email": "newclient@test.com",
            "password": "clientpass123",
            "full_name": "New Client",
            "is_trainer": False
        }
        
        response = client.post("/api/auth/register", json=client_data)
        assert response.status_code == 201
        client_response = response.json()
        assert client_response["user"]["is_trainer"] == False
        
        # 3. Login as trainer
        trainer_login = {
            "email": "newtrainer@test.com",
            "password": "trainerpass123"
        }
        
        response = client.post("/api/auth/login", json=trainer_login)
        assert response.status_code == 200
        trainer_token = response.json()["access_token"]
        
        # 4. Login as client
        client_login = {
            "email": "newclient@test.com",
            "password": "clientpass123"
        }
        
        response = client.post("/api/auth/login", json=client_login)
        assert response.status_code == 200
        client_token = response.json()["access_token"]
        
        # 5. Trainer assigns client to themselves
        response = client.post(
            f"/api/users/{trainer_response['user']['id']}/clients/{client_response['user']['id']}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 201
        
        # 6. Verify assignment
        response = client.get(
            f"/api/users/{trainer_response['user']['id']}/clients",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 200
        clients = response.json()
        assert len(clients) == 1
        assert clients[0]["id"] == client_response["user"]["id"]

class TestCompleteWorkoutWorkflow:
    """Test complete workout management workflow"""
    
    def test_complete_workout_workflow(self, trainer_token: str, client_token: str, client_user: User, db_session: Session):
        """Test complete workout creation and tracking workflow"""
        
        # 1. Create exercise bank
        exercises_data = [
            {
                "name": "Bench Press",
                "description": "Compound chest exercise",
                "muscle_group": "chest",
                "equipment_needed": "Barbell, bench",
                "instructions": "Lie on bench, lower bar to chest, press up"
            },
            {
                "name": "Squats",
                "description": "Lower body compound exercise",
                "muscle_group": "legs",
                "equipment_needed": "Barbell",
                "instructions": "Stand with feet shoulder-width apart, lower body as if sitting back"
            }
        ]
        
        exercise_ids = []
        for exercise_data in exercises_data:
            response = client.post(
                "/api/workouts/exercises",
                json=exercise_data,
                headers={"Authorization": f"Bearer {trainer_token}"}
            )
            assert response.status_code == 201
            exercise_ids.append(response.json()["id"])
        
        # 2. Create workout plan
        workout_plan_data = {
            "name": "Strength Building Program",
            "description": "4-week strength program",
            "client_id": client_user.id,
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=28)).isoformat()
        }
        
        response = client.post(
            "/api/workouts/plans",
            json=workout_plan_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 201
        workout_plan = response.json()
        workout_plan_id = workout_plan["id"]
        
        # 3. Create workout session
        session_data = {
            "name": "Day 1: Upper Body",
            "day_of_week": 0,
            "notes": "Focus on chest and shoulders"
        }
        
        response = client.post(
            f"/api/workouts/plans/{workout_plan_id}/sessions",
            json=session_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 201
        session = response.json()
        session_id = session["id"]
        
        # 4. Add exercises to session
        workout_exercises_data = [
            {
                "exercise_id": exercise_ids[0],
                "order": 1,
                "sets": 3,
                "reps": "8-12",
                "rest_time": 90,
                "notes": "Focus on form"
            },
            {
                "exercise_id": exercise_ids[1],
                "order": 2,
                "sets": 3,
                "reps": "10-15",
                "rest_time": 120,
                "notes": "Keep chest up"
            }
        ]
        
        workout_exercise_ids = []
        for exercise_data in workout_exercises_data:
            response = client.post(
                f"/api/workouts/sessions/{session_id}/exercises",
                json=exercise_data,
                headers={"Authorization": f"Bearer {trainer_token}"}
            )
            assert response.status_code == 201
            workout_exercise_ids.append(response.json()["id"])
        
        # 5. Client completes exercises
        completions_data = [
            {
                "workout_exercise_id": workout_exercise_ids[0],
                "actual_sets": 3,
                "actual_reps": "10",
                "weight_used": "135lbs",
                "difficulty_rating": 3,
                "notes": "Felt good, maintained form"
            },
            {
                "workout_exercise_id": workout_exercise_ids[1],
                "actual_sets": 3,
                "actual_reps": "12",
                "weight_used": "185lbs",
                "difficulty_rating": 4,
                "notes": "Challenging but doable"
            }
        ]
        
        for completion_data in completions_data:
            response = client.post(
                "/api/workouts/completions",
                json=completion_data,
                headers={"Authorization": f"Bearer {client_token}"}
            )
            assert response.status_code == 201
        
        # 6. Get workout summary
        response = client.get(
            f"/api/workouts/plans/{workout_plan_id}/summary",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 200
        summary = response.json()
        assert summary["total_sessions"] == 1
        assert summary["total_exercises"] == 2
        assert summary["completed_exercises"] == 2
        assert summary["completion_rate"] == 100.0
        
        # 7. Get exercise progress
        response = client.get(
            f"/api/workouts/exercises/{exercise_ids[0]}/progress",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        progress = response.json()
        assert progress["total_completions"] == 1
        assert progress["average_sets"] == 3.0

class TestCompleteMealPlanWorkflow:
    """Test complete meal plan management workflow"""
    
    def test_complete_meal_plan_workflow(self, trainer_token: str, client_token: str, client_user: User):
        """Test complete meal plan creation and tracking workflow"""
        
        # 1. Create meal plan
        meal_plan_data = {
            "name": "Weight Loss Meal Plan",
            "description": "4-week weight loss plan",
            "client_id": client_user.id,
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=28)).isoformat(),
            "protein_goal": 150.0,
            "carbs_goal": 200.0,
            "fats_goal": 60.0,
            "calories_goal": 2000.0
        }
        
        response = client.post(
            "/api/meal-plans/",
            json=meal_plan_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 201
        meal_plan = response.json()
        meal_plan_id = meal_plan["id"]
        
        # 2. Add meal entry
        meal_entry_data = {
            "meal_type": "breakfast",
            "day_of_week": 0,
            "notes": "Start the day with protein"
        }
        
        response = client.post(
            f"/api/meal-plans/{meal_plan_id}/meals",
            json=meal_entry_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 201
        meal_entry = response.json()
        meal_entry_id = meal_entry["id"]
        
        # 3. Add meal components
        components_data = [
            {
                "component_type": "protein",
                "name": "Eggs",
                "quantity": 2.0,
                "unit": "whole",
                "calories": 140.0,
                "protein": 12.0,
                "carbs": 1.0,
                "fats": 10.0
            },
            {
                "component_type": "carbs",
                "name": "Oatmeal",
                "quantity": 0.5,
                "unit": "cup",
                "calories": 150.0,
                "protein": 5.0,
                "carbs": 27.0,
                "fats": 3.0
            },
            {
                "component_type": "vegetables",
                "name": "Spinach",
                "quantity": 1.0,
                "unit": "cup",
                "calories": 7.0,
                "protein": 1.0,
                "carbs": 1.0,
                "fats": 0.0
            }
        ]
        
        for component_data in components_data:
            response = client.post(
                f"/api/meal-plans/meals/{meal_entry_id}/components",
                json=component_data,
                headers={"Authorization": f"Bearer {trainer_token}"}
            )
            assert response.status_code == 201
        
        # 4. Client uploads meal photo
        image_content = b"fake meal photo content"
        files = {
            "photo": ("breakfast_photo.jpg", io.BytesIO(image_content), "image/jpeg")
        }
        
        response = client.post(
            f"/api/meal-plans/meals/{meal_entry_id}/uploads",
            files=files,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 201
        upload = response.json()
        upload_id = upload["id"]
        
        # 5. Trainer approves photo
        response = client.put(
            f"/api/meal-plans/uploads/{upload_id}/approve",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 200
        
        # 6. Get meal plan analytics
        response = client.get(
            f"/api/meal-plans/analytics/{meal_plan_id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 200
        analytics = response.json()
        assert analytics["meal_plan_id"] == meal_plan_id
        assert analytics["total_meals"] == 1
        assert analytics["total_components"] == 3

class TestCompleteNutritionWorkflow:
    """Test complete nutrition tracking workflow"""
    
    def test_complete_nutrition_workflow(self, trainer_token: str, client_token: str, client_user: User):
        """Test complete nutrition tracking workflow"""
        
        # 1. Create nutrition entry
        nutrition_data = {
            "date": datetime.now().date().isoformat(),
            "weight": 75.5,
            "body_fat_percentage": 15.0,
            "muscle_mass": 60.0,
            "water_percentage": 55.0,
            "notes": "Weekly check-in"
        }
        
        response = client.post(
            "/api/nutrition/entries",
            json=nutrition_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 201
        nutrition_entry = response.json()
        nutrition_id = nutrition_entry["id"]
        
        # 2. Get nutrition entries
        response = client.get(
            "/api/nutrition/entries",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        entries = response.json()
        assert len(entries) == 1
        assert entries[0]["weight"] == 75.5
        
        # 3. Update nutrition entry
        update_data = {
            "weight": 75.2,
            "notes": "Updated weekly check-in"
        }
        
        response = client.put(
            f"/api/nutrition/entries/{nutrition_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        updated_entry = response.json()
        assert updated_entry["weight"] == 75.2
        
        # 4. Get nutrition analytics
        response = client.get(
            "/api/nutrition/analytics/daily",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        analytics = response.json()
        assert "entries" in analytics
        assert "summary" in analytics

class TestCompleteProgressWorkflow:
    """Test complete progress tracking workflow"""
    
    def test_complete_progress_workflow(self, trainer_token: str, client_token: str, client_user: User):
        """Test complete progress tracking workflow"""
        
        # 1. Create progress entry
        progress_data = {
            "date": datetime.now().date().isoformat(),
            "weight": 75.5,
            "body_fat_percentage": 15.0,
            "muscle_mass": 60.0,
            "water_percentage": 55.0,
            "notes": "Weekly progress check"
        }
        
        response = client.post(
            "/api/progress/entries",
            json=progress_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 201
        progress_entry = response.json()
        progress_id = progress_entry["id"]
        
        # 2. Get progress entries
        response = client.get(
            "/api/progress/entries",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        entries = response.json()
        assert len(entries) == 1
        assert entries[0]["weight"] == 75.5
        
        # 3. Update progress entry
        update_data = {
            "weight": 75.2,
            "notes": "Updated progress check"
        }
        
        response = client.put(
            f"/api/progress/entries/{progress_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        updated_entry = response.json()
        assert updated_entry["weight"] == 75.2
        
        # 4. Get progress analytics
        response = client.get(
            "/api/progress/analytics",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        analytics = response.json()
        assert "entries" in analytics
        assert "trends" in analytics

class TestCompleteFileManagementWorkflow:
    """Test complete file management workflow"""
    
    def test_complete_file_management_workflow(self, trainer_token: str, client_token: str):
        """Test complete file upload and management workflow"""
        
        # 1. Upload file
        file_content = b"test file content"
        files = {
            "file": ("test_document.pdf", io.BytesIO(file_content), "application/pdf")
        }
        
        response = client.post(
            "/api/files/upload",
            files=files,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 201
        file_upload = response.json()
        file_id = file_upload["id"]
        
        # 2. Get file details
        response = client.get(
            f"/api/files/{file_id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 200
        file_details = response.json()
        assert file_details["filename"] == "test_document.pdf"
        assert file_details["file_type"] == "application/pdf"
        
        # 3. Get all files
        response = client.get(
            "/api/files/files",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 200
        files_list = response.json()
        assert len(files_list) == 1
        assert files_list[0]["filename"] == "test_document.pdf"
        
        # 4. Download file
        response = client.get(
            f"/api/files/{file_id}/download",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        
        # 5. Delete file
        response = client.delete(
            f"/api/files/{file_id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 204

class TestCrossSystemIntegration:
    """Test integration between different systems"""
    
    def test_workout_and_nutrition_integration(self, trainer_token: str, client_token: str, client_user: User):
        """Test integration between workout and nutrition systems"""
        
        # 1. Create workout plan
        workout_plan_data = {
            "name": "Integrated Program",
            "client_id": client_user.id,
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=7)).isoformat()
        }
        
        response = client.post(
            "/api/workouts/plans",
            json=workout_plan_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 201
        workout_plan = response.json()
        
        # 2. Create meal plan
        meal_plan_data = {
            "name": "Integrated Nutrition",
            "client_id": client_user.id,
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=7)).isoformat(),
            "protein_goal": 150.0,
            "carbs_goal": 200.0,
            "fats_goal": 60.0,
            "calories_goal": 2000.0
        }
        
        response = client.post(
            "/api/meal-plans/",
            json=meal_plan_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 201
        meal_plan = response.json()
        
        # 3. Create progress entry
        progress_data = {
            "date": datetime.now().date().isoformat(),
            "weight": 75.5,
            "body_fat_percentage": 15.0,
            "notes": "Integrated tracking"
        }
        
        response = client.post(
            "/api/progress/entries",
            json=progress_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 201
        
        # 4. Verify all systems work together
        # Get workout plans
        response = client.get(
            "/api/workouts/plans",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 200
        workout_plans = response.json()
        assert len(workout_plans) == 1
        
        # Get meal plans
        response = client.get(
            "/api/meal-plans/",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 200
        meal_plans = response.json()
        assert len(meal_plans) == 1
        
        # Get progress entries
        response = client.get(
            "/api/progress/entries",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        progress_entries = response.json()
        assert len(progress_entries) == 1

class TestUserManagementIntegration:
    """Test user management integration with other systems"""
    
    def test_user_management_with_systems(self, trainer_token: str, client_token: str, client_user: User, db_session: Session):
        """Test user management integration with workout and nutrition systems"""
        
        # 1. Create workout plan for client
        workout_plan_data = {
            "name": "Client Workout Plan",
            "client_id": client_user.id,
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=7)).isoformat()
        }
        
        response = client.post(
            "/api/workouts/plans",
            json=workout_plan_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 201
        
        # 2. Create meal plan for client
        meal_plan_data = {
            "name": "Client Meal Plan",
            "client_id": client_user.id,
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=7)).isoformat(),
            "protein_goal": 150.0,
            "carbs_goal": 200.0,
            "fats_goal": 60.0,
            "calories_goal": 2000.0
        }
        
        response = client.post(
            "/api/meal-plans/",
            json=meal_plan_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 201
        
        # 3. Get user details
        response = client.get(
            f"/api/users/{client_user.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 200
        user_details = response.json()
        assert user_details["id"] == client_user.id
        assert user_details["email"] == client_user.email
        
        # 4. Update user profile
        update_data = {
            "full_name": "Updated Client Name",
            "phone": "123-456-7890"
        }
        
        response = client.put(
            f"/api/users/{client_user.id}",
            json=update_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 200
        updated_user = response.json()
        assert updated_user["full_name"] == "Updated Client Name"
        assert updated_user["phone"] == "123-456-7890"

class TestErrorHandlingAndEdgeCases:
    """Test error handling and edge cases across systems"""
    
    def test_invalid_token_handling(self):
        """Test handling of invalid tokens across all endpoints"""
        invalid_token = "invalid.token.here"
        
        # Test workout endpoints
        response = client.get(
            "/api/workouts/exercises",
            headers={"Authorization": f"Bearer {invalid_token}"}
        )
        assert response.status_code == 401
        
        # Test meal plan endpoints
        response = client.get(
            "/api/meal-plans/",
            headers={"Authorization": f"Bearer {invalid_token}"}
        )
        assert response.status_code == 401
        
        # Test nutrition endpoints
        response = client.get(
            "/api/nutrition/entries",
            headers={"Authorization": f"Bearer {invalid_token}"}
        )
        assert response.status_code == 401
        
        # Test progress endpoints
        response = client.get(
            "/api/progress/entries",
            headers={"Authorization": f"Bearer {invalid_token}"}
        )
        assert response.status_code == 401
        
        # Test file endpoints
        response = client.get(
            "/api/files/files",
            headers={"Authorization": f"Bearer {invalid_token}"}
        )
        assert response.status_code == 401
    
    def test_missing_required_fields(self, trainer_token: str, client_user: User):
        """Test handling of missing required fields"""
        
        # Test workout plan creation with missing fields
        incomplete_workout_data = {
            "name": "Incomplete Plan"
            # Missing client_id, start_date, end_date
        }
        
        response = client.post(
            "/api/workouts/plans",
            json=incomplete_workout_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 422
        
        # Test meal plan creation with missing fields
        incomplete_meal_data = {
            "name": "Incomplete Meal Plan"
            # Missing client_id, macronutrient goals
        }
        
        response = client.post(
            "/api/meal-plans/",
            json=incomplete_meal_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 422
    
    def test_nonexistent_resource_access(self, trainer_token: str):
        """Test accessing non-existent resources"""
        
        # Test non-existent workout plan
        response = client.get(
            "/api/workouts/plans/999",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 404
        
        # Test non-existent meal plan
        response = client.get(
            "/api/meal-plans/999",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 404
        
        # Test non-existent user
        response = client.get(
            "/api/users/999",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 404
    
    def test_permission_violations(self, client_token: str, client_user: User):
        """Test permission violations across systems"""
        
        # Client trying to create workout plan
        workout_data = {
            "name": "Client Created Plan",
            "client_id": client_user.id
        }
        
        response = client.post(
            "/api/workouts/plans",
            json=workout_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403
        
        # Client trying to create meal plan
        meal_data = {
            "name": "Client Created Meal Plan",
            "client_id": client_user.id
        }
        
        response = client.post(
            "/api/meal-plans/",
            json=meal_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403

class TestPerformanceAndScalability:
    """Test performance and scalability aspects"""
    
    def test_bulk_operations_performance(self, trainer_token: str, client_user: User):
        """Test performance of bulk operations"""
        
        # Create multiple exercises quickly
        exercises_data = []
        for i in range(10):
            exercises_data.append({
                "name": f"Exercise {i}",
                "muscle_group": "chest",
                "equipment_needed": "None"
            })
        
        # Test bulk exercise creation (individual calls)
        start_time = datetime.now()
        for exercise_data in exercises_data:
            response = client.post(
                "/api/workouts/exercises",
                json=exercise_data,
                headers={"Authorization": f"Bearer {trainer_token}"}
            )
            assert response.status_code == 201
        end_time = datetime.now()
        
        # Verify reasonable performance (should complete in under 5 seconds)
        duration = (end_time - start_time).total_seconds()
        assert duration < 5.0
    
    def test_concurrent_access(self, trainer_token: str, client_user: User):
        """Test concurrent access to resources"""
        
        # Create a workout plan
        workout_plan_data = {
            "name": "Concurrent Test Plan",
            "client_id": client_user.id,
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=7)).isoformat()
        }
        
        response = client.post(
            "/api/workouts/plans",
            json=workout_plan_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 201
        workout_plan_id = response.json()["id"]
        
        # Simulate concurrent access (multiple rapid requests)
        for i in range(5):
            response = client.get(
                f"/api/workouts/plans/{workout_plan_id}",
                headers={"Authorization": f"Bearer {trainer_token}"}
            )
            assert response.status_code == 200
            assert response.json()["id"] == workout_plan_id

class TestDataConsistency:
    """Test data consistency across systems"""
    
    def test_data_integrity_across_systems(self, trainer_token: str, client_token: str, client_user: User):
        """Test data integrity across different systems"""
        
        # 1. Create workout plan
        workout_plan_data = {
            "name": "Integrity Test Plan",
            "client_id": client_user.id,
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=7)).isoformat()
        }
        
        response = client.post(
            "/api/workouts/plans",
            json=workout_plan_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 201
        workout_plan_id = response.json()["id"]
        
        # 2. Create meal plan
        meal_plan_data = {
            "name": "Integrity Test Meal Plan",
            "client_id": client_user.id,
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=7)).isoformat(),
            "protein_goal": 150.0,
            "carbs_goal": 200.0,
            "fats_goal": 60.0,
            "calories_goal": 2000.0
        }
        
        response = client.post(
            "/api/meal-plans/",
            json=meal_plan_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 201
        meal_plan_id = response.json()["id"]
        
        # 3. Verify data consistency
        # Both plans should reference the same client
        response = client.get(
            f"/api/workouts/plans/{workout_plan_id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 200
        workout_plan = response.json()
        assert workout_plan["client_id"] == client_user.id
        
        response = client.get(
            f"/api/meal-plans/{meal_plan_id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 200
        meal_plan = response.json()
        assert meal_plan["client_id"] == client_user.id
        
        # 4. Verify user can access their own plans
        response = client.get(
            "/api/workouts/plans",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        client_workout_plans = response.json()
        assert len(client_workout_plans) == 1
        assert client_workout_plans[0]["client_id"] == client_user.id
        
        response = client.get(
            "/api/meal-plans/",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        client_meal_plans = response.json()
        assert len(client_meal_plans) == 1
        assert client_meal_plans[0]["client_id"] == client_user.id 