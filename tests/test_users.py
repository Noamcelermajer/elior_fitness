import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json

from app.main import app
from app.database import get_db, engine, Base
from app.models.user import User
from app.models.workout import WorkoutPlan
from app.models.nutrition import MealPlan
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
        is_active=True,
        phone="123-456-7890",
        date_of_birth=datetime(1990, 1, 1),
        gender="male",
        height=180.0,
        weight=80.0
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
        is_active=True,
        phone="098-765-4321",
        date_of_birth=datetime(1995, 5, 15),
        gender="female",
        height=165.0,
        weight=60.0
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def another_trainer(db_session: Session):
    """Create another trainer for testing"""
    user = User(
        email="anothertrainer@test.com",
        hashed_password=get_password_hash("anotherpass123"),
        full_name="Another Trainer",
        is_trainer=True,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def another_client(db_session: Session):
    """Create another client for testing"""
    user = User(
        email="anotherclient@test.com",
        hashed_password=get_password_hash("anotherpass123"),
        full_name="Another Client",
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
def another_trainer_token(another_trainer: User):
    """Create access token for another trainer"""
    return create_access_token(data={"sub": another_trainer.email})

class TestUserCRUD:
    """Test user CRUD operations"""
    
    def test_get_users_success(self, trainer_token: str, trainer_user: User, client_user: User):
        """Test getting all users"""
        response = client.get(
            "/api/users/users",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        user_emails = [user["email"] for user in data]
        assert trainer_user.email in user_emails
        assert client_user.email in user_emails
    
    def test_get_users_unauthorized(self):
        """Test getting users without authentication"""
        response = client.get("/api/users/users")
        assert response.status_code == 401
    
    def test_get_users_client_forbidden(self, client_token: str):
        """Test that clients cannot get all users"""
        response = client.get(
            "/api/users/users",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403
    
    def test_get_users_with_filtering(self, trainer_token: str, trainer_user: User, client_user: User):
        """Test getting users with filtering"""
        # Filter by role
        response = client.get(
            "/api/users/users?is_trainer=true",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["is_trainer"] == True
        
        # Filter by search
        response = client.get(
            "/api/users/users?search=Test",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2  # Both users have "Test" in their names
        
        # Filter by active status
        response = client.get(
            "/api/users/users?is_active=true",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert all(user["is_active"] == True for user in data)
    
    def test_get_user_by_id_success(self, trainer_token: str, client_user: User):
        """Test getting user by ID"""
        response = client.get(
            f"/api/users/users/{client_user.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == client_user.id
        assert data["email"] == client_user.email
        assert data["full_name"] == client_user.full_name
        assert data["is_trainer"] == client_user.is_trainer
        assert data["is_active"] == client_user.is_active
    
    def test_get_user_by_id_not_found(self, trainer_token: str):
        """Test getting non-existent user"""
        response = client.get(
            "/api/users/users/999",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 404
    
    def test_get_user_by_id_unauthorized(self, client_user: User):
        """Test getting user without authentication"""
        response = client.get(f"/api/users/users/{client_user.id}")
        assert response.status_code == 401
    
    def test_update_user_success(self, trainer_token: str, client_user: User):
        """Test updating user"""
        update_data = {
            "full_name": "Updated Client Name",
            "phone": "555-123-4567",
            "height": 170.0,
            "weight": 65.0
        }
        
        response = client.put(
            f"/api/users/users/{client_user.id}",
            json=update_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Updated Client Name"
        assert data["phone"] == "555-123-4567"
        assert data["height"] == 170.0
        assert data["weight"] == 65.0
    
    def test_update_user_not_found(self, trainer_token: str):
        """Test updating non-existent user"""
        update_data = {"full_name": "Updated Name"}
        
        response = client.put(
            "/api/users/users/999",
            json=update_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 404
    
    def test_update_user_unauthorized(self, client_token: str, client_user: User):
        """Test updating user without proper authorization"""
        update_data = {"full_name": "Updated Name"}
        
        response = client.put(
            f"/api/users/users/{client_user.id}",
            json=update_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403
    
    def test_update_user_invalid_data(self, trainer_token: str, client_user: User):
        """Test updating user with invalid data"""
        update_data = {
            "email": "invalid-email",  # Invalid email format
            "height": -10.0,  # Invalid height
            "weight": 0.0  # Invalid weight
        }
        
        response = client.put(
            f"/api/users/users/{client_user.id}",
            json=update_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 422
    
    def test_delete_user_success(self, trainer_token: str, client_user: User):
        """Test deleting user"""
        response = client.delete(
            f"/api/users/users/{client_user.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 204
        
        # Verify user is deleted
        response = client.get(
            f"/api/users/users/{client_user.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 404
    
    def test_delete_user_not_found(self, trainer_token: str):
        """Test deleting non-existent user"""
        response = client.delete(
            "/api/users/users/999",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 404
    
    def test_delete_user_unauthorized(self, client_token: str, client_user: User):
        """Test deleting user without proper authorization"""
        response = client.delete(
            f"/api/users/users/{client_user.id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403

class TestTrainerClientRelationships:
    """Test trainer-client relationship management"""
    
    def test_assign_client_to_trainer_success(self, trainer_token: str, trainer_user: User, client_user: User):
        """Test successfully assigning client to trainer"""
        response = client.post(
            f"/api/users/users/{trainer_user.id}/clients/{client_user.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["trainer_id"] == trainer_user.id
        assert data["client_id"] == client_user.id
    
    def test_assign_client_to_trainer_unauthorized(self, trainer_user: User, client_user: User):
        """Test assigning client without authentication"""
        response = client.post(f"/api/users/users/{trainer_user.id}/clients/{client_user.id}")
        assert response.status_code == 401
    
    def test_assign_client_to_trainer_forbidden(self, client_token: str, trainer_user: User, client_user: User):
        """Test that clients cannot assign relationships"""
        response = client.post(
            f"/api/users/users/{trainer_user.id}/clients/{client_user.id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403
    
    def test_assign_client_to_wrong_trainer(self, another_trainer_token: str, trainer_user: User, client_user: User):
        """Test assigning client to wrong trainer"""
        response = client.post(
            f"/api/users/users/{trainer_user.id}/clients/{client_user.id}",
            headers={"Authorization": f"Bearer {another_trainer_token}"}
        )
        assert response.status_code == 403
    
    def test_assign_nonexistent_client(self, trainer_token: str, trainer_user: User):
        """Test assigning non-existent client"""
        response = client.post(
            f"/api/users/users/{trainer_user.id}/clients/999",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 404
    
    def test_assign_to_nonexistent_trainer(self, trainer_token: str, client_user: User):
        """Test assigning to non-existent trainer"""
        response = client.post(
            f"/api/users/users/999/clients/{client_user.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 404
    
    def test_assign_client_already_assigned(self, trainer_token: str, trainer_user: User, client_user: User, db_session: Session):
        """Test assigning client that's already assigned"""
        # First assignment
        response = client.post(
            f"/api/users/users/{trainer_user.id}/clients/{client_user.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 201
        
        # Second assignment (should fail)
        response = client.post(
            f"/api/users/users/{trainer_user.id}/clients/{client_user.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 400
        assert "already assigned" in response.json()["detail"].lower()
    
    def test_get_trainer_clients_success(self, trainer_token: str, trainer_user: User, client_user: User, db_session: Session):
        """Test getting trainer's clients"""
        # First assign client to trainer
        response = client.post(
            f"/api/users/users/{trainer_user.id}/clients/{client_user.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 201
        
        # Get trainer's clients
        response = client.get(
            f"/api/users/users/{trainer_user.id}/clients",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == client_user.id
        assert data[0]["email"] == client_user.email
    
    def test_get_trainer_clients_empty(self, trainer_token: str, trainer_user: User):
        """Test getting clients for trainer with no clients"""
        response = client.get(
            f"/api/users/users/{trainer_user.id}/clients",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0
    
    def test_get_trainer_clients_unauthorized(self, trainer_user: User):
        """Test getting trainer's clients without authentication"""
        response = client.get(f"/api/users/users/{trainer_user.id}/clients")
        assert response.status_code == 401
    
    def test_get_trainer_clients_forbidden(self, client_token: str, trainer_user: User):
        """Test that clients cannot get trainer's clients"""
        response = client.get(
            f"/api/users/users/{trainer_user.id}/clients",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403
    
    def test_remove_client_assignment_success(self, trainer_token: str, trainer_user: User, client_user: User, db_session: Session):
        """Test successfully removing client assignment"""
        # First assign client to trainer
        response = client.post(
            f"/api/users/users/{trainer_user.id}/clients/{client_user.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 201
        
        # Remove assignment
        response = client.delete(
            f"/api/users/users/{trainer_user.id}/clients/{client_user.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 204
        
        # Verify assignment is removed
        response = client.get(
            f"/api/users/users/{trainer_user.id}/clients",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0
    
    def test_remove_nonexistent_assignment(self, trainer_token: str, trainer_user: User, client_user: User):
        """Test removing non-existent assignment"""
        response = client.delete(
            f"/api/users/users/{trainer_user.id}/clients/{client_user.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 404
    
    def test_remove_assignment_unauthorized(self, trainer_user: User, client_user: User):
        """Test removing assignment without authentication"""
        response = client.delete(f"/api/users/users/{trainer_user.id}/clients/{client_user.id}")
        assert response.status_code == 401
    
    def test_remove_assignment_forbidden(self, client_token: str, trainer_user: User, client_user: User):
        """Test that clients cannot remove assignments"""
        response = client.delete(
            f"/api/users/users/{trainer_user.id}/clients/{client_user.id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403

class TestUserProfileManagement:
    """Test user profile management"""
    
    def test_get_user_profile_success(self, trainer_token: str, trainer_user: User):
        """Test getting user profile"""
        response = client.get(
            f"/api/users/users/{trainer_user.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == trainer_user.id
        assert data["email"] == trainer_user.email
        assert data["full_name"] == trainer_user.full_name
        assert data["phone"] == trainer_user.phone
        assert data["height"] == trainer_user.height
        assert data["weight"] == trainer_user.weight
        assert data["gender"] == trainer_user.gender
    
    def test_update_user_profile_success(self, trainer_token: str, trainer_user: User):
        """Test updating user profile"""
        update_data = {
            "full_name": "Updated Trainer Name",
            "phone": "555-999-8888",
            "height": 185.0,
            "weight": 85.0,
            "gender": "male"
        }
        
        response = client.put(
            f"/api/users/users/{trainer_user.id}",
            json=update_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Updated Trainer Name"
        assert data["phone"] == "555-999-8888"
        assert data["height"] == 185.0
        assert data["weight"] == 85.0
    
    def test_update_user_profile_partial(self, trainer_token: str, trainer_user: User):
        """Test updating user profile with partial data"""
        update_data = {
            "phone": "555-777-6666"
        }
        
        response = client.put(
            f"/api/users/users/{trainer_user.id}",
            json=update_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["phone"] == "555-777-6666"
        # Other fields should remain unchanged
        assert data["full_name"] == trainer_user.full_name
        assert data["height"] == trainer_user.height
    
    def test_update_user_profile_invalid_data(self, trainer_token: str, trainer_user: User):
        """Test updating user profile with invalid data"""
        update_data = {
            "email": "invalid-email",
            "height": -10.0,
            "weight": 0.0,
            "phone": "invalid-phone"
        }
        
        response = client.put(
            f"/api/users/users/{trainer_user.id}",
            json=update_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 422

class TestUserSearchAndFiltering:
    """Test user search and filtering functionality"""
    
    def test_search_users_by_name(self, trainer_token: str, trainer_user: User, client_user: User):
        """Test searching users by name"""
        response = client.get(
            "/api/users/users?search=Test",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2  # Both users have "Test" in their names
        
        response = client.get(
            "/api/users/users?search=Trainer",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["full_name"] == "Test Trainer"
    
    def test_search_users_by_email(self, trainer_token: str, trainer_user: User):
        """Test searching users by email"""
        response = client.get(
            f"/api/users/users?search={trainer_user.email}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["email"] == trainer_user.email
    
    def test_filter_users_by_role(self, trainer_token: str, trainer_user: User, client_user: User):
        """Test filtering users by role"""
        # Filter trainers
        response = client.get(
            "/api/users/users?is_trainer=true",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["is_trainer"] == True
        
        # Filter clients
        response = client.get(
            "/api/users/users?is_trainer=false",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["is_trainer"] == False
    
    def test_filter_users_by_active_status(self, trainer_token: str, trainer_user: User, client_user: User):
        """Test filtering users by active status"""
        response = client.get(
            "/api/users/users?is_active=true",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert all(user["is_active"] == True for user in data)
    
    def test_combine_search_and_filters(self, trainer_token: str, trainer_user: User, client_user: User):
        """Test combining search and filters"""
        response = client.get(
            "/api/users/users?search=Test&is_trainer=true",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["full_name"] == "Test Trainer"
        assert data[0]["is_trainer"] == True

class TestUserDataIntegrity:
    """Test user data integrity and validation"""
    
    def test_user_data_consistency(self, trainer_token: str, trainer_user: User, client_user: User, db_session: Session):
        """Test user data consistency across operations"""
        # Create workout plan for client
        workout_plan = WorkoutPlan(
            name="Test Plan",
            trainer_id=trainer_user.id,
            client_id=client_user.id,
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=7)
        )
        db_session.add(workout_plan)
        db_session.commit()
        
        # Create meal plan for client
        meal_plan = MealPlan(
            name="Test Meal Plan",
            trainer_id=trainer_user.id,
            client_id=client_user.id,
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=7),
            protein_goal=150.0,
            carbs_goal=200.0,
            fats_goal=60.0,
            calories_goal=2000.0
        )
        db_session.add(meal_plan)
        db_session.commit()
        
        # Verify user data is consistent
        response = client.get(
            f"/api/users/users/{client_user.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == client_user.id
        assert data["email"] == client_user.email
    
    def test_user_deletion_cascade(self, trainer_token: str, trainer_user: User, client_user: User, db_session: Session):
        """Test that user deletion properly handles related data"""
        # Create workout plan for client
        workout_plan = WorkoutPlan(
            name="Test Plan",
            trainer_id=trainer_user.id,
            client_id=client_user.id,
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=7)
        )
        db_session.add(workout_plan)
        db_session.commit()
        
        # Delete client
        response = client.delete(
            f"/api/users/users/{client_user.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 204
        
        # Verify client is deleted
        response = client.get(
            f"/api/users/users/{client_user.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 404

class TestUserPermissions:
    """Test user permissions and access control"""
    
    def test_trainer_access_to_own_data(self, trainer_token: str, trainer_user: User):
        """Test trainer can access their own data"""
        response = client.get(
            f"/api/users/users/{trainer_user.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == trainer_user.id
    
    def test_trainer_access_to_client_data(self, trainer_token: str, client_user: User):
        """Test trainer can access client data"""
        response = client.get(
            f"/api/users/users/{client_user.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == client_user.id
    
    def test_client_access_to_own_data(self, client_token: str, client_user: User):
        """Test client can access their own data"""
        response = client.get(
            f"/api/users/users/{client_user.id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == client_user.id
    
    def test_client_access_to_trainer_data_forbidden(self, client_token: str, trainer_user: User):
        """Test client cannot access trainer data"""
        response = client.get(
            f"/api/users/users/{trainer_user.id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403
    
    def test_client_access_to_other_client_data_forbidden(self, client_token: str, another_client: User):
        """Test client cannot access other client data"""
        response = client.get(
            f"/api/users/users/{another_client.id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403
    
    def test_trainer_access_to_other_trainer_data(self, trainer_token: str, another_trainer: User):
        """Test trainer can access other trainer data (for collaboration)"""
        response = client.get(
            f"/api/users/users/{another_trainer.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == another_trainer.id 