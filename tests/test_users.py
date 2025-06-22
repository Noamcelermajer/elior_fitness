import pytest
from fastapi import status

def test_get_current_user(client, test_user, test_user_token):
    """Test getting current user information."""
    response = client.get(
        "/users/me",
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
        "/users/clients",
        headers={"Authorization": f"Bearer {test_trainer_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    clients = response.json()
    assert len(clients) == 1
    assert clients[0]["email"] == test_user.email

def test_get_user_clients_as_client(client, test_user_token):
    """Test that clients cannot access client list."""
    response = client.get(
        "/users/clients",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_assign_client_to_trainer(client, test_trainer, test_trainer_token, test_user):
    """Test assigning a client to a trainer."""
    response = client.post(
        f"/users/trainer/{test_trainer.id}/clients/{test_user.id}",
        headers={"Authorization": f"Bearer {test_trainer_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["trainer_id"] == test_trainer.id

def test_assign_client_unauthorized(client, test_user_token, test_trainer, test_user):
    """Test that clients cannot assign other clients."""
    response = client.post(
        f"/users/trainer/{test_trainer.id}/clients/{test_user.id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_remove_client_from_trainer(client, test_trainer, test_trainer_token, test_user, db_session):
    """Test removing a client from a trainer."""
    # First assign the client
    test_user.trainer_id = test_trainer.id
    db_session.commit()

    response = client.delete(
        f"/users/trainer/{test_trainer.id}/clients/{test_user.id}",
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
        f"/users/trainer/{test_trainer.id}/clients/{test_user.id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_get_user_profile(client, test_user, test_user_token):
    """Test getting user profile."""
    response = client.get(
        f"/users/{test_user.id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == test_user.email
    assert data["full_name"] == test_user.full_name

def test_update_user_profile(client, test_user, test_user_token):
    """Test updating user profile."""
    response = client.put(
        f"/users/{test_user.id}",
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
        f"/users/{test_trainer.id}",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={
            "full_name": "Hacked Name",
            "email": test_trainer.email
        }
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN 