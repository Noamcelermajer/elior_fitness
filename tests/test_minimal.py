import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, date
import json

from app.main import app
from app.database import get_db, engine, Base
from app.models.user import User
from app.schemas.auth import UserRole
from app.services.password_service import get_password_hash
from app.services.auth_service import create_access_token

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
        username="trainer",
        email="trainer@test.com",
        hashed_password=get_password_hash("trainerpass123"),
        full_name="Test Trainer",
        role=UserRole.TRAINER,
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
        username="client",
        email="client@test.com",
        hashed_password=get_password_hash("clientpass123"),
        full_name="Test Client",
        role=UserRole.CLIENT,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def trainer_token(trainer_user: User):
    """Create access token for trainer"""
    return create_access_token(data={"sub": str(trainer_user.id)})

@pytest.fixture
def client_token(client_user: User):
    """Create access token for client"""
    return create_access_token(data={"sub": str(client_user.id)})

class TestBasicFunctionality:
    """Test basic functionality that should work"""
    
    def test_root_endpoint(self):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
    
    def test_nutrition_router_working(self):
        """Test that nutrition router is accessible"""
        response = client.get("/api/nutrition/test")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
    
    def test_meal_plans_router_working(self):
        """Test that meal plans router is accessible"""
        response = client.get("/api/meal-plans/test")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
    
    def test_exercises_router_working(self):
        """Test that exercises router is accessible"""
        response = client.get("/api/exercises/test")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data

class TestAuthentication:
    """Test authentication functionality"""
    
    def test_register_client_success(self, db_session: Session):
        """Test successful client registration"""
        user_data = {
            "username": "newclient",
            "email": "newclient@test.com",
            "password": "clientpass123",
            "full_name": "New Client",
            "role": "client"
        }
        
        response = client.post("/api/auth/register", json=user_data)
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newclient@test.com"
        assert data["role"] == "client"
        assert "id" in data
    
    def test_login_success(self, client_user: User):
        """Test successful login"""
        login_data = {
            "username": "client",
            "password": "clientpass123"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
    
    def test_get_current_user(self, client_token: str, client_user: User):
        """Test getting current user info"""
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "client@test.com"
        assert data["role"] == "client"

class TestErrorHandling:
    """Test error handling"""
    
    def test_invalid_token(self):
        """Test invalid token handling"""
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401
    
    def test_missing_token(self):
        """Test missing token handling"""
        response = client.get("/api/auth/me")
        assert response.status_code == 401
    
    def test_nonexistent_endpoint(self):
        """Test 404 for nonexistent endpoint"""
        response = client.get("/api/nonexistent")
        assert response.status_code == 404

class TestWeightTracking:
    """Test weight tracking functionality"""
    
    def test_add_weight_entry(self, client_token: str, client_user: User, db_session: Session):
        """Test adding a weight entry"""
        weight_data = {
            "weight": 75.5,
            "notes": "Weekly check-in"
        }
        
        response = client.post(
            "/api/progress/weight",
            data=weight_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["weight"] == 75.5
        assert data["notes"] == "Weekly check-in"
        assert "id" in data
        assert "date" in data
    
    def test_get_weight_history(self, client_token: str, client_user: User, db_session: Session):
        """Test getting weight history"""
        # First add a weight entry
        weight_data = {"weight": 75.5, "notes": "Test entry"}
        client.post(
            "/api/progress/weight",
            data=weight_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        # Then get the history
        response = client.get(
            "/api/progress/weight",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert data[0]["weight"] == 75.5
    
    def test_get_current_weight(self, client_token: str, client_user: User, db_session: Session):
        """Test getting current weight"""
        # First add a weight entry
        weight_data = {"weight": 75.5}
        client.post(
            "/api/progress/weight",
            data=weight_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        # Then get current weight
        response = client.get(
            "/api/progress/weight/current",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["weight"] == 75.5
    
    def test_add_weight_entry_unauthorized(self):
        """Test adding weight entry without authentication"""
        weight_data = {"weight": 75.5}
        response = client.post("/api/progress/weight", data=weight_data)
        assert response.status_code == 401

class TestDatabase:
    """Test database functionality"""
    
    def test_user_creation(self, db_session: Session):
        """Test that users can be created in database"""
        user = User(
            username="testuser",
            email="test@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="Test User",
            role=UserRole.CLIENT,
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        
        assert user.id is not None
        assert user.email == "test@example.com"
        assert user.role == UserRole.CLIENT 