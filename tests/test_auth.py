import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import uuid

class TestAuthentication:
    """Test authentication endpoints."""

    def test_register_trainer_success(self, client: TestClient):
        """Test successful trainer registration."""
        trainer_data = {
            "email": f"newtrainer_{uuid.uuid4().hex}@test.com",
            "password": "securepassword123",
            "full_name": "New Trainer",
            "role": "trainer"
        }
        response = client.post("/api/auth/register", json=trainer_data)
        if response.status_code != 201:
            print("Register trainer error:", response.json())
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == trainer_data["email"]
        assert data["full_name"] == trainer_data["full_name"]
        assert data["role"] == "trainer"
        assert "id" in data
        assert "password" not in data

    def test_register_client_success(self, client: TestClient):
        """Test successful client registration."""
        client_data = {
            "email": f"newclient_{uuid.uuid4().hex}@test.com",
            "password": "securepassword123",
            "full_name": "New Client",
            "role": "client"
        }
        response = client.post("/api/auth/register", json=client_data)
        if response.status_code != 201:
            print("Register client error:", response.json())
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == client_data["email"]
        assert data["full_name"] == client_data["full_name"]
        assert data["role"] == "client"

    def test_register_duplicate_email(self, client: TestClient, test_trainer):
        """Test registration with duplicate email."""
        duplicate_data = {
            "email": test_trainer.email,
            "password": "securepassword123",
            "full_name": "Duplicate User",
            "role": "client"
        }
        response = client.post("/api/auth/register", json=duplicate_data)
        assert response.status_code == 400
        assert "email already registered" in response.json()["detail"].lower()

    def test_register_invalid_email(self, client: TestClient):
        """Test registration with invalid email."""
        invalid_data = {
            "email": "invalid-email",
            "password": "securepassword123",
            "full_name": "Invalid User",
            "role": "client"
        }
        response = client.post("/api/auth/register", json=invalid_data)
        assert response.status_code == 422

    def test_register_weak_password(self, client: TestClient):
        """Test registration with weak password."""
        weak_password_data = {
            "email": f"weak_{uuid.uuid4().hex}@test.com",
            "password": "123",
            "full_name": "Weak User",
            "role": "client"
        }
        response = client.post("/api/auth/register", json=weak_password_data)
        assert response.status_code == 422

    def test_login_success_json(self, client: TestClient, test_trainer_data):
        """Test successful login with JSON."""
        # First register the user
        register_response = client.post("/api/auth/register", json=test_trainer_data)
        if register_response.status_code != 201:
            print("Register for login error:", register_response.json())
        
        response = client.post("/api/auth/login", json=test_trainer_data)
        if response.status_code != 200:
            print("Login error:", response.json())
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert len(data["access_token"]) > 0

    def test_login_success_form(self, client: TestClient, test_trainer_data):
        """Test successful login with form data."""
        # First register the user
        register_response = client.post("/api/auth/register", json=test_trainer_data)
        if register_response.status_code != 201:
            print("Register for form login error:", register_response.json())
        
        form_data = {
            "username": test_trainer_data["email"],
            "password": test_trainer_data["password"]
        }
        response = client.post("/api/auth/token", data=form_data)
        if response.status_code != 200:
            print("Form login error:", response.json())
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_invalid_credentials(self, client: TestClient):
        """Test login with invalid credentials."""
        invalid_data = {
            "email": f"nonexistent_{uuid.uuid4().hex}@test.com",
            "password": "wrongpassword"
        }
        response = client.post("/api/auth/login", json=invalid_data)
        assert response.status_code == 401
        assert "incorrect email or password" in response.json()["detail"].lower()

    def test_login_wrong_password(self, client: TestClient, test_trainer):
        """Test login with wrong password."""
        wrong_password_data = {
            "email": test_trainer.email,
            "password": "wrongpassword"
        }
        response = client.post("/api/auth/login", json=wrong_password_data)
        assert response.status_code == 401

    def test_get_current_user_success(self, client: TestClient, auth_headers_trainer):
        """Test getting current user information."""
        response = client.get("/api/auth/me", headers=auth_headers_trainer)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "full_name" in data
        assert "role" in data
        assert "is_active" in data

    def test_get_current_user_no_token(self, client: TestClient):
        """Test getting current user without token."""
        response = client.get("/api/auth/me")
        assert response.status_code == 401

    def test_get_current_user_invalid_token(self, client: TestClient):
        """Test getting current user with invalid token."""
        headers = {"Authorization": "Bearer invalid_token"}
        response = client.get("/api/auth/me", headers=headers)
        assert response.status_code == 401

    def test_password_reset_request(self, client: TestClient, test_trainer):
        """Test password reset request."""
        reset_data = {"email": test_trainer.email}
        response = client.post("/api/auth/password-reset/request", json=reset_data)
        assert response.status_code == 200
        assert "password reset link has been sent" in response.json()["message"]

    def test_password_reset_request_nonexistent_email(self, client: TestClient):
        """Test password reset request with nonexistent email."""
        reset_data = {"email": "nonexistent@test.com"}
        response = client.post("/api/auth/password-reset/request", json=reset_data)
        assert response.status_code == 200
        # Should not reveal if email exists or not

    def test_password_change_success(self, client: TestClient, auth_headers_trainer, test_trainer_data):
        """Test successful password change."""
        change_data = {
            "current_password": test_trainer_data["password"],
            "new_password": "newsecurepassword123"
        }
        response = client.post("/api/auth/password/change", json=change_data, headers=auth_headers_trainer)
        assert response.status_code == 200
        assert "Password changed successfully" in response.json()["message"]

    def test_password_change_wrong_current_password(self, client: TestClient, auth_headers_trainer):
        """Test password change with wrong current password."""
        change_data = {
            "current_password": "wrongpassword",
            "new_password": "newsecurepassword123"
        }
        response = client.post("/api/auth/password/change", json=change_data, headers=auth_headers_trainer)
        assert response.status_code == 400

    def test_password_change_no_auth(self, client: TestClient):
        """Test password change without authentication."""
        change_data = {
            "current_password": "oldpassword",
            "new_password": "newpassword"
        }
        response = client.post("/api/auth/password/change", json=change_data)
        assert response.status_code == 401 
