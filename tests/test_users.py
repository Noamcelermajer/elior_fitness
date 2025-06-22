import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.auth import UserRole

def test_get_current_user(client, test_user, test_user_token):
    """Test getting current user information."""
    response = client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == test_user.email
    assert data["full_name"] == test_user.full_name
    assert data["role"] == test_user.role

def test_get_user_clients_as_trainer(client, test_trainer, test_trainer_token, test_user, db_session):
    """Test getting trainer's clients."""
    # Assign test_user as client to test_trainer
    test_user.trainer_id = test_trainer.id
    db_session.commit()

    response = client.get(
        "/api/users/clients",
        headers={"Authorization": f"Bearer {test_trainer_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    clients = response.json()
    assert len(clients) == 1
    assert clients[0]["email"] == test_user.email

def test_get_user_clients_as_client(client, test_user_token):
    """Test that clients cannot access client list."""
    response = client.get(
        "/api/users/clients",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_assign_client_to_trainer(client, test_trainer, test_trainer_token, test_user):
    """Test assigning a client to a trainer."""
    response = client.post(
        f"/api/users/trainer/{test_trainer.id}/clients/{test_user.id}",
        headers={"Authorization": f"Bearer {test_trainer_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["trainer_id"] == test_trainer.id

def test_assign_client_unauthorized(client, test_user_token, test_trainer, test_user):
    """Test that clients cannot assign other clients."""
    response = client.post(
        f"/api/users/trainer/{test_trainer.id}/clients/{test_user.id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_remove_client_from_trainer(client, test_trainer, test_trainer_token, test_user, db_session):
    """Test removing a client from a trainer."""
    # First assign the client
    test_user.trainer_id = test_trainer.id
    db_session.commit()

    response = client.delete(
        f"/api/users/trainer/{test_trainer.id}/clients/{test_user.id}",
        headers={"Authorization": f"Bearer {test_trainer_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["trainer_id"] is None

def test_remove_client_unauthorized(client, test_user_token, test_trainer, test_user, db_session):
    """Test that clients cannot remove other clients."""
    # First assign the client
    test_user.trainer_id = test_trainer.id
    db_session.commit()

    response = client.delete(
        f"/api/users/trainer/{test_trainer.id}/clients/{test_user.id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_get_user_profile(client, test_user, test_user_token):
    """Test getting user profile."""
    response = client.get(
        f"/api/users/{test_user.id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == test_user.email
    assert data["full_name"] == test_user.full_name

def test_update_user_profile(client, test_user, test_user_token):
    """Test updating user profile."""
    response = client.put(
        f"/api/users/{test_user.id}",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "full_name": "Updated Name",
            "email": test_user.email
        }
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] == "Updated Name"

def test_update_other_user_profile(client, test_user_token, test_trainer):
    """Test that users cannot update other users' profiles."""
    response = client.put(
        f"/api/users/{test_trainer.id}",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "full_name": "Hacked Name",
            "email": test_trainer.email
        }
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN

class TestUserManagement:
    """Test user management endpoints."""

    def test_get_users_trainer_access(self, client: TestClient, auth_headers_trainer):
        """Test that trainers can get all users."""
        response = client.get("/api/users/", headers=auth_headers_trainer)
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        # Should return at least the trainer themselves
        assert len(users) >= 1

    def test_get_users_client_denied(self, client: TestClient, auth_headers_client):
        """Test that clients cannot get all users."""
        response = client.get("/api/users/", headers=auth_headers_client)
        assert response.status_code == 403
        assert "only trainers can view all users" in response.json()["detail"].lower()

    def test_get_users_no_auth(self, client: TestClient):
        """Test getting users without authentication."""
        response = client.get("/api/users/")
        assert response.status_code == 401

    def test_get_trainer_clients_success(self, client: TestClient, auth_headers_trainer, test_client, test_trainer):
        """Test getting trainer's clients."""
        # Assign client to trainer
        client.trainer_id = test_trainer.id
        response = client.get("/api/users/clients", headers=auth_headers_trainer)
        assert response.status_code == 200
        clients = response.json()
        assert isinstance(clients, list)

    def test_get_trainer_clients_client_denied(self, client: TestClient, auth_headers_client):
        """Test that clients cannot get trainer clients."""
        response = client.get("/api/users/clients", headers=auth_headers_client)
        assert response.status_code == 403
        assert "only trainers can view their clients" in response.json()["detail"].lower()

    def test_assign_client_success(self, client: TestClient, auth_headers_trainer, test_client):
        """Test assigning a client to a trainer."""
        response = client.post(f"/api/users/clients/{test_client.id}/assign", headers=auth_headers_trainer)
        assert response.status_code == 200
        assert "Client assigned successfully" in response.json()["message"]

    def test_assign_client_trainer_denied(self, client: TestClient, auth_headers_client, test_trainer):
        """Test that clients cannot assign other clients."""
        response = client.post(f"/api/users/clients/{test_trainer.id}/assign", headers=auth_headers_client)
        assert response.status_code == 403
        assert "only trainers can assign clients" in response.json()["detail"].lower()

    def test_assign_nonexistent_client(self, client: TestClient, auth_headers_trainer):
        """Test assigning a nonexistent client."""
        response = client.post("/api/users/clients/999/assign", headers=auth_headers_trainer)
        assert response.status_code == 400

    def test_remove_client_success(self, client: TestClient, auth_headers_trainer, test_client, test_trainer):
        """Test removing a client from a trainer."""
        # First assign the client
        test_client.trainer_id = test_trainer.id
        response = client.post(f"/api/users/clients/{test_client.id}/remove", headers=auth_headers_trainer)
        assert response.status_code == 200
        assert "client removed successfully" in response.json()["message"]

    def test_remove_client_not_assigned(self, client: TestClient, auth_headers_trainer, test_client):
        """Test removing a client that's not assigned to the trainer."""
        response = client.post(f"/api/users/clients/{test_client.id}/remove", headers=auth_headers_trainer)
        assert response.status_code == 404
        assert "not assigned to you" in response.json()["detail"].lower()

    def test_remove_client_client_denied(self, client: TestClient, auth_headers_client, test_trainer):
        """Test that clients cannot remove other users."""
        response = client.post(f"/api/users/clients/{test_trainer.id}/remove", headers=auth_headers_client)
        assert response.status_code == 403
        assert "only trainers can remove clients" in response.json()["detail"].lower()

    def test_get_user_by_id_trainer_access(self, client: TestClient, auth_headers_trainer, test_client):
        """Test that trainers can get any user by ID."""
        response = client.get(f"/api/users/{test_client.id}", headers=auth_headers_trainer)
        assert response.status_code == 200
        user_data = response.json()
        assert user_data["id"] == test_client.id
        assert user_data["email"] == test_client.email

    def test_get_user_by_id_self_access(self, client: TestClient, auth_headers_client, test_client):
        """Test that users can get their own information."""
        response = client.get(f"/api/users/{test_client.id}", headers=auth_headers_client)
        assert response.status_code == 200
        user_data = response.json()
        assert user_data["id"] == test_client.id

    def test_get_user_by_id_other_denied(self, client: TestClient, auth_headers_client, test_trainer):
        """Test that users cannot get other users' information."""
        response = client.get(f"/api/users/{test_trainer.id}", headers=auth_headers_client)
        assert response.status_code == 403
        assert "access denied" in response.json()["detail"].lower()

    def test_get_nonexistent_user(self, client: TestClient, auth_headers_trainer):
        """Test getting a nonexistent user."""
        response = client.get("/api/users/999", headers=auth_headers_trainer)
        assert response.status_code == 404
        assert "user not found" in response.json()["detail"].lower()

    def test_delete_user_self(self, client: TestClient, auth_headers_client, test_client):
        """Test that users can delete themselves."""
        response = client.delete(f"/api/users/{test_client.id}", headers=auth_headers_client)
        assert response.status_code == 204

    def test_delete_user_trainer_delete_client(self, client: TestClient, auth_headers_trainer, test_client, test_trainer):
        """Test that trainers can delete their clients."""
        # Assign client to trainer
        test_client.trainer_id = test_trainer.id
        response = client.delete(f"/api/users/{test_client.id}", headers=auth_headers_trainer)
        assert response.status_code == 204

    def test_delete_user_unauthorized(self, client: TestClient, auth_headers_client, test_trainer):
        """Test that users cannot delete other users."""
        response = client.delete(f"/api/users/{test_trainer.id}", headers=auth_headers_client)
        assert response.status_code == 403
        assert "not authorized" in response.json()["detail"].lower()

    def test_delete_nonexistent_user(self, client: TestClient, auth_headers_trainer):
        """Test deleting a nonexistent user."""
        response = client.delete("/api/users/999", headers=auth_headers_trainer)
        assert response.status_code == 404

    def test_update_user_me_success(self, client: TestClient, auth_headers_trainer, test_trainer):
        """Test updating current user's information."""
        update_data = {"full_name": "Updated Trainer Name"}
        response = client.put("/api/users/me", json=update_data, headers=auth_headers_trainer)
        assert response.status_code == 200
        user_data = response.json()
        assert user_data["full_name"] == "Updated Trainer Name"

    def test_update_user_me_no_auth(self, client: TestClient):
        """Test updating user without authentication."""
        update_data = {"full_name": "Updated Name"}
        response = client.put("/api/users/me", json=update_data)
        assert response.status_code == 401

    def test_user_roles_validation(self, client: TestClient):
        """Test user role validation during registration."""
        invalid_role_data = {
            "email": "invalid@test.com",
            "password": "securepassword123",
            "full_name": "Invalid User",
            "role": "invalid_role"
        }
        response = client.post("/api/auth/register", json=invalid_role_data)
        assert response.status_code == 422

    def test_user_email_uniqueness(self, client: TestClient, test_trainer):
        """Test that email addresses must be unique."""
        duplicate_data = {
            "email": test_trainer.email,
            "password": "securepassword123",
            "full_name": "Duplicate User",
            "role": "client"
        }
        response = client.post("/api/auth/register", json=duplicate_data)
        assert response.status_code == 400
        assert "email already registered" in response.json()["detail"].lower()

    def test_user_password_hashing(self, client: TestClient):
        """Test that passwords are properly hashed."""
        user_data = {
            "email": "hash@test.com",
            "password": "testpassword123",
            "full_name": "Hash Test User",
            "role": "client"
        }
        response = client.post("/api/auth/register", json=user_data)
        assert response.status_code == 201
        # Verify password is not returned in response
        user_response = response.json()
        assert "password" not in user_response
        assert "hashed_password" not in user_response 