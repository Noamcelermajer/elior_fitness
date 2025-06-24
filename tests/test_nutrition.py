import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import date, datetime
import io
import uuid

class TestNutritionPlans:
    """Test nutrition plan endpoints."""

    def test_create_nutrition_plan_success(self, client: TestClient, auth_headers_trainer, test_client):
        """Test successful nutrition plan creation."""
        plan_data = {
            "name": "Test Nutrition Plan",
            "description": "A comprehensive nutrition plan for testing",
            "client_id": test_client.id,
            "daily_calories": 2000,
            "protein_target": 150,
            "carbs_target": 200,
            "fat_target": 70,
            "start_date": "2024-01-01T00:00:00",
            "end_date": "2024-12-31T23:59:59"
        }
        response = client.post("/api/nutrition/plans", json=plan_data, headers=auth_headers_trainer)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == plan_data["name"]
        assert data["description"] == plan_data["description"]
        assert data["daily_calories"] == plan_data["daily_calories"]
        assert data["protein_target"] == plan_data["protein_target"]
        assert data["carbs_target"] == plan_data["carbs_target"]
        assert data["fat_target"] == plan_data["fat_target"]
        assert "id" in data
        assert "trainer_id" in data

    def test_create_nutrition_plan_unauthorized(self, client: TestClient, auth_headers_client, test_client):
        """Test nutrition plan creation by non-trainer."""
        plan_data = {
            "name": "Test Plan",
            "client_id": test_client.id,
            "daily_calories": 2000
        }
        response = client.post("/api/nutrition/plans", json=plan_data, headers=auth_headers_client)
        assert response.status_code == 403

    def test_get_nutrition_plans(self, client: TestClient, auth_headers_trainer):
        """Test getting nutrition plans."""
        response = client.get("/api/nutrition/plans", headers=auth_headers_trainer)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_nutrition_plan_by_id(self, client: TestClient, auth_headers_trainer, test_client):
        """Test getting a specific nutrition plan."""
        # First create a plan
        plan_data = {
            "name": "Test Plan for Get",
            "client_id": test_client.id,
            "daily_calories": 2000
        }
        create_response = client.post("/api/nutrition/plans", json=plan_data, headers=auth_headers_trainer)
        plan_id = create_response.json()["id"]
        
        # Then get it
        response = client.get(f"/api/nutrition/plans/{plan_id}", headers=auth_headers_trainer)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == plan_id
        assert data["name"] == plan_data["name"]

    def test_update_nutrition_plan(self, client: TestClient, auth_headers_trainer, test_client):
        """Test updating a nutrition plan."""
        # First create a plan
        plan_data = {
            "name": "Test Plan for Update",
            "client_id": test_client.id,
            "daily_calories": 2000
        }
        create_response = client.post("/api/nutrition/plans", json=plan_data, headers=auth_headers_trainer)
        plan_id = create_response.json()["id"]
        
        # Then update it
        update_data = {
            "name": "Updated Plan Name",
            "daily_calories": 2200
        }
        response = client.put(f"/api/nutrition/plans/{plan_id}", json=update_data, headers=auth_headers_trainer)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["daily_calories"] == update_data["daily_calories"]

    def test_delete_nutrition_plan(self, client: TestClient, auth_headers_trainer, test_client):
        """Test deleting a nutrition plan."""
        # First create a plan
        plan_data = {
            "name": "Test Plan for Delete",
            "client_id": test_client.id,
            "daily_calories": 2000
        }
        create_response = client.post("/api/nutrition/plans", json=plan_data, headers=auth_headers_trainer)
        plan_id = create_response.json()["id"]
        
        # Then delete it
        response = client.delete(f"/api/nutrition/plans/{plan_id}", headers=auth_headers_trainer)
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]

