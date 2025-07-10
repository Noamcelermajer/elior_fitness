import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json
import io

from app.main import app
from app.database import get_db, engine, Base
from app.models.user import User
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
def sample_progress_entries(db_session: Session, client_user: User):
    """Create sample progress entries for testing"""
    entries = [
        ProgressEntry(
            client_id=client_user.id,
            date=datetime.now().date(),
            weight=75.5,
            body_fat_percentage=15.0,
            muscle_mass=60.0,
            water_percentage=55.0,
            chest_circumference=95.0,
            waist_circumference=80.0,
            hip_circumference=95.0,
            bicep_circumference=30.0,
            thigh_circumference=55.0,
            notes="Weekly progress check"
        ),
        ProgressEntry(
            client_id=client_user.id,
            date=(datetime.now() - timedelta(days=7)).date(),
            weight=76.0,
            body_fat_percentage=15.5,
            muscle_mass=59.5,
            water_percentage=54.5,
            chest_circumference=96.0,
            waist_circumference=81.0,
            hip_circumference=96.0,
            bicep_circumference=30.5,
            thigh_circumference=55.5,
            notes="Previous week"
        ),
        ProgressEntry(
            client_id=client_user.id,
            date=(datetime.now() - timedelta(days=14)).date(),
            weight=76.5,
            body_fat_percentage=16.0,
            muscle_mass=59.0,
            water_percentage=54.0,
            chest_circumference=97.0,
            waist_circumference=82.0,
            hip_circumference=97.0,
            bicep_circumference=31.0,
            thigh_circumference=56.0,
            notes="Two weeks ago"
        )
    ]
    
    for entry in entries:
        db_session.add(entry)
    db_session.commit()
    
    for entry in entries:
        db_session.refresh(entry)
    
    return entries

