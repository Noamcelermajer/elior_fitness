import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json

from app.main import app
from app.database import get_db, engine, Base
from app.models.user import User
from app.models.nutrition import NutritionEntry
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
        hashed_password=get_password_hash("trainerpass123"),
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
def sample_nutrition_entries(db_session: Session, client_user: User):
    """Create sample nutrition entries for testing"""
    entries = [
        NutritionEntry(
            client_id=client_user.id,
            date=datetime.now().date(),
            weight=75.5,
            body_fat_percentage=15.0,
            muscle_mass=60.0,
            water_percentage=55.0,
            notes="Weekly check-in"
        ),
        NutritionEntry(
            client_id=client_user.id,
            date=(datetime.now() - timedelta(days=7)).date(),
            weight=76.0,
            body_fat_percentage=15.5,
            muscle_mass=59.5,
            water_percentage=54.5,
            notes="Previous week"
        ),
        NutritionEntry(
            client_id=client_user.id,
            date=(datetime.now() - timedelta(days=14)).date(),
            weight=76.5,
            body_fat_percentage=16.0,
            muscle_mass=59.0,
            water_percentage=54.0,
            notes="Two weeks ago"
        )
    ]
    
    for entry in entries:
        db_session.add(entry)
    db_session.commit()
    
    for entry in entries:
        db_session.refresh(entry)
    
    return entries

