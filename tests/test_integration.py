import pytest
import uuid
from fastapi.testclient import TestClient

class TestIntegrationFlows:
    """Test complete integration flows."""

    def test_complete_user_registration_and_login_flow(self, client: TestClient):
        """Test complete flow: register user -> login -> get profile."""
        # Step 1: Register a new trainer
        trainer_data = {
            "email": f"integration_{uuid.uuid4().hex}@test.com",
            "password": "securepassword123",
            "full_name": "Integration Trainer",
            "role": "trainer"
        }
        register_response = client.post("/api/auth/register", json=trainer_data)
        assert register_response.status_code == 201
        trainer_info = register_response.json()
        assert trainer_info["email"] == trainer_data["email"]
        assert trainer_info["role"] == "trainer"
        
        # Step 2: Login with the new user
        login_response = client.post("/api/auth/login", json=trainer_data)
        assert login_response.status_code == 200
        token_data = login_response.json()
        assert "access_token" in token_data
        access_token = token_data["access_token"]
        
        # Step 3: Get current user profile
        headers = {"Authorization": f"Bearer {access_token}"}
        profile_response = client.get("/api/auth/me", headers=headers)
        assert profile_response.status_code == 200
        profile_data = profile_response.json()
        assert profile_data["email"] == trainer_data["email"]
        assert profile_data["full_name"] == trainer_data["full_name"]
        assert profile_data["role"] == "trainer"

    def test_trainer_client_management_flow(self, client: TestClient):
        """Test complete flow: register trainer and client -> assign client -> manage relationship."""
        # Step 1: Register trainer
        trainer_data = {
            "email": f"trainer_{uuid.uuid4().hex}@integration.com",
            "password": "securepassword123",
            "full_name": "Integration Trainer",
            "role": "trainer"
        }
        trainer_response = client.post("/api/auth/register", json=trainer_data)
        assert trainer_response.status_code == 201
        trainer_info = trainer_response.json()
        
        # Step 2: Register client
        client_data = {
            "email": f"client_{uuid.uuid4().hex}@integration.com",
            "password": "securepassword123",
            "full_name": "Integration Client",
            "role": "client"
        }
        client_response = client.post("/api/auth/register", json=client_data)
        assert client_response.status_code == 201
        client_info = client_response.json()
        
        # Step 3: Login as trainer
        trainer_login = client.post("/api/auth/login", json=trainer_data)
        assert trainer_login.status_code == 200
        trainer_token = trainer_login.json()["access_token"]
        trainer_headers = {"Authorization": f"Bearer {trainer_token}"}
        
        # Step 4: Assign client to trainer
        assign_response = client.post(
            f"/api/users/clients/{client_info['id']}/assign",
            headers=trainer_headers
        )
        assert assign_response.status_code == 200
        
        # Step 5: Get trainer's clients
        clients_response = client.get("/api/users/clients", headers=trainer_headers)
        assert clients_response.status_code == 200
        clients = clients_response.json()
        assert len(clients) == 1
        assert clients[0]["id"] == client_info["id"]
        assert clients[0]["email"] == client_data["email"]
        
        # Step 6: Get specific client details
        client_detail_response = client.get(
            f"/api/users/{client_info['id']}",
            headers=trainer_headers
        )
        assert client_detail_response.status_code == 200
        client_detail = client_detail_response.json()
        assert client_detail["id"] == client_info["id"]
        
        # Step 7: Remove client from trainer
        remove_response = client.post(
            f"/api/users/clients/{client_info['id']}/remove",
            headers=trainer_headers
        )
        assert remove_response.status_code == 200
        
        # Step 8: Verify client is removed
        clients_after_remove = client.get("/api/users/clients", headers=trainer_headers)
        assert clients_after_remove.status_code == 200
        clients_list = clients_after_remove.json()
        assert len(clients_list) == 0

    def test_authentication_and_authorization_flow(self, client: TestClient):
        """Test authentication and authorization flow with different user roles."""
        # Step 1: Register trainer and client
        trainer_data = {
            "email": f"auth_{uuid.uuid4().hex}@trainer.com",
            "password": "securepassword123",
            "full_name": "Auth Trainer",
            "role": "trainer"
        }
        client_data = {
            "email": f"auth_{uuid.uuid4().hex}@client.com",
            "password": "securepassword123",
            "full_name": "Auth Client",
            "role": "client"
        }
        
        trainer_response = client.post("/api/auth/register", json=trainer_data)
        client_response = client.post("/api/auth/register", json=client_data)
        assert trainer_response.status_code == 201
        assert client_response.status_code == 201
        
        trainer_info = trainer_response.json()
        client_info = client_response.json()
        
        # Step 2: Login as trainer
        trainer_login = client.post("/api/auth/login", json=trainer_data)
        trainer_token = trainer_login.json()["access_token"]
        trainer_headers = {"Authorization": f"Bearer {trainer_token}"}
        
        # Step 3: Login as client
        client_login = client.post("/api/auth/login", json=client_data)
        client_token = client_login.json()["access_token"]
        client_headers = {"Authorization": f"Bearer {client_token}"}
        
        # Step 4: Test trainer permissions
        # Trainer should be able to get all users
        all_users_response = client.get("/api/users/", headers=trainer_headers)
        assert all_users_response.status_code == 200
        
        # Trainer should be able to view any user
        trainer_view_client = client.get(f"/api/users/{client_info['id']}", headers=trainer_headers)
        assert trainer_view_client.status_code == 200
        
        # Step 5: Test client permissions
        # Client should not be able to get all users
        client_all_users = client.get("/api/users/", headers=client_headers)
        assert client_all_users.status_code == 403
        
        # Client should be able to view themselves
        client_view_self = client.get(f"/api/users/{client_info['id']}", headers=client_headers)
        assert client_view_self.status_code == 200
        
        # Client should not be able to view trainer
        client_view_trainer = client.get(f"/api/users/{trainer_info['id']}", headers=client_headers)
        assert client_view_trainer.status_code == 403

    def test_password_management_flow(self, client: TestClient):
        """Test complete password management flow."""
        # Step 1: Register user
        user_data = {
            "email": f"password_{uuid.uuid4().hex}@test.com",
            "password": "initialpassword123",
            "full_name": "Password User",
            "role": "client"
        }
        register_response = client.post("/api/auth/register", json=user_data)
        assert register_response.status_code == 201
        
        # Step 2: Login with initial password
        login_response = client.post("/api/auth/login", json=user_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Step 3: Change password
        change_data = {
            "current_password": "initialpassword123",
            "new_password": "newpassword123"
        }
        change_response = client.post("/api/auth/password/change", json=change_data, headers=headers)
        assert change_response.status_code == 200
        
        # Step 4: Try to login with old password (should fail)
        old_password_login = client.post("/api/auth/login", json=user_data)
        assert old_password_login.status_code == 401
        
        # Step 5: Login with new password (should succeed)
        new_user_data = {
            "email": user_data["email"],
            "password": "newpassword123"
        }
        new_login_response = client.post("/api/auth/login", json=new_user_data)
        assert new_login_response.status_code == 200

    def test_error_handling_flow(self, client: TestClient):
        """Test error handling in various scenarios."""
        # Test 1: Invalid registration data
        invalid_data = {
            "email": "invalid-email",
            "password": "123",  # Too short
            "full_name": "",
            "role": "invalid_role"
        }
        response = client.post("/api/auth/register", json=invalid_data)
        assert response.status_code == 422
        
        # Test 2: Duplicate email registration
        user_data = {
            "email": f"duplicate_{uuid.uuid4().hex}@test.com",
            "password": "securepassword123",
            "full_name": "First User",
            "role": "client"
        }
        first_response = client.post("/api/auth/register", json=user_data)
        assert first_response.status_code == 201
        
        duplicate_data = {
            "email": user_data["email"],  # Use the same email to test duplicate
            "password": "securepassword123",
            "full_name": "Second User",
            "role": "client"
        }
        second_response = client.post("/api/auth/register", json=duplicate_data)
        assert second_response.status_code == 400
        
        # Test 3: Access protected endpoint without token
        protected_response = client.get("/api/users/")
        assert protected_response.status_code == 401
        
        # Test 4: Access protected endpoint with invalid token
        invalid_headers = {"Authorization": "Bearer invalid_token"}
        invalid_token_response = client.get("/api/users/", headers=invalid_headers)
        assert invalid_token_response.status_code == 401
        
        # Test 5: Access non-existent resource
        login_response = client.post("/api/auth/login", json=user_data)
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        nonexistent_response = client.get("/api/users/999", headers=headers)
        assert nonexistent_response.status_code == 404

    def test_concurrent_user_operations(self, client: TestClient):
        """Test concurrent user operations to ensure data consistency."""
        # Register multiple users concurrently
        users_data = [
            {
                "email": f"concurrent_{i}_{uuid.uuid4().hex}@test.com",
                "password": "securepassword123",
                "full_name": f"Concurrent User {i}",
                "role": "client"
            }
            for i in range(5)
        ]
        
        # Register all users
        responses = []
        for user_data in users_data:
            response = client.post("/api/auth/register", json=user_data)
            responses.append(response)
        
        # All registrations should succeed
        for response in responses:
            assert response.status_code == 201
        
        # Login with all users
        tokens = []
        for user_data in users_data:
            login_response = client.post("/api/auth/login", json=user_data)
            assert login_response.status_code == 200
            token = login_response.json()["access_token"]
            tokens.append(token)
        
        # All tokens should be valid
        for token in tokens:
            headers = {"Authorization": f"Bearer {token}"}
            profile_response = client.get("/api/auth/me", headers=headers)
            assert profile_response.status_code == 200 