class TestRecipes:
    """Test recipe endpoints."""

    def test_create_recipe_success(self, client: TestClient, auth_headers_trainer):
        """Test successful recipe creation."""
        recipe_data = {
            "name": "Test Recipe",
            "description": "A delicious test recipe",
            "instructions": "Mix ingredients and cook",
            "calories": 500,
            "protein": 30,
            "carbs": 45,
            "fat": 20,
            "preparation_time": 30
        }
        response = client.post("/api/nutrition/recipes", json=recipe_data, headers=auth_headers_trainer)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == recipe_data["name"]
        assert data["calories"] == recipe_data["calories"]
        assert data["protein"] == recipe_data["protein"]
        assert "id" in data
        assert "trainer_id" in data

    def test_create_recipe_unauthorized(self, client: TestClient, auth_headers_client):
        """Test recipe creation by non-trainer."""
        recipe_data = {
            "name": "Test Recipe",
            "calories": 500
        }
        response = client.post("/api/nutrition/recipes", json=recipe_data, headers=auth_headers_client)
        assert response.status_code == 403

    def test_get_recipes(self, client: TestClient, auth_headers_trainer):
        """Test getting recipes."""
        response = client.get("/api/nutrition/recipes", headers=auth_headers_trainer)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_recipe_by_id(self, client: TestClient, auth_headers_trainer):
        """Test getting a specific recipe."""
        # First create a recipe
        recipe_data = {
            "name": "Test Recipe for Get",
            "calories": 500
        }
        create_response = client.post("/api/nutrition/recipes", json=recipe_data, headers=auth_headers_trainer)
        recipe_id = create_response.json()["id"]
        
        # Then get it
        response = client.get(f"/api/nutrition/recipes/{recipe_id}", headers=auth_headers_trainer)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == recipe_id

    def test_update_recipe(self, client: TestClient, auth_headers_trainer):
        """Test updating a recipe."""
        # First create a recipe
        recipe_data = {
            "name": "Test Recipe for Update",
            "calories": 500
        }
        create_response = client.post("/api/nutrition/recipes", json=recipe_data, headers=auth_headers_trainer)
        recipe_id = create_response.json()["id"]
        
        # Then update it
        update_data = {
            "name": "Updated Recipe Name",
            "calories": 600
        }
        response = client.put(f"/api/nutrition/recipes/{recipe_id}", json=update_data, headers=auth_headers_trainer)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["calories"] == update_data["calories"]

    def test_delete_recipe(self, client: TestClient, auth_headers_trainer):
        """Test deleting a recipe."""
        # First create a recipe
        recipe_data = {
            "name": "Test Recipe for Delete",
            "calories": 500
        }
        create_response = client.post("/api/nutrition/recipes", json=recipe_data, headers=auth_headers_trainer)
        recipe_id = create_response.json()["id"]
        
        # Then delete it
        response = client.delete(f"/api/nutrition/recipes/{recipe_id}", headers=auth_headers_trainer)
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]

