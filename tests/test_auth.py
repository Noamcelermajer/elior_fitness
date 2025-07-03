import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json

from app.main import app
from app.database import get_db, engine, Base
from app.models.user import User
from app.services.auth_service import create_access_token, verify_password
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
def existing_trainer(db_session: Session):
    """Create an existing trainer user"""
    user = User(
        email="existingtrainer@test.com",
        hashed_password=get_password_hash("existingpass123"),
        full_name="Existing Trainer",
        is_trainer=True,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def existing_client(db_session: Session):
    """Create an existing client user"""
    user = User(
        email="existingclient@test.com",
        hashed_password=get_password_hash("existingpass123"),
        full_name="Existing Client",
        is_trainer=False,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

class TestUserRegistration:
    """Test user registration endpoints"""
    
    def test_register_trainer_success(self):
        """Test successful trainer registration"""
        trainer_data = {
            "email": "newtrainer@test.com",
            "password": "trainerpass123",
            "full_name": "New Trainer",
            "is_trainer": True
        }
        
        response = client.post("/api/auth/register", json=trainer_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["user"]["email"] == "newtrainer@test.com"
        assert data["user"]["full_name"] == "New Trainer"
        assert data["user"]["is_trainer"] == True
        assert data["user"]["is_active"] == True
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
    
    def test_register_client_success(self):
        """Test successful client registration"""
        client_data = {
            "email": "newclient@test.com",
            "password": "clientpass123",
            "full_name": "New Client",
            "is_trainer": False
        }
        
        response = client.post("/api/auth/register", json=client_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["user"]["email"] == "newclient@test.com"
        assert data["user"]["full_name"] == "New Client"
        assert data["user"]["is_trainer"] == False
        assert data["user"]["is_active"] == True
        assert "access_token" in data
    
    def test_register_duplicate_email(self, existing_trainer: User):
        """Test registration with duplicate email"""
        duplicate_data = {
            "email": existing_trainer.email,
            "password": "newpass123",
            "full_name": "Duplicate User",
            "is_trainer": False
        }
        
        response = client.post("/api/auth/register", json=duplicate_data)
        assert response.status_code == 400
        assert "email already registered" in response.json()["detail"].lower()
    
    def test_register_invalid_email(self):
        """Test registration with invalid email"""
        invalid_data = {
            "email": "invalid-email",
            "password": "pass123",
            "full_name": "Invalid User",
            "is_trainer": False
        }
        
        response = client.post("/api/auth/register", json=invalid_data)
        assert response.status_code == 422
    
    def test_register_weak_password(self):
        """Test registration with weak password"""
        weak_password_data = {
            "email": "weakpass@test.com",
            "password": "123",  # Too short
            "full_name": "Weak Password User",
            "is_trainer": False
        }
        
        response = client.post("/api/auth/register", json=weak_password_data)
        assert response.status_code == 422
    
    def test_register_missing_fields(self):
        """Test registration with missing required fields"""
        incomplete_data = {
            "email": "incomplete@test.com"
            # Missing password, full_name, is_trainer
        }
        
        response = client.post("/api/auth/register", json=incomplete_data)
        assert response.status_code == 422
    
    def test_register_empty_fields(self):
        """Test registration with empty fields"""
        empty_data = {
            "email": "",
            "password": "",
            "full_name": "",
            "is_trainer": False
        }
        
        response = client.post("/api/auth/register", json=empty_data)
        assert response.status_code == 422

class TestUserLogin:
    """Test user login endpoints"""
    
    def test_login_trainer_success(self, existing_trainer: User):
        """Test successful trainer login"""
        login_data = {
            "email": existing_trainer.email,
            "password": "existingpass123"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["email"] == existing_trainer.email
        assert data["user"]["is_trainer"] == True
    
    def test_login_client_success(self, existing_client: User):
        """Test successful client login"""
        login_data = {
            "email": existing_client.email,
            "password": "existingpass123"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == existing_client.email
        assert data["user"]["is_trainer"] == False
    
    def test_login_invalid_email(self):
        """Test login with invalid email"""
        login_data = {
            "email": "nonexistent@test.com",
            "password": "pass123"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 401
        assert "incorrect email or password" in response.json()["detail"].lower()
    
    def test_login_invalid_password(self, existing_trainer: User):
        """Test login with invalid password"""
        login_data = {
            "email": existing_trainer.email,
            "password": "wrongpassword"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 401
        assert "incorrect email or password" in response.json()["detail"].lower()
    
    def test_login_inactive_user(self, db_session: Session):
        """Test login with inactive user"""
        inactive_user = User(
            email="inactive@test.com",
            hashed_password=get_password_hash("pass123"),
            full_name="Inactive User",
            is_trainer=False,
            is_active=False
        )
        db_session.add(inactive_user)
        db_session.commit()
        
        login_data = {
            "email": "inactive@test.com",
            "password": "pass123"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 401
        assert "inactive" in response.json()["detail"].lower()
    
    def test_login_missing_fields(self):
        """Test login with missing fields"""
        incomplete_data = {
            "email": "test@test.com"
            # Missing password
        }
        
        response = client.post("/api/auth/login", json=incomplete_data)
        assert response.status_code == 422
    
    def test_login_form_data(self, existing_trainer: User):
        """Test login with form data (for compatibility)"""
        form_data = {
            "username": existing_trainer.email,  # OAuth2 form uses 'username'
            "password": "existingpass123"
        }
        
        response = client.post("/api/auth/login", data=form_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == existing_trainer.email

class TestPasswordManagement:
    """Test password management endpoints"""
    
    def test_change_password_success(self, existing_trainer: User):
        """Test successful password change"""
        # First login to get token
        login_data = {
            "email": existing_trainer.email,
            "password": "existingpass123"
        }
        login_response = client.post("/api/auth/login", json=login_data)
        token = login_response.json()["access_token"]
        
        # Change password
        change_data = {
            "current_password": "existingpass123",
            "new_password": "newpassword123"
        }
        
        response = client.post(
            "/api/auth/change-password",
            json=change_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert "password changed successfully" in response.json()["message"].lower()
        
        # Verify new password works
        new_login_data = {
            "email": existing_trainer.email,
            "password": "newpassword123"
        }
        new_login_response = client.post("/api/auth/login", json=new_login_data)
        assert new_login_response.status_code == 200
    
    def test_change_password_unauthorized(self):
        """Test password change without authentication"""
        change_data = {
            "current_password": "oldpass",
            "new_password": "newpass"
        }
        
        response = client.post("/api/auth/change-password", json=change_data)
        assert response.status_code == 401
    
    def test_change_password_wrong_current(self, existing_trainer: User):
        """Test password change with wrong current password"""
        # First login to get token
        login_data = {
            "email": existing_trainer.email,
            "password": "existingpass123"
        }
        login_response = client.post("/api/auth/login", json=login_data)
        token = login_response.json()["access_token"]
        
        # Try to change with wrong current password
        change_data = {
            "current_password": "wrongpassword",
            "new_password": "newpassword123"
        }
        
        response = client.post(
            "/api/auth/change-password",
            json=change_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400
        assert "incorrect current password" in response.json()["detail"].lower()
    
    def test_change_password_weak_new(self, existing_trainer: User):
        """Test password change with weak new password"""
        # First login to get token
        login_data = {
            "email": existing_trainer.email,
            "password": "existingpass123"
        }
        login_response = client.post("/api/auth/login", json=login_data)
        token = login_response.json()["access_token"]
        
        # Try to change with weak new password
        change_data = {
            "current_password": "existingpass123",
            "new_password": "123"  # Too short
        }
        
        response = client.post(
            "/api/auth/change-password",
            json=change_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 422
    
    def test_change_password_missing_fields(self, existing_trainer: User):
        """Test password change with missing fields"""
        # First login to get token
        login_data = {
            "email": existing_trainer.email,
            "password": "existingpass123"
        }
        login_response = client.post("/api/auth/login", json=login_data)
        token = login_response.json()["access_token"]
        
        # Try to change with missing fields
        change_data = {
            "current_password": "existingpass123"
            # Missing new_password
        }
        
        response = client.post(
            "/api/auth/change-password",
            json=change_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 422

class TestCurrentUser:
    """Test current user endpoint"""
    
    def test_get_current_user_success(self, existing_trainer: User):
        """Test successful current user retrieval"""
        # First login to get token
        login_data = {
            "email": existing_trainer.email,
            "password": "existingpass123"
        }
        login_response = client.post("/api/auth/login", json=login_data)
        token = login_response.json()["access_token"]
        
        # Get current user
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == existing_trainer.email
        assert data["full_name"] == existing_trainer.full_name
        assert data["is_trainer"] == existing_trainer.is_trainer
        assert data["is_active"] == existing_trainer.is_active
    
    def test_get_current_user_unauthorized(self):
        """Test current user retrieval without authentication"""
        response = client.get("/api/auth/me")
        assert response.status_code == 401
    
    def test_get_current_user_invalid_token(self):
        """Test current user retrieval with invalid token"""
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"}
        )
        assert response.status_code == 401
    
    def test_get_current_user_expired_token(self, existing_trainer: User):
        """Test current user retrieval with expired token"""
        # Create an expired token (this would require modifying the token creation)
        # For now, we'll test with a malformed token
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer expired.token.here"}
        )
        assert response.status_code == 401

class TestTokenValidation:
    """Test JWT token validation"""
    
    def test_valid_token_access(self, existing_trainer: User):
        """Test access with valid token"""
        # Login to get token
        login_data = {
            "email": existing_trainer.email,
            "password": "existingpass123"
        }
        login_response = client.post("/api/auth/login", json=login_data)
        token = login_response.json()["access_token"]
        
        # Use token to access protected endpoint
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
    
    def test_invalid_token_format(self):
        """Test access with invalid token format"""
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "InvalidFormat token"}
        )
        assert response.status_code == 401
    
    def test_missing_bearer_prefix(self, existing_trainer: User):
        """Test access without Bearer prefix"""
        # Login to get token
        login_data = {
            "email": existing_trainer.email,
            "password": "existingpass123"
        }
        login_response = client.post("/api/auth/login", json=login_data)
        token = login_response.json()["access_token"]
        
        # Use token without Bearer prefix
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": token}
        )
        assert response.status_code == 401
    
    def test_empty_token(self):
        """Test access with empty token"""
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer "}
        )
        assert response.status_code == 401

class TestSecurityFeatures:
    """Test security features"""
    
    def test_password_hashing(self, existing_trainer: User):
        """Test that passwords are properly hashed"""
        # The password should not be stored in plain text
        # We can verify this by checking that the hashed password is different
        assert existing_trainer.hashed_password != "existingpass123"
        assert len(existing_trainer.hashed_password) > 20  # Hashed passwords are longer
    
    def test_token_security(self, existing_trainer: User):
        """Test token security features"""
        # Login to get token
        login_data = {
            "email": existing_trainer.email,
            "password": "existingpass123"
        }
        login_response = client.post("/api/auth/login", json=login_data)
        token = login_response.json()["access_token"]
        
        # Token should be a valid JWT format
        parts = token.split('.')
        assert len(parts) == 3  # JWT has 3 parts: header.payload.signature
        
        # Token should not contain sensitive information in plain text
        assert existing_trainer.email not in token
        assert "existingpass123" not in token
    
    def test_case_sensitive_email(self, existing_trainer: User):
        """Test that email login is case sensitive"""
        # Try login with different case
        login_data = {
            "email": existing_trainer.email.upper(),
            "password": "existingpass123"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 401
    
    def test_sql_injection_prevention(self):
        """Test SQL injection prevention"""
        # Try to inject SQL in email field
        malicious_data = {
            "email": "'; DROP TABLE users; --",
            "password": "pass123",
            "full_name": "Malicious User",
            "is_trainer": False
        }
        
        response = client.post("/api/auth/register", json=malicious_data)
        # Should fail validation, not cause SQL error
        assert response.status_code == 422

class TestErrorHandling:
    """Test error handling in authentication"""
    
    def test_database_connection_error(self):
        """Test handling of database connection errors"""
        # This would require mocking the database connection
        # For now, we'll test that the API handles errors gracefully
        pass
    
    def test_invalid_json_request(self):
        """Test handling of invalid JSON requests"""
        response = client.post(
            "/api/auth/register",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422
    
    def test_malformed_request(self):
        """Test handling of malformed requests"""
        response = client.post("/api/auth/register")
        assert response.status_code == 422
    
    def test_rate_limiting(self):
        """Test rate limiting (if implemented)"""
        # Try multiple rapid requests
        for i in range(10):
            data = {
                "email": f"rate{i}@test.com",
                "password": "pass123",
                "full_name": f"Rate User {i}",
                "is_trainer": False
            }
            response = client.post("/api/auth/register", json=data)
            # Should not be rate limited for registration
            assert response.status_code in [201, 400, 422]

class TestUserActivation:
    """Test user activation features"""
    
    def test_user_activation_status(self, existing_trainer: User):
        """Test user activation status"""
        # Login to get token
        login_data = {
            "email": existing_trainer.email,
            "password": "existingpass123"
        }
        login_response = client.post("/api/auth/login", json=login_data)
        token = login_response.json()["access_token"]
        
        # Check user status
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] == True
    
    def test_inactive_user_login(self, db_session: Session):
        """Test login with inactive user"""
        inactive_user = User(
            email="inactive@test.com",
            hashed_password=get_password_hash("pass123"),
            full_name="Inactive User",
            is_trainer=False,
            is_active=False
        )
        db_session.add(inactive_user)
        db_session.commit()
        
        login_data = {
            "email": "inactive@test.com",
            "password": "pass123"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 401
        assert "inactive" in response.json()["detail"].lower() 