class TestNutritionEntryCRUD:
    """Test nutrition entry CRUD operations"""
    
    def test_create_nutrition_entry_success(self, client_token: str, client_user: User):
        """Test successful nutrition entry creation"""
        nutrition_data = {
            "date": datetime.now().date().isoformat(),
            "weight": 75.0,
            "body_fat_percentage": 14.5,
            "muscle_mass": 61.0,
            "water_percentage": 56.0,
            "notes": "Today's check-in"
        }
        
        response = client.post(
            "/api/nutrition/entries",
            json=nutrition_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["weight"] == 75.0
        assert data["body_fat_percentage"] == 14.5
        assert data["muscle_mass"] == 61.0
        assert data["water_percentage"] == 56.0
        assert data["notes"] == "Today's check-in"
        assert "id" in data
    
    def test_create_nutrition_entry_unauthorized(self, client_user: User):
        """Test nutrition entry creation without authentication"""
        nutrition_data = {
            "date": datetime.now().date().isoformat(),
            "weight": 75.0
        }
        
        response = client.post("/api/nutrition/entries", json=nutrition_data)
        assert response.status_code == 401
    
    def test_create_nutrition_entry_trainer_forbidden(self, trainer_token: str, client_user: User):
        """Test that trainers cannot create nutrition entries for clients"""
        nutrition_data = {
            "date": datetime.now().date().isoformat(),
            "weight": 75.0,
            "client_id": client_user.id
        }
        
        response = client.post(
            "/api/nutrition/entries",
            json=nutrition_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 403
    
    def test_create_nutrition_entry_invalid_data(self, client_token: str):
        """Test nutrition entry creation with invalid data"""
        invalid_data = {
            "date": "invalid-date",
            "weight": -10.0,  # Invalid negative weight
            "body_fat_percentage": 150.0,  # Invalid percentage > 100
            "muscle_mass": -5.0,  # Invalid negative mass
            "water_percentage": 200.0  # Invalid percentage > 100
        }
        
        response = client.post(
            "/api/nutrition/entries",
            json=invalid_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 422
    
    def test_create_nutrition_entry_missing_required_fields(self, client_token: str):
        """Test nutrition entry creation with missing required fields"""
        incomplete_data = {
            "date": datetime.now().date().isoformat()
            # Missing weight
        }
        
        response = client.post(
            "/api/nutrition/entries",
            json=incomplete_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 422
    
    def test_get_nutrition_entries_success(self, client_token: str, sample_nutrition_entries):
        """Test getting nutrition entries"""
        response = client.get(
            "/api/nutrition/entries",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        assert all(entry["weight"] > 0 for entry in data)
    
    def test_get_nutrition_entries_unauthorized(self):
        """Test getting nutrition entries without authentication"""
        response = client.get("/api/nutrition/entries")
        assert response.status_code == 401
    
    def test_get_nutrition_entries_with_filtering(self, client_token: str, sample_nutrition_entries):
        """Test getting nutrition entries with filtering"""
        # Filter by date range
        start_date = (datetime.now() - timedelta(days=10)).date().isoformat()
        end_date = datetime.now().date().isoformat()
        
        response = client.get(
            f"/api/nutrition/entries?start_date={start_date}&end_date={end_date}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2  # Should get entries from last 10 days
        
        # Filter by weight range
        response = client.get(
            "/api/nutrition/entries?min_weight=75.0&max_weight=76.0",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2  # Should get entries with weight in range
    
    def test_get_nutrition_entry_by_id_success(self, client_token: str, sample_nutrition_entries):
        """Test getting specific nutrition entry"""
        entry_id = sample_nutrition_entries[0].id
        
        response = client.get(
            f"/api/nutrition/entries/{entry_id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == entry_id
        assert data["weight"] == 75.5
        assert data["body_fat_percentage"] == 15.0
    
    def test_get_nutrition_entry_not_found(self, client_token: str):
        """Test getting non-existent nutrition entry"""
        response = client.get(
            "/api/nutrition/entries/999",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 404
    
    def test_get_nutrition_entry_unauthorized(self, sample_nutrition_entries):
        """Test getting nutrition entry without authentication"""
        entry_id = sample_nutrition_entries[0].id
        
        response = client.get(f"/api/nutrition/entries/{entry_id}")
        assert response.status_code == 401
    
    def test_update_nutrition_entry_success(self, client_token: str, sample_nutrition_entries):
        """Test updating nutrition entry"""
        entry_id = sample_nutrition_entries[0].id
        update_data = {
            "weight": 74.5,
            "body_fat_percentage": 14.8,
            "notes": "Updated check-in"
        }
        
        response = client.put(
            f"/api/nutrition/entries/{entry_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["weight"] == 74.5
        assert data["body_fat_percentage"] == 14.8
        assert data["notes"] == "Updated check-in"
    
    def test_update_nutrition_entry_not_found(self, client_token: str):
        """Test updating non-existent nutrition entry"""
        update_data = {"weight": 75.0}
        
        response = client.put(
            "/api/nutrition/entries/999",
            json=update_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 404
    
    def test_update_nutrition_entry_unauthorized(self, sample_nutrition_entries):
        """Test updating nutrition entry without authentication"""
        entry_id = sample_nutrition_entries[0].id
        update_data = {"weight": 75.0}
        
        response = client.put(f"/api/nutrition/entries/{entry_id}", json=update_data)
        assert response.status_code == 401
    
    def test_update_nutrition_entry_invalid_data(self, client_token: str, sample_nutrition_entries):
        """Test updating nutrition entry with invalid data"""
        entry_id = sample_nutrition_entries[0].id
        invalid_data = {
            "weight": -5.0,  # Invalid negative weight
            "body_fat_percentage": 150.0  # Invalid percentage > 100
        }
        
        response = client.put(
            f"/api/nutrition/entries/{entry_id}",
            json=invalid_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 422
    
    def test_delete_nutrition_entry_success(self, client_token: str, sample_nutrition_entries):
        """Test deleting nutrition entry"""
        entry_id = sample_nutrition_entries[0].id
        
        response = client.delete(
            f"/api/nutrition/entries/{entry_id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 204
        
        # Verify entry is deleted
        response = client.get(
            f"/api/nutrition/entries/{entry_id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 404
    
    def test_delete_nutrition_entry_not_found(self, client_token: str):
        """Test deleting non-existent nutrition entry"""
        response = client.delete(
            "/api/nutrition/entries/999",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 404
    
    def test_delete_nutrition_entry_unauthorized(self, sample_nutrition_entries):
        """Test deleting nutrition entry without authentication"""
        entry_id = sample_nutrition_entries[0].id
        
        response = client.delete(f"/api/nutrition/entries/{entry_id}")
        assert response.status_code == 401

class TestNutritionAnalytics:
    """Test nutrition analytics endpoints"""
    
    def test_get_daily_analytics_success(self, client_token: str, sample_nutrition_entries):
        """Test getting daily nutrition analytics"""
        response = client.get(
            "/api/nutrition/analytics/daily",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "entries" in data
        assert "summary" in data
        assert len(data["entries"]) == 3
        assert "average_weight" in data["summary"]
        assert "weight_trend" in data["summary"]
    
    def test_get_daily_analytics_unauthorized(self):
        """Test getting daily analytics without authentication"""
        response = client.get("/api/nutrition/analytics/daily")
        assert response.status_code == 401
    
    def test_get_daily_analytics_with_date_range(self, client_token: str, sample_nutrition_entries):
        """Test getting daily analytics with date range"""
        start_date = (datetime.now() - timedelta(days=10)).date().isoformat()
        end_date = datetime.now().date().isoformat()
        
        response = client.get(
            f"/api/nutrition/analytics/daily?start_date={start_date}&end_date={end_date}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["entries"]) == 2  # Should get entries from last 10 days
    
    def test_get_weekly_analytics_success(self, client_token: str, sample_nutrition_entries):
        """Test getting weekly nutrition analytics"""
        response = client.get(
            "/api/nutrition/analytics/weekly",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "weekly_summary" in data
        assert "trends" in data
        assert "goals" in data
    
    def test_get_weekly_analytics_unauthorized(self):
        """Test getting weekly analytics without authentication"""
        response = client.get("/api/nutrition/analytics/weekly")
        assert response.status_code == 401
    
    def test_get_weekly_analytics_with_weeks(self, client_token: str, sample_nutrition_entries):
        """Test getting weekly analytics with specific number of weeks"""
        response = client.get(
            "/api/nutrition/analytics/weekly?weeks=4",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "weekly_summary" in data
    
    def test_analytics_empty_data(self, client_token: str):
        """Test analytics with no nutrition entries"""
        response = client.get(
            "/api/nutrition/analytics/daily",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["entries"]) == 0
        assert data["summary"]["average_weight"] == 0.0

class TestNutritionGoals:
    """Test nutrition goals functionality"""
    
    def test_set_nutrition_goals(self, client_token: str):
        """Test setting nutrition goals"""
        goals_data = {
            "target_weight": 70.0,
            "target_body_fat": 12.0,
            "target_muscle_mass": 65.0,
            "target_water_percentage": 60.0,
            "notes": "Weight loss goals"
        }
        
        response = client.post(
            "/api/nutrition/goals",
            json=goals_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["target_weight"] == 70.0
        assert data["target_body_fat"] == 12.0
        assert data["notes"] == "Weight loss goals"
    
    def test_get_nutrition_goals(self, client_token: str):
        """Test getting nutrition goals"""
        response = client.get(
            "/api/nutrition/goals",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "current_goals" in data
        assert "progress" in data
    
    def test_update_nutrition_goals(self, client_token: str):
        """Test updating nutrition goals"""
        # First set goals
        goals_data = {
            "target_weight": 70.0,
            "target_body_fat": 12.0
        }
        
        response = client.post(
            "/api/nutrition/goals",
            json=goals_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 201
        goals_id = response.json()["id"]
        
        # Update goals
        update_data = {
            "target_weight": 68.0,
            "target_body_fat": 10.0,
            "notes": "Updated goals"
        }
        
        response = client.put(
            f"/api/nutrition/goals/{goals_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["target_weight"] == 68.0
        assert data["target_body_fat"] == 10.0
        assert data["notes"] == "Updated goals"

class TestNutritionDataValidation:
    """Test nutrition data validation"""
    
    def test_weight_validation(self, client_token: str):
        """Test weight field validation"""
        # Test negative weight
        invalid_data = {
            "date": datetime.now().date().isoformat(),
            "weight": -10.0
        }
        
        response = client.post(
            "/api/nutrition/entries",
            json=invalid_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 422
        
        # Test zero weight
        invalid_data["weight"] = 0.0
        response = client.post(
            "/api/nutrition/entries",
            json=invalid_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 422
        
        # Test extremely high weight
        invalid_data["weight"] = 1000.0
        response = client.post(
            "/api/nutrition/entries",
            json=invalid_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 422
    
    def test_percentage_validation(self, client_token: str):
        """Test percentage field validation"""
        # Test body fat percentage > 100
        invalid_data = {
            "date": datetime.now().date().isoformat(),
            "weight": 75.0,
            "body_fat_percentage": 150.0
        }
        
        response = client.post(
            "/api/nutrition/entries",
            json=invalid_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 422
        
        # Test negative percentage
        invalid_data["body_fat_percentage"] = -5.0
        response = client.post(
            "/api/nutrition/entries",
            json=invalid_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 422
    
    def test_date_validation(self, client_token: str):
        """Test date field validation"""
        # Test future date
        future_date = (datetime.now() + timedelta(days=1)).date().isoformat()
        invalid_data = {
            "date": future_date,
            "weight": 75.0
        }
        
        response = client.post(
            "/api/nutrition/entries",
            json=invalid_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 422
        
        # Test invalid date format
        invalid_data["date"] = "invalid-date"
        response = client.post(
            "/api/nutrition/entries",
            json=invalid_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 422

class TestNutritionPermissions:
    """Test nutrition permissions and access control"""
    
    def test_client_access_to_own_entries(self, client_token: str, sample_nutrition_entries):
        """Test client can access their own nutrition entries"""
        response = client.get(
            "/api/nutrition/entries",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
    
    def test_trainer_access_to_client_entries(self, trainer_token: str, sample_nutrition_entries, client_user: User):
        """Test trainer can access client nutrition entries"""
        response = client.get(
            f"/api/nutrition/entries?client_id={client_user.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
    
    def test_client_access_to_other_client_entries_forbidden(self, client_token: str, another_client: User, db_session: Session):
        """Test client cannot access other client's nutrition entries"""
        # Create another client's entry
        other_entry = NutritionEntry(
            client_id=another_client.id,
            date=datetime.now().date(),
            weight=80.0
        )
        db_session.add(other_entry)
        db_session.commit()
        
        response = client.get(
            f"/api/nutrition/entries?client_id={another_client.id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403
    
    def test_unauthorized_access_to_entries(self, sample_nutrition_entries):
        """Test unauthorized access to nutrition entries"""
        response = client.get("/api/nutrition/entries")
        assert response.status_code == 401

class TestNutritionTrends:
    """Test nutrition trends and progress tracking"""
    
    def test_weight_trend_calculation(self, client_token: str, sample_nutrition_entries):
        """Test weight trend calculation"""
        response = client.get(
            "/api/nutrition/analytics/daily",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "weight_trend" in data["summary"]
        # Weight should be decreasing (76.5 -> 76.0 -> 75.5)
        assert data["summary"]["weight_trend"] < 0
    
    def test_body_composition_trends(self, client_token: str, sample_nutrition_entries):
        """Test body composition trend calculations"""
        response = client.get(
            "/api/nutrition/analytics/weekly",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "trends" in data
        assert "body_fat_trend" in data["trends"]
        assert "muscle_mass_trend" in data["trends"]
    
    def test_progress_towards_goals(self, client_token: str, sample_nutrition_entries):
        """Test progress towards nutrition goals"""
        # Set a goal
        goals_data = {
            "target_weight": 70.0,
            "target_body_fat": 10.0
        }
        
        response = client.post(
            "/api/nutrition/goals",
            json=goals_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 201
        
        # Check progress
        response = client.get(
            "/api/nutrition/goals",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "progress" in data
        assert "weight_progress" in data["progress"]
        assert "body_fat_progress" in data["progress"]

class TestNutritionDataExport:
    """Test nutrition data export functionality"""
    
    def test_export_nutrition_data_csv(self, client_token: str, sample_nutrition_entries):
        """Test exporting nutrition data as CSV"""
        response = client.get(
            "/api/nutrition/export/csv",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv"
        content = response.content.decode()
        assert "date,weight,body_fat_percentage" in content
    
    def test_export_nutrition_data_json(self, client_token: str, sample_nutrition_entries):
        """Test exporting nutrition data as JSON"""
        response = client.get(
            "/api/nutrition/export/json",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/json"
        data = response.json()
        assert len(data) == 3
        assert all("date" in entry for entry in data)
        assert all("weight" in entry for entry in data)
    
    def test_export_with_date_range(self, client_token: str, sample_nutrition_entries):
        """Test exporting nutrition data with date range"""
        start_date = (datetime.now() - timedelta(days=10)).date().isoformat()
        end_date = datetime.now().date().isoformat()
        
        response = client.get(
            f"/api/nutrition/export/csv?start_date={start_date}&end_date={end_date}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        content = response.content.decode()
        # Should only include entries from the date range
        assert content.count("2024") == 2  # Assuming 2 entries in range 