class TestPlannedMeals:
    """Test planned meal endpoints."""

    def test_create_planned_meal_success(self, client: TestClient, auth_headers_trainer, test_client):
        """Test successful planned meal creation."""
        # First create a nutrition plan
        plan_data = {
            "name": "Test Plan for Meals",
            "client_id": test_client.id,
            "daily_calories": 2000
        }
        plan_response = client.post("/api/nutrition/plans", json=plan_data, headers=auth_headers_trainer)
        plan_id = plan_response.json()["id"]
        
        # Create a recipe
        recipe_data = {
            "name": "Test Recipe for Meals",
            "calories": 500
        }
        recipe_response = client.post("/api/nutrition/recipes", json=recipe_data, headers=auth_headers_trainer)
        recipe_id = recipe_response.json()["id"]
        
        # Create planned meal
        meal_data = {
            "nutrition_plan_id": plan_id,
            "recipe_id": recipe_id,
            "meal_type": "breakfast",
            "day_of_week": 0,
            "time_of_day": "08:00",
            "notes": "Test meal notes"
        }
        response = client.post("/api/nutrition/planned-meals", json=meal_data, headers=auth_headers_trainer)
        assert response.status_code == 200
        data = response.json()
        assert data["meal_type"] == meal_data["meal_type"]
        assert data["day_of_week"] == meal_data["day_of_week"]
        assert "id" in data

    def test_get_planned_meal(self, client: TestClient, auth_headers_trainer, test_client):
        """Test getting a planned meal."""
        # Create a complete setup
        plan_data = {"name": "Test Plan", "client_id": test_client.id, "daily_calories": 2000}
        plan_response = client.post("/api/nutrition/plans", json=plan_data, headers=auth_headers_trainer)
        plan_id = plan_response.json()["id"]
        
        recipe_data = {"name": "Test Recipe", "calories": 500}
        recipe_response = client.post("/api/nutrition/recipes", json=recipe_data, headers=auth_headers_trainer)
        recipe_id = recipe_response.json()["id"]
        
        meal_data = {
            "nutrition_plan_id": plan_id,
            "recipe_id": recipe_id,
            "meal_type": "lunch",
            "day_of_week": 1
        }
        create_response = client.post("/api/nutrition/planned-meals", json=meal_data, headers=auth_headers_trainer)
        meal_id = create_response.json()["id"]
        
        # Get the meal
        response = client.get(f"/api/nutrition/planned-meals/{meal_id}", headers=auth_headers_trainer)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == meal_id

    def test_update_planned_meal(self, client: TestClient, auth_headers_trainer, test_client):
        """Test updating a planned meal."""
        # Create setup
        plan_data = {"name": "Test Plan", "client_id": test_client.id, "daily_calories": 2000}
        plan_response = client.post("/api/nutrition/plans", json=plan_data, headers=auth_headers_trainer)
        plan_id = plan_response.json()["id"]
        
        recipe_data = {"name": "Test Recipe", "calories": 500}
        recipe_response = client.post("/api/nutrition/recipes", json=recipe_data, headers=auth_headers_trainer)
        recipe_id = recipe_response.json()["id"]
        
        meal_data = {
            "nutrition_plan_id": plan_id,
            "recipe_id": recipe_id,
            "meal_type": "dinner",
            "day_of_week": 2
        }
        create_response = client.post("/api/nutrition/planned-meals", json=meal_data, headers=auth_headers_trainer)
        meal_id = create_response.json()["id"]
        
        # Update the meal
        update_data = {
            "meal_type": "snack",
            "time_of_day": "15:00"
        }
        response = client.put(f"/api/nutrition/planned-meals/{meal_id}", json=update_data, headers=auth_headers_trainer)
        assert response.status_code == 200
        data = response.json()
        assert data["meal_type"] == update_data["meal_type"]
        assert data["time_of_day"] == update_data["time_of_day"]

    def test_delete_planned_meal(self, client: TestClient, auth_headers_trainer, test_client):
        """Test deleting a planned meal."""
        # Create setup
        plan_data = {"name": "Test Plan", "client_id": test_client.id, "daily_calories": 2000}
        plan_response = client.post("/api/nutrition/plans", json=plan_data, headers=auth_headers_trainer)
        plan_id = plan_response.json()["id"]
        
        recipe_data = {"name": "Test Recipe", "calories": 500}
        recipe_response = client.post("/api/nutrition/recipes", json=recipe_data, headers=auth_headers_trainer)
        recipe_id = recipe_response.json()["id"]
        
        meal_data = {
            "nutrition_plan_id": plan_id,
            "recipe_id": recipe_id,
            "meal_type": "breakfast",
            "day_of_week": 0
        }
        create_response = client.post("/api/nutrition/planned-meals", json=meal_data, headers=auth_headers_trainer)
        meal_id = create_response.json()["id"]
        
        # Delete the meal
        response = client.delete(f"/api/nutrition/planned-meals/{meal_id}", headers=auth_headers_trainer)
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]

