import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json
import io

from app.main import app
from app.database import get_db, engine, Base
from app.models.user import User
from app.models.nutrition import MealPlan, MealEntry, MealComponent, MealUpload
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

@pytest.fixture
def sample_meal_plan(db_session: Session, trainer_user: User, client_user: User):
    """Create a sample meal plan"""
    meal_plan = MealPlan(
        name="Weight Loss Meal Plan",
        description="4-week plan for weight loss",
        trainer_id=trainer_user.id,
        client_id=client_user.id,
        start_date=datetime.now(),
        end_date=datetime.now() + timedelta(days=28),
        protein_goal=150.0,
        carbs_goal=200.0,
        fats_goal=60.0,
        calories_goal=2000.0
    )
    db_session.add(meal_plan)
    db_session.commit()
    db_session.refresh(meal_plan)
    return meal_plan

@pytest.fixture
def sample_meal_entry(db_session: Session, sample_meal_plan: MealPlan):
    """Create a sample meal entry"""
    meal_entry = MealEntry(
        meal_plan_id=sample_meal_plan.id,
        meal_type="breakfast",
        day_of_week=0,
        notes="Start the day with protein"
    )
    db_session.add(meal_entry)
    db_session.commit()
    db_session.refresh(meal_entry)
    return meal_entry

@pytest.fixture
def sample_meal_components(db_session: Session, sample_meal_entry: MealEntry):
    """Create sample meal components"""
    components = [
        MealComponent(
            meal_entry_id=sample_meal_entry.id,
            component_type="protein",
            name="Eggs",
            quantity=2.0,
            unit="whole",
            calories=140.0,
            protein=12.0,
            carbs=1.0,
            fats=10.0
        ),
        MealComponent(
            meal_entry_id=sample_meal_entry.id,
            component_type="carbs",
            name="Oatmeal",
            quantity=0.5,
            unit="cup",
            calories=150.0,
            protein=5.0,
            carbs=27.0,
            fats=3.0
        ),
        MealComponent(
            meal_entry_id=sample_meal_entry.id,
            component_type="vegetables",
            name="Spinach",
            quantity=1.0,
            unit="cup",
            calories=7.0,
            protein=1.0,
            carbs=1.0,
            fats=0.0
        )
    ]
    
    for component in components:
        db_session.add(component)
    db_session.commit()
    
    for component in components:
        db_session.refresh(component)
    
    return components

