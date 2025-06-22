import pytest
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