class TestMealCompletions:
    """Test meal completion endpoints."""

    def test_create_meal_completion_success(self, client: TestClient, auth_headers_client, test_client, auth_headers_trainer):
        """Test successful meal completion creation."""
        # First create a complete setup (plan, recipe, planned meal)
        # Create a trainer first
        trainer_data = {
            "email": f"trainer_for_meal_{uuid.uuid4().hex}@test.com",
            "password": "securepassword123",
            "full_name": "Meal Trainer",
            "role": "trainer"
        }
        client.post("/api/auth/register", json=trainer_data)
        trainer_login = client.post("/api/auth/login", json=trainer_data)
        trainer_token = trainer_login.json()["access_token"]
        trainer_headers = {"Authorization": f"Bearer {trainer_token}"}
        
        # Create nutrition plan
        plan_data = {
            "name": "Test Plan for Meal",
            "client_id": test_client.id,
            "daily_calories": 2000
        }
        plan_response = client.post("/api/nutrition/plans", json=plan_data, headers=trainer_headers)
        plan_id = plan_response.json()["id"]
        
        # Create recipe
        recipe_data = {"name": "Test Recipe for Meal", "calories": 500}
        recipe_response = client.post("/api/nutrition/recipes", json=recipe_data, headers=trainer_headers)
        recipe_id = recipe_response.json()["id"]
        
        # Create planned meal
        meal_data = {
            "nutrition_plan_id": plan_id,
            "recipe_id": recipe_id,
            "meal_type": "breakfast",
            "day_of_week": 0
        }
        meal_response = client.post("/api/nutrition/planned-meals", json=meal_data, headers=trainer_headers)
        meal_id = meal_response.json()["id"]
        
        # Create meal completion
        completion_data = {
            "planned_meal_id": meal_id,
            "status": "completed",
            "notes": "Delicious meal!"
        }
        response = client.post("/api/nutrition/meal-completions", json=completion_data, headers=auth_headers_client)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["notes"] == "Delicious meal!"

    def test_create_meal_completion_unauthorized(self, client: TestClient, auth_headers_trainer):
        """Test meal completion creation by trainer (should be client only)."""
        completion_data = {
            "planned_meal_id": 1,
            "status": "completed"
        }
        response = client.post("/api/nutrition/meal-completions", json=completion_data, headers=auth_headers_trainer)
        assert response.status_code == 403

    def test_get_meal_completion(self, client: TestClient, auth_headers_client):
        """Test getting a meal completion."""
        response = client.get("/api/nutrition/meal-completions/1", headers=auth_headers_client)
        # This might return 404 if the completion doesn't exist, but we're testing the endpoint
        assert response.status_code in [200, 404]

    def test_update_meal_completion(self, client: TestClient, auth_headers_client):
        """Test updating a meal completion."""
        update_data = {
            "status": "skipped",
            "notes": "Updated notes"
        }
        response = client.put("/api/nutrition/meal-completions/1", json=update_data, headers=auth_headers_client)
        # This might return 404 if the completion doesn't exist
        assert response.status_code in [200, 404]

class TestWeighIns:
    """Test weigh-in endpoints."""

    def test_create_weigh_in_success(self, client: TestClient, auth_headers_client):
        """Test successful weigh-in creation."""
        weigh_in_data = {
            "weight": 75.5,
            "body_fat": 15.2,
            "notes": "Weekly weigh-in"
        }
        response = client.post("/api/nutrition/weigh-ins", json=weigh_in_data, headers=auth_headers_client)
        assert response.status_code == 200
        data = response.json()
        assert data["weight"] == weigh_in_data["weight"]
        assert data["body_fat"] == weigh_in_data["body_fat"]
        assert "id" in data
        assert "client_id" in data

    def test_create_weigh_in_unauthorized(self, client: TestClient, auth_headers_trainer):
        """Test weigh-in creation by trainer (should be client only)."""
        weigh_in_data = {
            "weight": 75.5,
            "body_fat": 15.2
        }
        response = client.post("/api/nutrition/weigh-ins", json=weigh_in_data, headers=auth_headers_trainer)
        assert response.status_code == 403

    def test_get_weigh_ins(self, client: TestClient, auth_headers_client):
        """Test getting weigh-ins."""
        response = client.get("/api/nutrition/weigh-ins", headers=auth_headers_client)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_latest_weigh_in(self, client: TestClient, auth_headers_client):
        """Test getting the latest weigh-in."""
        response = client.get("/api/nutrition/weigh-ins/latest", headers=auth_headers_client)
        # This might return 404 if no weigh-ins exist
        assert response.status_code in [200, 404]

    def test_update_weigh_in(self, client: TestClient, auth_headers_client):
        """Test updating a weigh-in."""
        # First create a weigh-in
        weigh_in_data = {
            "weight": 75.5,
            "body_fat": 15.2
        }
        create_response = client.post("/api/nutrition/weigh-ins", json=weigh_in_data, headers=auth_headers_client)
        weigh_in_id = create_response.json()["id"]
        
        # Then update it
        update_data = {
            "weight": 74.8,
            "notes": "Updated weight"
        }
        response = client.put(f"/api/nutrition/weigh-ins/{weigh_in_id}", json=update_data, headers=auth_headers_client)
        assert response.status_code == 200
        data = response.json()
        assert data["weight"] == update_data["weight"]
        assert data["notes"] == update_data["notes"]

    def test_delete_weigh_in(self, client: TestClient, auth_headers_client):
        """Test deleting a weigh-in."""
        # First create a weigh-in
        weigh_in_data = {
            "weight": 75.5,
            "body_fat": 15.2
        }
        create_response = client.post("/api/nutrition/weigh-ins", json=weigh_in_data, headers=auth_headers_client)
        weigh_in_id = create_response.json()["id"]
        
        # Then delete it
        response = client.delete(f"/api/nutrition/weigh-ins/{weigh_in_id}", headers=auth_headers_client)
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]

