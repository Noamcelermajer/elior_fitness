import pytest
<<<<<<< HEAD
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

class TestAuthentication:
    """Test authentication endpoints."""

    def test_register_trainer_success(self, client: TestClient):
        """Test successful trainer registration."""
        trainer_data = {
            "email": "newtrainer@test.com",
            "password": "securepassword123",
            "full_name": "New Trainer",
            "role": "trainer"
        }
        response = client.post("/api/auth/register", json=trainer_data)
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
            "email": "newclient@test.com",
            "password": "securepassword123",
            "full_name": "New Client",
            "role": "client"
        }
        response = client.post("/api/auth/register", json=client_data)
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
            "email": "weak@test.com",
            "password": "123",
            "full_name": "Weak User",
            "role": "client"
        }
        response = client.post("/api/auth/register", json=weak_password_data)
        assert response.status_code == 422

    def test_login_success_json(self, client: TestClient, test_trainer_data):
        """Test successful login with JSON."""
        response = client.post("/api/auth/login", json=test_trainer_data)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert len(data["access_token"]) > 0

    def test_login_success_form(self, client: TestClient, test_trainer_data):
        """Test successful login with form data."""
        form_data = {
            "username": test_trainer_data["email"],
            "password": test_trainer_data["password"]
        }
        response = client.post("/api/auth/token", data=form_data)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_invalid_credentials(self, client: TestClient):
        """Test login with invalid credentials."""
        invalid_data = {
            "email": "nonexistent@test.com",
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
=======
from fastapi import status
from app.services import password_service

def test_register_user(client):
    """Test user registration."""
    response = client.post(
        "/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "strongpassword123",
            "full_name": "New User",
            "role": "CLIENT"
        }
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["full_name"] == "New User"
    assert data["role"] == "CLIENT"
    assert "id" in data

def test_register_duplicate_email(client, test_user):
    """Test registration with existing email."""
    response = client.post(
        "/auth/register",
        json={
            "email": test_user.email,
            "password": "password123",
            "full_name": "Duplicate User",
            "role": "CLIENT"
        }
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST

def test_login_success(client, test_user):
    """Test successful login."""
    response = client.post(
        "/auth/login",
        data={"username": test_user.email, "password": "testpassword"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_invalid_credentials(client):
    """Test login with invalid credentials."""
    response = client.post(
        "/auth/login",
        data={"username": "wrong@example.com", "password": "wrongpassword"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_password_reset_request(client, test_user, monkeypatch):
    """Test password reset request."""
    # Mock email sending
    def mock_send_email(*args, **kwargs):
        return True
    monkeypatch.setattr(password_service, "send_password_reset_email", mock_send_email)
    
    response = client.post(
        "/auth/password-reset/request",
        json={"email": test_user.email}
    )
    assert response.status_code == status.HTTP_200_OK
    assert "message" in response.json()

def test_password_reset_nonexistent_email(client):
    """Test password reset request for non-existent email."""
    response = client.post(
        "/auth/password-reset/request",
        json={"email": "nonexistent@example.com"}
    )
    # Should still return 200 to prevent email enumeration
    assert response.status_code == status.HTTP_200_OK

def test_password_reset_verify(client, test_user, monkeypatch):
    """Test password reset verification."""
    # Create a real reset token
    reset_token = password_service.create_password_reset_token(test_user.email)
    
    response = client.post(
        "/auth/password-reset/verify",
        json={
            "token": reset_token,
            "new_password": "newpassword123"
        }
    )
    assert response.status_code == status.HTTP_200_OK
    
    # Try logging in with new password
    login_response = client.post(
        "/auth/login",
        data={"username": test_user.email, "password": "newpassword123"}
    )
    assert login_response.status_code == status.HTTP_200_OK

def test_password_reset_invalid_token(client):
    """Test password reset with invalid token."""
    response = client.post(
        "/auth/password-reset/verify",
        json={
            "token": "invalid-token",
            "new_password": "newpassword123"
        }
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST

def test_change_password(client, test_user_token):
    """Test password change for authenticated user."""
    response = client.post(
        "/auth/password/change",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "current_password": "testpassword",
            "new_password": "newpassword123"
        }
    )
    assert response.status_code == status.HTTP_200_OK
    
    # Try logging in with new password
    login_response = client.post(
        "/auth/login",
        data={"username": "test@example.com", "password": "newpassword123"}
    )
    assert login_response.status_code == status.HTTP_200_OK

def test_change_password_wrong_current(client, test_user_token):
    """Test password change with wrong current password."""
    response = client.post(
        "/auth/password/change",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "current_password": "wrongpassword",
            "new_password": "newpassword123"
        }
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST

def test_unauthorized_access(client):
    """Test accessing protected endpoint without token."""
    response = client.post("/auth/password/change")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_trainer_registration(client):
    """Test trainer registration."""
    response = client.post(
        "/auth/register",
        json={
            "email": "trainer2@example.com",
            "password": "trainerpass123",
            "full_name": "New Trainer",
            "role": "TRAINER"
        }
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["role"] == "TRAINER" 
>>>>>>> e7ee85d4e4b297f901fe29f2e4e5f6d4468c8e89