class TestMealPlanManagement:
    """Test meal plan management endpoints"""
    
    def test_create_meal_plan_success(self, trainer_token: str, client_user: User):
        """Test successful meal plan creation"""
        meal_plan_data = {
            "name": "Muscle Building Plan",
            "description": "High protein plan for muscle growth",
            "client_id": client_user.id,
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "protein_goal": 180.0,
            "carbs_goal": 250.0,
            "fats_goal": 70.0,
            "calories_goal": 2500.0
        }
        
        response = client.post(
            "/api/meal-plans/",
            json=meal_plan_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Muscle Building Plan"
        assert data["protein_goal"] == 180.0
        assert data["calories_goal"] == 2500.0
        assert "id" in data
    
    def test_create_meal_plan_unauthorized(self, client_user: User):
        """Test meal plan creation without authentication"""
        meal_plan_data = {
            "name": "Test Plan",
            "client_id": client_user.id
        }
        
        response = client.post("/api/meal-plans/", json=meal_plan_data)
        assert response.status_code == 401
    
    def test_create_meal_plan_client_forbidden(self, client_token: str, client_user: User):
        """Test that clients cannot create meal plans"""
        meal_plan_data = {
            "name": "Test Plan",
            "client_id": client_user.id
        }
        
        response = client.post(
            "/api/meal-plans/",
            json=meal_plan_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403
    
    def test_get_meal_plans_trainer(self, trainer_token: str, sample_meal_plan: MealPlan):
        """Test getting meal plans as trainer"""
        response = client.get(
            "/api/meal-plans/",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Weight Loss Meal Plan"
    
    def test_get_meal_plans_client(self, client_token: str, sample_meal_plan: MealPlan):
        """Test getting meal plans as client"""
        response = client.get(
            "/api/meal-plans/",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Weight Loss Meal Plan"
    
    def test_get_meal_plan_by_id(self, trainer_token: str, sample_meal_plan: MealPlan):
        """Test getting specific meal plan"""
        response = client.get(
            f"/api/meal-plans/{sample_meal_plan.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_meal_plan.id
        assert data["name"] == "Weight Loss Meal Plan"
        assert data["protein_goal"] == 150.0
    
    def test_get_meal_plan_not_found(self, trainer_token: str):
        """Test getting non-existent meal plan"""
        response = client.get(
            "/api/meal-plans/999",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 404
    
    def test_update_meal_plan(self, trainer_token: str, sample_meal_plan: MealPlan):
        """Test updating meal plan"""
        update_data = {
            "name": "Updated Weight Loss Plan",
            "protein_goal": 160.0,
            "calories_goal": 2100.0
        }
        
        response = client.put(
            f"/api/meal-plans/{sample_meal_plan.id}",
            json=update_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Weight Loss Plan"
        assert data["protein_goal"] == 160.0
        assert data["calories_goal"] == 2100.0
    
    def test_delete_meal_plan(self, trainer_token: str, sample_meal_plan: MealPlan):
        """Test deleting meal plan"""
        response = client.delete(
            f"/api/meal-plans/{sample_meal_plan.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 204

class TestMealEntryManagement:
    """Test meal entry management endpoints"""
    
    def test_create_meal_entry(self, trainer_token: str, sample_meal_plan: MealPlan):
        """Test creating meal entry"""
        meal_entry_data = {
            "meal_type": "lunch",
            "day_of_week": 1,
            "notes": "Balanced lunch with protein and vegetables"
        }
        
        response = client.post(
            f"/api/meal-plans/{sample_meal_plan.id}/meals",
            json=meal_entry_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["meal_type"] == "lunch"
        assert data["day_of_week"] == 1
        assert "id" in data
    
    def test_get_meals_in_plan(self, trainer_token: str, sample_meal_plan: MealPlan, sample_meal_entry: MealEntry):
        """Test getting meals in a plan"""
        response = client.get(
            f"/api/meal-plans/{sample_meal_plan.id}/meals",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["meal_type"] == "breakfast"
    
    def test_get_meal_entry_by_id(self, trainer_token: str, sample_meal_entry: MealEntry):
        """Test getting specific meal entry"""
        response = client.get(
            f"/api/meal-plans/meals/{sample_meal_entry.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_meal_entry.id
        assert data["meal_type"] == "breakfast"
    
    def test_update_meal_entry(self, trainer_token: str, sample_meal_entry: MealEntry):
        """Test updating meal entry"""
        update_data = {
            "meal_type": "brunch",
            "notes": "Updated meal notes"
        }
        
        response = client.put(
            f"/api/meal-plans/meals/{sample_meal_entry.id}",
            json=update_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["meal_type"] == "brunch"
        assert data["notes"] == "Updated meal notes"
    
    def test_delete_meal_entry(self, trainer_token: str, sample_meal_entry: MealEntry):
        """Test deleting meal entry"""
        response = client.delete(
            f"/api/meal-plans/meals/{sample_meal_entry.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 204

class TestMealComponentManagement:
    """Test meal component management endpoints"""
    
    def test_create_meal_component(self, trainer_token: str, sample_meal_entry: MealEntry):
        """Test creating meal component"""
        component_data = {
            "component_type": "protein",
            "name": "Chicken Breast",
            "quantity": 6.0,
            "unit": "oz",
            "calories": 280.0,
            "protein": 35.0,
            "carbs": 0.0,
            "fats": 6.0
        }
        
        response = client.post(
            f"/api/meal-plans/meals/{sample_meal_entry.id}/components",
            json=component_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["component_type"] == "protein"
        assert data["name"] == "Chicken Breast"
        assert data["protein"] == 35.0
        assert "id" in data
    
    def test_get_meal_components(self, trainer_token: str, sample_meal_entry: MealEntry, sample_meal_components):
        """Test getting meal components"""
        response = client.get(
            f"/api/meal-plans/meals/{sample_meal_entry.id}/components",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        assert any(comp["component_type"] == "protein" for comp in data)
        assert any(comp["component_type"] == "carbs" for comp in data)
        assert any(comp["component_type"] == "vegetables" for comp in data)
    
    def test_get_meal_component_by_id(self, trainer_token: str, sample_meal_components):
        """Test getting specific meal component"""
        component_id = sample_meal_components[0].id
        
        response = client.get(
            f"/api/meal-plans/components/{component_id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == component_id
        assert data["name"] == "Eggs"
        assert data["component_type"] == "protein"
    
    def test_update_meal_component(self, trainer_token: str, sample_meal_components):
        """Test updating meal component"""
        component_id = sample_meal_components[0].id
        update_data = {
            "quantity": 3.0,
            "calories": 210.0,
            "protein": 18.0
        }
        
        response = client.put(
            f"/api/meal-plans/components/{component_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["quantity"] == 3.0
        assert data["calories"] == 210.0
        assert data["protein"] == 18.0
    
    def test_delete_meal_component(self, trainer_token: str, sample_meal_components):
        """Test deleting meal component"""
        component_id = sample_meal_components[0].id
        
        response = client.delete(
            f"/api/meal-plans/components/{component_id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 204

class TestMealUploadManagement:
    """Test meal photo upload management endpoints"""
    
    def test_upload_meal_photo(self, client_token: str, sample_meal_entry: MealEntry):
        """Test uploading meal photo"""
        # Create a mock image file
        image_content = b"fake image content"
        files = {
            "photo": ("meal_photo.jpg", io.BytesIO(image_content), "image/jpeg")
        }
        
        response = client.post(
            f"/api/meal-plans/meals/{sample_meal_entry.id}/uploads",
            files=files,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["meal_entry_id"] == sample_meal_entry.id
        assert data["status"] == "pending"
        assert "id" in data
    
    def test_upload_meal_photo_unauthorized(self, sample_meal_entry: MealEntry):
        """Test uploading meal photo without authentication"""
        image_content = b"fake image content"
        files = {
            "photo": ("meal_photo.jpg", io.BytesIO(image_content), "image/jpeg")
        }
        
        response = client.post(
            f"/api/meal-plans/meals/{sample_meal_entry.id}/uploads",
            files=files
        )
        assert response.status_code == 401
    
    def test_get_meal_uploads(self, client_token: str, sample_meal_entry: MealEntry, db_session: Session):
        """Test getting meal uploads"""
        # Create a meal upload first
        upload = MealUpload(
            meal_entry_id=sample_meal_entry.id,
            photo_path="/uploads/meal_photos/test.jpg",
            status="pending",
            uploaded_by=sample_meal_entry.meal_plan.client_id
        )
        db_session.add(upload)
        db_session.commit()
        db_session.refresh(upload)
        
        response = client.get(
            f"/api/meal-plans/meals/{sample_meal_entry.id}/uploads",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["status"] == "pending"
    
    def test_approve_meal_upload(self, trainer_token: str, sample_meal_entry: MealEntry, db_session: Session):
        """Test approving meal upload"""
        # Create a meal upload first
        upload = MealUpload(
            meal_entry_id=sample_meal_entry.id,
            photo_path="/uploads/meal_photos/test.jpg",
            status="pending",
            uploaded_by=sample_meal_entry.meal_plan.client_id
        )
        db_session.add(upload)
        db_session.commit()
        db_session.refresh(upload)
        
        response = client.put(
            f"/api/meal-plans/uploads/{upload.id}/approve",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "approved"
    
    def test_approve_meal_upload_unauthorized(self, client_token: str, sample_meal_entry: MealEntry, db_session: Session):
        """Test that clients cannot approve meal uploads"""
        # Create a meal upload first
        upload = MealUpload(
            meal_entry_id=sample_meal_entry.id,
            photo_path="/uploads/meal_photos/test.jpg",
            status="pending",
            uploaded_by=sample_meal_entry.meal_plan.client_id
        )
        db_session.add(upload)
        db_session.commit()
        db_session.refresh(upload)
        
        response = client.put(
            f"/api/meal-plans/uploads/{upload.id}/approve",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403

class TestMealPlanAnalytics:
    """Test meal plan analytics endpoints"""
    
    def test_get_meal_plan_analytics(self, trainer_token: str, sample_meal_plan: MealPlan, sample_meal_entry: MealEntry, sample_meal_components):
        """Test getting meal plan analytics"""
        response = client.get(
            f"/api/meal-plans/analytics/{sample_meal_plan.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["meal_plan_id"] == sample_meal_plan.id
        assert "total_meals" in data
        assert "total_components" in data
        assert "macronutrient_summary" in data
        assert "daily_breakdown" in data
    
    def test_get_meal_plan_analytics_not_found(self, trainer_token: str):
        """Test getting analytics for non-existent meal plan"""
        response = client.get(
            "/api/meal-plans/analytics/999",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 404

class TestMealPlanPermissions:
    """Test meal plan permissions and access control"""
    
    def test_client_cannot_create_meal_plans(self, client_token: str, client_user: User):
        """Test that clients cannot create meal plans"""
        meal_plan_data = {
            "name": "Test Plan",
            "client_id": client_user.id
        }
        
        response = client.post(
            "/api/meal-plans/",
            json=meal_plan_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403
    
    def test_client_cannot_add_meals(self, client_token: str, sample_meal_plan: MealPlan):
        """Test that clients cannot add meals to plans"""
        meal_entry_data = {
            "meal_type": "dinner",
            "day_of_week": 2
        }
        
        response = client.post(
            f"/api/meal-plans/{sample_meal_plan.id}/meals",
            json=meal_entry_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403
    
    def test_client_cannot_add_components(self, client_token: str, sample_meal_entry: MealEntry):
        """Test that clients cannot add meal components"""
        component_data = {
            "component_type": "protein",
            "name": "Salmon",
            "quantity": 4.0,
            "unit": "oz"
        }
        
        response = client.post(
            f"/api/meal-plans/meals/{sample_meal_entry.id}/components",
            json=component_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403
    
    def test_access_other_trainer_meal_plans(self, trainer_token: str, db_session: Session, client_user: User):
        """Test that trainers cannot access other trainers' meal plans"""
        # Create another trainer
        other_trainer = User(
            email="other@test.com",
            hashed_password=get_password_hash("password"),
            full_name="Other Trainer",
            is_trainer=True
        )
        db_session.add(other_trainer)
        db_session.commit()
        
        # Create meal plan for other trainer
        meal_plan = MealPlan(
            name="Other Plan",
            trainer_id=other_trainer.id,
            client_id=client_user.id,
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=7)
        )
        db_session.add(meal_plan)
        db_session.commit()
        db_session.refresh(meal_plan)
        
        # Try to access other trainer's meal plan
        response = client.get(
            f"/api/meal-plans/{meal_plan.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 404  # Should not find or return 403

class TestMealPlanValidation:
    """Test meal plan data validation"""
    
    def test_create_meal_plan_invalid_macros(self, trainer_token: str, client_user: User):
        """Test creating meal plan with invalid macronutrient values"""
        meal_plan_data = {
            "name": "Invalid Plan",
            "client_id": client_user.id,
            "protein_goal": -10.0,  # Invalid negative value
            "carbs_goal": 1000.0,   # Unrealistically high
            "fats_goal": 200.0,     # Too high
            "calories_goal": 5000.0  # Too high
        }
        
        response = client.post(
            "/api/meal-plans/",
            json=meal_plan_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 422  # Validation error
    
    def test_create_meal_component_invalid_nutrition(self, trainer_token: str, sample_meal_entry: MealEntry):
        """Test creating meal component with invalid nutrition values"""
        component_data = {
            "component_type": "protein",
            "name": "Invalid Food",
            "quantity": -1.0,  # Invalid negative value
            "unit": "oz",
            "calories": -50.0,  # Invalid negative value
            "protein": 1000.0,  # Unrealistically high
            "carbs": 50.0,
            "fats": 20.0
        }
        
        response = client.post(
            f"/api/meal-plans/meals/{sample_meal_entry.id}/components",
            json=component_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 422  # Validation error
    
    def test_create_meal_entry_invalid_type(self, trainer_token: str, sample_meal_plan: MealPlan):
        """Test creating meal entry with invalid meal type"""
        meal_entry_data = {
            "meal_type": "invalid_meal_type",
            "day_of_week": 0
        }
        
        response = client.post(
            f"/api/meal-plans/{sample_meal_plan.id}/meals",
            json=meal_entry_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 422  # Validation error
    
    def test_create_meal_component_invalid_type(self, trainer_token: str, sample_meal_entry: MealEntry):
        """Test creating meal component with invalid component type"""
        component_data = {
            "component_type": "invalid_type",
            "name": "Test Food",
            "quantity": 1.0,
            "unit": "oz"
        }
        
        response = client.post(
            f"/api/meal-plans/meals/{sample_meal_entry.id}/components",
            json=component_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 422  # Validation error

class TestMealPlanWorkflow:
    """Test complete meal plan workflow"""
    
    def test_complete_meal_plan_workflow(self, trainer_token: str, client_token: str, client_user: User):
        """Test complete meal plan creation and management workflow"""
        # 1. Create meal plan
        meal_plan_data = {
            "name": "Complete Test Plan",
            "description": "Test workflow plan",
            "client_id": client_user.id,
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=7)).isoformat(),
            "protein_goal": 120.0,
            "carbs_goal": 150.0,
            "fats_goal": 50.0,
            "calories_goal": 1800.0
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
            "meal_type": "dinner",
            "day_of_week": 0,
            "notes": "Test dinner"
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
                "name": "Grilled Chicken",
                "quantity": 6.0,
                "unit": "oz",
                "calories": 280.0,
                "protein": 35.0,
                "carbs": 0.0,
                "fats": 6.0
            },
            {
                "component_type": "carbs",
                "name": "Brown Rice",
                "quantity": 0.5,
                "unit": "cup",
                "calories": 110.0,
                "protein": 2.0,
                "carbs": 23.0,
                "fats": 1.0
            }
        ]
        
        for component_data in components_data:
            response = client.post(
                f"/api/meal-plans/meals/{meal_entry_id}/components",
                json=component_data,
                headers={"Authorization": f"Bearer {trainer_token}"}
            )
            assert response.status_code == 201
        
        # 4. Client uploads photo
        image_content = b"fake meal photo content"
        files = {
            "photo": ("dinner_photo.jpg", io.BytesIO(image_content), "image/jpeg")
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
        
        # 6. Get analytics
        response = client.get(
            f"/api/meal-plans/analytics/{meal_plan_id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 200
        analytics = response.json()
        assert analytics["meal_plan_id"] == meal_plan_id
        assert analytics["total_meals"] == 1
        assert analytics["total_components"] == 2
        
        # 7. Clean up
        response = client.delete(
            f"/api/meal-plans/{meal_plan_id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 204 