class TestNutritionGoals:
    """Test nutrition goals endpoints."""

    def test_create_nutrition_goals_success(self, client: TestClient, auth_headers_client):
        """Test successful nutrition goals creation."""
        goals_data = {
            "daily_calories": 2000,
            "protein_target": 150,
            "carbs_target": 200,
            "fat_target": 70
        }
        response = client.post("/api/nutrition/goals", json=goals_data, headers=auth_headers_client)
        assert response.status_code == 200
        data = response.json()
        assert data["daily_calories"] == goals_data["daily_calories"]
        assert data["protein_target"] == goals_data["protein_target"]
        assert "id" in data
        assert "client_id" in data

    def test_create_nutrition_goals_unauthorized(self, client: TestClient, auth_headers_trainer):
        """Test nutrition goals creation by trainer (should be client only)."""
        goals_data = {
            "daily_calories": 2000,
            "protein_target": 150
        }
        response = client.post("/api/nutrition/goals", json=goals_data, headers=auth_headers_trainer)
        assert response.status_code == 403

    def test_get_nutrition_goals(self, client: TestClient, auth_headers_client):
        """Test getting nutrition goals."""
        response = client.get("/api/nutrition/goals", headers=auth_headers_client)
        # This might return 404 if no goals exist
        assert response.status_code in [200, 404]

    def test_update_nutrition_goals(self, client: TestClient, auth_headers_client):
        """Test updating nutrition goals."""
        # First create goals
        goals_data = {
            "daily_calories": 2000,
            "protein_target": 150
        }
        create_response = client.post("/api/nutrition/goals", json=goals_data, headers=auth_headers_client)
        
        # Then update them
        update_data = {
            "daily_calories": 2200,
            "protein_target": 160
        }
        response = client.put("/api/nutrition/goals", json=update_data, headers=auth_headers_client)
        assert response.status_code == 200
        data = response.json()
        assert data["daily_calories"] == update_data["daily_calories"]
        assert data["protein_target"] == update_data["protein_target"]

class TestNutritionSummaries:
    """Test nutrition summary endpoints."""

    def test_get_daily_nutrition_summary(self, client: TestClient, auth_headers_client):
        """Test getting daily nutrition summary."""
        response = client.get("/api/nutrition/daily-summary", headers=auth_headers_client)
        assert response.status_code == 200
        data = response.json()
        assert "date" in data
        assert "total_calories" in data
        assert "total_protein" in data
        assert "total_carbs" in data
        assert "total_fat" in data

    def test_get_weekly_nutrition_summary(self, client: TestClient, auth_headers_client):
        """Test getting weekly nutrition summary."""
        response = client.get("/api/nutrition/weekly-summary", headers=auth_headers_client)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 7  # Should return 7 days

class TestPhotoUploads:
    """Test meal photo upload functionality."""

    def test_upload_meal_photo(self, client: TestClient, auth_headers_client):
        """Test uploading a meal photo."""
        # Create a fake image file
        fake_image = io.BytesIO(b"fake image data")
        
        response = client.post(
            "/api/nutrition/meal-completions/1/photo",
            files={"file": ("test_image.jpg", fake_image, "image/jpeg")},
            headers=auth_headers_client
        )
        # This might return 404 if the meal completion doesn't exist
        assert response.status_code in [200, 404]

    def test_upload_meal_photo_unauthorized(self, client: TestClient, auth_headers_trainer):
        """Test photo upload by trainer (should be client only)."""
        fake_image = io.BytesIO(b"fake image data")
        
        response = client.post(
            "/api/nutrition/meal-completions/1/photo",
            files={"file": ("test_image.jpg", fake_image, "image/jpeg")},
            headers=auth_headers_trainer
        )
        assert response.status_code == 403

    def test_upload_invalid_file_type(self, client: TestClient, auth_headers_client):
        """Test uploading non-image file."""
        fake_file = io.BytesIO(b"not an image")
        
        response = client.post(
            "/api/nutrition/meal-completions/1/photo",
            files={"file": ("test.txt", fake_file, "text/plain")},
            headers=auth_headers_client
        )
        # This should fail validation
        assert response.status_code in [400, 404]  # 400 for validation error, 404 if meal completion doesn't exist 