class TestProgressEntryCRUD:
    """Test progress entry CRUD operations"""
    
    def test_create_progress_entry_success(self, client_token: str, client_user: User):
        """Test successful progress entry creation"""
        progress_data = {
            "date": datetime.now().date().isoformat(),
            "weight": 75.0,
            "body_fat_percentage": 14.5,
            "muscle_mass": 61.0,
            "water_percentage": 56.0,
            "chest_circumference": 94.0,
            "waist_circumference": 79.0,
            "hip_circumference": 94.0,
            "bicep_circumference": 29.5,
            "thigh_circumference": 54.5,
            "notes": "Today's progress check"
        }
        
        response = client.post(
            "/api/progress/entries",
            json=progress_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["weight"] == 75.0
        assert data["body_fat_percentage"] == 14.5
        assert data["chest_circumference"] == 94.0
        assert data["waist_circumference"] == 79.0
        assert data["notes"] == "Today's progress check"
        assert "id" in data
    
    def test_create_progress_entry_unauthorized(self, client_user: User):
        """Test progress entry creation without authentication"""
        progress_data = {
            "date": datetime.now().date().isoformat(),
            "weight": 75.0
        }
        
        response = client.post("/api/progress/entries", json=progress_data)
        assert response.status_code == 401
    
    def test_create_progress_entry_trainer_forbidden(self, trainer_token: str, client_user: User):
        """Test that trainers cannot create progress entries for clients"""
        progress_data = {
            "date": datetime.now().date().isoformat(),
            "weight": 75.0,
            "client_id": client_user.id
        }
        
        response = client.post(
            "/api/progress/entries",
            json=progress_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 403
    
    def test_create_progress_entry_invalid_data(self, client_token: str):
        """Test progress entry creation with invalid data"""
        invalid_data = {
            "date": "invalid-date",
            "weight": -10.0,  # Invalid negative weight
            "body_fat_percentage": 150.0,  # Invalid percentage > 100
            "chest_circumference": -5.0,  # Invalid negative measurement
            "waist_circumference": 1000.0  # Unrealistically high
        }
        
        response = client.post(
            "/api/progress/entries",
            json=invalid_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 422
    
    def test_create_progress_entry_missing_required_fields(self, client_token: str):
        """Test progress entry creation with missing required fields"""
        incomplete_data = {
            "date": datetime.now().date().isoformat()
            # Missing weight
        }
        
        response = client.post(
            "/api/progress/entries",
            json=incomplete_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 422
    
    def test_get_progress_entries_success(self, client_token: str, sample_progress_entries):
        """Test getting progress entries"""
        response = client.get(
            "/api/progress/entries",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        assert all(entry["weight"] > 0 for entry in data)
    
    def test_get_progress_entries_unauthorized(self):
        """Test getting progress entries without authentication"""
        response = client.get("/api/progress/entries")
        assert response.status_code == 401
    
    def test_get_progress_entries_with_filtering(self, client_token: str, sample_progress_entries):
        """Test getting progress entries with filtering"""
        # Filter by date range
        start_date = (datetime.now() - timedelta(days=10)).date().isoformat()
        end_date = datetime.now().date().isoformat()
        
        response = client.get(
            f"/api/progress/entries?start_date={start_date}&end_date={end_date}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2  # Should get entries from last 10 days
        
        # Filter by weight range
        response = client.get(
            "/api/progress/entries?min_weight=75.0&max_weight=76.0",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2  # Should get entries with weight in range
    
    def test_get_progress_entry_by_id_success(self, client_token: str, sample_progress_entries):
        """Test getting specific progress entry"""
        entry_id = sample_progress_entries[0].id
        
        response = client.get(
            f"/api/progress/entries/{entry_id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == entry_id
        assert data["weight"] == 75.5
        assert data["body_fat_percentage"] == 15.0
        assert data["chest_circumference"] == 95.0
    
    def test_get_progress_entry_not_found(self, client_token: str):
        """Test getting non-existent progress entry"""
        response = client.get(
            "/api/progress/entries/999",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 404
    
    def test_get_progress_entry_unauthorized(self, sample_progress_entries):
        """Test getting progress entry without authentication"""
        entry_id = sample_progress_entries[0].id
        
        response = client.get(f"/api/progress/entries/{entry_id}")
        assert response.status_code == 401
    
    def test_update_progress_entry_success(self, client_token: str, sample_progress_entries):
        """Test updating progress entry"""
        entry_id = sample_progress_entries[0].id
        update_data = {
            "weight": 74.5,
            "body_fat_percentage": 14.8,
            "chest_circumference": 94.5,
            "notes": "Updated progress check"
        }
        
        response = client.put(
            f"/api/progress/entries/{entry_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["weight"] == 74.5
        assert data["body_fat_percentage"] == 14.8
        assert data["chest_circumference"] == 94.5
        assert data["notes"] == "Updated progress check"
    
    def test_update_progress_entry_not_found(self, client_token: str):
        """Test updating non-existent progress entry"""
        update_data = {"weight": 75.0}
        
        response = client.put(
            "/api/progress/entries/999",
            json=update_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 404
    
    def test_update_progress_entry_unauthorized(self, sample_progress_entries):
        """Test updating progress entry without authentication"""
        entry_id = sample_progress_entries[0].id
        update_data = {"weight": 75.0}
        
        response = client.put(f"/api/progress/entries/{entry_id}", json=update_data)
        assert response.status_code == 401
    
    def test_update_progress_entry_invalid_data(self, client_token: str, sample_progress_entries):
        """Test updating progress entry with invalid data"""
        entry_id = sample_progress_entries[0].id
        invalid_data = {
            "weight": -5.0,  # Invalid negative weight
            "body_fat_percentage": 150.0,  # Invalid percentage > 100
            "chest_circumference": -2.0  # Invalid negative measurement
        }
        
        response = client.put(
            f"/api/progress/entries/{entry_id}",
            json=invalid_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 422
    
    def test_delete_progress_entry_success(self, client_token: str, sample_progress_entries):
        """Test deleting progress entry"""
        entry_id = sample_progress_entries[0].id
        
        response = client.delete(
            f"/api/progress/entries/{entry_id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 204
        
        # Verify entry is deleted
        response = client.get(
            f"/api/progress/entries/{entry_id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 404
    
    def test_delete_progress_entry_not_found(self, client_token: str):
        """Test deleting non-existent progress entry"""
        response = client.delete(
            "/api/progress/entries/999",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 404
    
    def test_delete_progress_entry_unauthorized(self, sample_progress_entries):
        """Test deleting progress entry without authentication"""
        entry_id = sample_progress_entries[0].id
        
        response = client.delete(f"/api/progress/entries/{entry_id}")
        assert response.status_code == 401

class TestProgressAnalytics:
    """Test progress analytics endpoints"""
    
    def test_get_progress_analytics_success(self, client_token: str, sample_progress_entries):
        """Test getting progress analytics"""
        response = client.get(
            "/api/progress/analytics",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "entries" in data
        assert "trends" in data
        assert "summary" in data
        assert len(data["entries"]) == 3
        assert "weight_trend" in data["trends"]
        assert "body_fat_trend" in data["trends"]
        assert "measurements_trend" in data["trends"]
    
    def test_get_progress_analytics_unauthorized(self):
        """Test getting progress analytics without authentication"""
        response = client.get("/api/progress/analytics")
        assert response.status_code == 401
    
    def test_get_progress_analytics_with_date_range(self, client_token: str, sample_progress_entries):
        """Test getting progress analytics with date range"""
        start_date = (datetime.now() - timedelta(days=10)).date().isoformat()
        end_date = datetime.now().date().isoformat()
        
        response = client.get(
            f"/api/progress/analytics?start_date={start_date}&end_date={end_date}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["entries"]) == 2  # Should get entries from last 10 days
    
    def test_progress_trends_calculation(self, client_token: str, sample_progress_entries):
        """Test progress trends calculation"""
        response = client.get(
            "/api/progress/analytics",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Weight should be decreasing (76.5 -> 76.0 -> 75.5)
        assert data["trends"]["weight_trend"] < 0
        
        # Body fat should be decreasing (16.0 -> 15.5 -> 15.0)
        assert data["trends"]["body_fat_trend"] < 0
        
        # Measurements should be decreasing
        assert data["trends"]["measurements_trend"]["chest"] < 0
        assert data["trends"]["measurements_trend"]["waist"] < 0
    
    def test_progress_summary_calculation(self, client_token: str, sample_progress_entries):
        """Test progress summary calculation"""
        response = client.get(
            "/api/progress/analytics",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        summary = data["summary"]
        assert "total_entries" in summary
        assert "average_weight" in summary
        assert "weight_change" in summary
        assert "body_fat_change" in summary
        assert "measurements_change" in summary
        
        assert summary["total_entries"] == 3
        assert summary["weight_change"] < 0  # Weight is decreasing
        assert summary["body_fat_change"] < 0  # Body fat is decreasing
    
    def test_analytics_empty_data(self, client_token: str):
        """Test analytics with no progress entries"""
        response = client.get(
            "/api/progress/analytics",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["entries"]) == 0
        assert data["summary"]["total_entries"] == 0
        assert data["summary"]["average_weight"] == 0.0

class TestProgressPhotoUpload:
    """Test progress photo upload functionality"""
    
    def test_upload_progress_photo_success(self, client_token: str, sample_progress_entries):
        """Test successful progress photo upload"""
        entry_id = sample_progress_entries[0].id
        
        # Create a mock image file
        image_content = b"fake progress photo content"
        files = {
            "photo": ("progress_photo.jpg", io.BytesIO(image_content), "image/jpeg")
        }
        
        response = client.post(
            f"/api/progress/entries/{entry_id}/photos",
            files=files,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["progress_entry_id"] == entry_id
        assert data["filename"] == "progress_photo.jpg"
        assert "id" in data
    
    def test_upload_progress_photo_unauthorized(self, sample_progress_entries):
        """Test progress photo upload without authentication"""
        entry_id = sample_progress_entries[0].id
        
        image_content = b"fake progress photo content"
        files = {
            "photo": ("progress_photo.jpg", io.BytesIO(image_content), "image/jpeg")
        }
        
        response = client.post(f"/api/progress/entries/{entry_id}/photos", files=files)
        assert response.status_code == 401
    
    def test_upload_progress_photo_invalid_file(self, client_token: str, sample_progress_entries):
        """Test progress photo upload with invalid file"""
        entry_id = sample_progress_entries[0].id
        
        # Try to upload non-image file
        file_content = b"not an image"
        files = {
            "photo": ("document.txt", io.BytesIO(file_content), "text/plain")
        }
        
        response = client.post(
            f"/api/progress/entries/{entry_id}/photos",
            files=files,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 400
    
    def test_get_progress_photos(self, client_token: str, sample_progress_entries, db_session: Session):
        """Test getting progress photos"""
        entry_id = sample_progress_entries[0].id
        
        # Create a progress photo first
        from app.models.progress import ProgressPhoto
        photo = ProgressPhoto(
            progress_entry_id=entry_id,
            photo_path="/uploads/progress_photos/test.jpg",
            uploaded_by=sample_progress_entries[0].client_id
        )
        db_session.add(photo)
        db_session.commit()
        db_session.refresh(photo)
        
        response = client.get(
            f"/api/progress/entries/{entry_id}/photos",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["progress_entry_id"] == entry_id

class TestProgressDataValidation:
    """Test progress data validation"""
    
    def test_weight_validation(self, client_token: str):
        """Test weight field validation"""
        # Test negative weight
        invalid_data = {
            "date": datetime.now().date().isoformat(),
            "weight": -10.0
        }
        
        response = client.post(
            "/api/progress/entries",
            json=invalid_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 422
        
        # Test zero weight
        invalid_data["weight"] = 0.0
        response = client.post(
            "/api/progress/entries",
            json=invalid_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 422
        
        # Test extremely high weight
        invalid_data["weight"] = 1000.0
        response = client.post(
            "/api/progress/entries",
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
            "/api/progress/entries",
            json=invalid_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 422
        
        # Test negative percentage
        invalid_data["body_fat_percentage"] = -5.0
        response = client.post(
            "/api/progress/entries",
            json=invalid_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 422
    
    def test_measurement_validation(self, client_token: str):
        """Test measurement field validation"""
        # Test negative measurements
        invalid_data = {
            "date": datetime.now().date().isoformat(),
            "weight": 75.0,
            "chest_circumference": -5.0,
            "waist_circumference": -3.0
        }
        
        response = client.post(
            "/api/progress/entries",
            json=invalid_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 422
        
        # Test unrealistically high measurements
        invalid_data["chest_circumference"] = 500.0
        invalid_data["waist_circumference"] = 300.0
        response = client.post(
            "/api/progress/entries",
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
            "/api/progress/entries",
            json=invalid_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 422
        
        # Test invalid date format
        invalid_data["date"] = "invalid-date"
        response = client.post(
            "/api/progress/entries",
            json=invalid_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 422

class TestProgressPermissions:
    """Test progress permissions and access control"""
    
    def test_client_access_to_own_entries(self, client_token: str, sample_progress_entries):
        """Test client can access their own progress entries"""
        response = client.get(
            "/api/progress/entries",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
    
    def test_trainer_access_to_client_entries(self, trainer_token: str, sample_progress_entries, client_user: User):
        """Test trainer can access client progress entries"""
        response = client.get(
            f"/api/progress/entries?client_id={client_user.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
    
    def test_client_access_to_other_client_entries_forbidden(self, client_token: str, another_client: User, db_session: Session):
        """Test client cannot access other client's progress entries"""
        # Create another client's entry
        other_entry = ProgressEntry(
            client_id=another_client.id,
            date=datetime.now().date(),
            weight=80.0
        )
        db_session.add(other_entry)
        db_session.commit()
        
        response = client.get(
            f"/api/progress/entries?client_id={another_client.id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403
    
    def test_unauthorized_access_to_entries(self, sample_progress_entries):
        """Test unauthorized access to progress entries"""
        response = client.get("/api/progress/entries")
        assert response.status_code == 401

class TestProgressGoals:
    """Test progress goals functionality"""
    
    def test_set_progress_goals(self, client_token: str):
        """Test setting progress goals"""
        goals_data = {
            "target_weight": 70.0,
            "target_body_fat": 12.0,
            "target_chest": 90.0,
            "target_waist": 75.0,
            "target_hip": 90.0,
            "notes": "Weight loss and body composition goals"
        }
        
        response = client.post(
            "/api/progress/goals",
            json=goals_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["target_weight"] == 70.0
        assert data["target_body_fat"] == 12.0
        assert data["target_chest"] == 90.0
        assert data["notes"] == "Weight loss and body composition goals"
    
    def test_get_progress_goals(self, client_token: str):
        """Test getting progress goals"""
        response = client.get(
            "/api/progress/goals",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "current_goals" in data
        assert "progress" in data
    
    def test_update_progress_goals(self, client_token: str):
        """Test updating progress goals"""
        # First set goals
        goals_data = {
            "target_weight": 70.0,
            "target_body_fat": 12.0
        }
        
        response = client.post(
            "/api/progress/goals",
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
            f"/api/progress/goals/{goals_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["target_weight"] == 68.0
        assert data["target_body_fat"] == 10.0
        assert data["notes"] == "Updated goals"

class TestProgressDataExport:
    """Test progress data export functionality"""
    
    def test_export_progress_data_csv(self, client_token: str, sample_progress_entries):
        """Test exporting progress data as CSV"""
        response = client.get(
            "/api/progress/export/csv",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv"
        content = response.content.decode()
        assert "date,weight,body_fat_percentage" in content
        assert "chest_circumference,waist_circumference" in content
    
    def test_export_progress_data_json(self, client_token: str, sample_progress_entries):
        """Test exporting progress data as JSON"""
        response = client.get(
            "/api/progress/export/json",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/json"
        data = response.json()
        assert len(data) == 3
        assert all("date" in entry for entry in data)
        assert all("weight" in entry for entry in data)
        assert all("chest_circumference" in entry for entry in data)
    
    def test_export_with_date_range(self, client_token: str, sample_progress_entries):
        """Test exporting progress data with date range"""
        start_date = (datetime.now() - timedelta(days=10)).date().isoformat()
        end_date = datetime.now().date().isoformat()
        
        response = client.get(
            f"/api/progress/export/csv?start_date={start_date}&end_date={end_date}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        content = response.content.decode()
        # Should only include entries from the date range
        assert content.count("2024") == 2  # Assuming 2 entries in range 