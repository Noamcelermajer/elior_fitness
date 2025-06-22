import pytest
import time
from fastapi.testclient import TestClient

class TestPerformance:
    """Test performance aspects of the application."""

    def test_health_check_performance(self, client: TestClient):
        """Test that health check endpoint responds quickly."""
        start_time = time.time()
        response = client.get("/health")
        end_time = time.time()
        
        assert response.status_code == 200
        response_time = end_time - start_time
        assert response_time < 0.1  # Should respond in under 100ms

    def test_registration_performance(self, client: TestClient):
        """Test user registration performance."""
        user_data = {
            "email": "perf@test.com",
            "password": "securepassword123",
            "full_name": "Performance User",
            "role": "client"
        }
        
        start_time = time.time()
        response = client.post("/api/auth/register", json=user_data)
        end_time = time.time()
        
        assert response.status_code == 201
        response_time = end_time - start_time
        assert response_time < 1.0  # Should complete in under 1 second

    def test_login_performance(self, client: TestClient):
        """Test login performance."""
        # First register a user
        user_data = {
            "email": "loginperf@test.com",
            "password": "securepassword123",
            "full_name": "Login Performance User",
            "role": "client"
        }
        client.post("/api/auth/register", json=user_data)
        
        # Test login performance
        start_time = time.time()
        response = client.post("/api/auth/login", json=user_data)
        end_time = time.time()
        
        assert response.status_code == 200
        response_time = end_time - start_time
        assert response_time < 0.5  # Should complete in under 500ms

    def test_concurrent_registrations(self, client: TestClient):
        """Test handling multiple concurrent registrations."""
        import threading
        import queue
        
        results = queue.Queue()
        
        def register_user(user_id):
            user_data = {
                "email": f"concurrent{user_id}@test.com",
                "password": "securepassword123",
                "full_name": f"Concurrent User {user_id}",
                "role": "client"
            }
            response = client.post("/api/auth/register", json=user_data)
            results.put((user_id, response.status_code))
        
        # Start multiple threads
        threads = []
        for i in range(5):
            thread = threading.Thread(target=register_user, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Check results
        successful_registrations = 0
        while not results.empty():
            user_id, status_code = results.get()
            if status_code == 201:
                successful_registrations += 1
        
        # All registrations should succeed
        assert successful_registrations == 5

    def test_database_query_performance(self, client: TestClient):
        """Test database query performance."""
        # Create multiple users first
        users_data = [
            {
                "email": f"queryperf{i}@test.com",
                "password": "securepassword123",
                "full_name": f"Query Performance User {i}",
                "role": "client"
            }
            for i in range(10)
        ]
        
        # Register all users
        for user_data in users_data:
            client.post("/api/auth/register", json=user_data)
        
        # Login as one user to get token
        login_response = client.post("/api/auth/login", json=users_data[0])
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test query performance
        start_time = time.time()
        response = client.get("/api/users/", headers=headers)
        end_time = time.time()
        
        assert response.status_code == 200
        response_time = end_time - start_time
        assert response_time < 0.5  # Should complete in under 500ms

    def test_memory_usage_simulation(self, client: TestClient):
        """Test that the application doesn't have memory leaks."""
        # Perform multiple operations to simulate memory usage
        for i in range(50):
            user_data = {
                "email": f"memory{i}@test.com",
                "password": "securepassword123",
                "full_name": f"Memory Test User {i}",
                "role": "client"
            }
            
            # Register user
            register_response = client.post("/api/auth/register", json=user_data)
            assert register_response.status_code == 201
            
            # Login
            login_response = client.post("/api/auth/login", json=user_data)
            assert login_response.status_code == 200
            
            # Get profile
            token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            profile_response = client.get("/api/auth/me", headers=headers)
            assert profile_response.status_code == 200

    def test_response_size_optimization(self, client: TestClient):
        """Test that responses are reasonably sized."""
        user_data = {
            "email": "size@test.com",
            "password": "securepassword123",
            "full_name": "Size Test User",
            "role": "client"
        }
        
        # Register user
        register_response = client.post("/api/auth/register", json=user_data)
        response_content = register_response.content
        
        # Check response size
        assert len(response_content) < 1000  # Should be under 1KB
        
        # Login and check profile response size
        login_response = client.post("/api/auth/login", json=user_data)
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        profile_response = client.get("/api/auth/me", headers=headers)
        profile_content = profile_response.content
        
        assert len(profile_content) < 1000  # Should be under 1KB

    def test_error_response_performance(self, client: TestClient):
        """Test that error responses are also fast."""
        # Test invalid login performance
        invalid_data = {
            "email": "nonexistent@test.com",
            "password": "wrongpassword"
        }
        
        start_time = time.time()
        response = client.post("/api/auth/login", json=invalid_data)
        end_time = time.time()
        
        assert response.status_code == 401
        response_time = end_time - start_time
        assert response_time < 0.5  # Should complete in under 500ms

    def test_static_file_performance(self, client: TestClient):
        """Test static file serving performance."""
        start_time = time.time()
        response = client.get("/uploads/")
        end_time = time.time()
        
        response_time = end_time - start_time
        assert response_time < 0.1  # Should respond quickly

    def test_api_documentation_performance(self, client: TestClient):
        """Test API documentation loading performance."""
        start_time = time.time()
        response = client.get("/docs")
        end_time = time.time()
        
        assert response.status_code == 200
        response_time = end_time - start_time
        assert response_time < 1.0  # Should load in under 1 second

    def test_openapi_schema_performance(self, client: TestClient):
        """Test OpenAPI schema generation performance."""
        start_time = time.time()
        response = client.get("/openapi.json")
        end_time = time.time()
        
        assert response.status_code == 200
        response_time = end_time - start_time
        assert response_time < 0.5  # Should generate in under 500ms

    @pytest.mark.slow
    def test_stress_test(self, client: TestClient):
        """Stress test the application with many requests."""
        # Create a user for testing
        user_data = {
            "email": "stress@test.com",
            "password": "securepassword123",
            "full_name": "Stress Test User",
            "role": "client"
        }
        client.post("/api/auth/register", json=user_data)
        login_response = client.post("/api/auth/login", json=user_data)
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Make many requests
        start_time = time.time()
        successful_requests = 0
        
        for i in range(100):
            response = client.get("/api/auth/me", headers=headers)
            if response.status_code == 200:
                successful_requests += 1
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Should handle stress well
        assert successful_requests == 100  # All requests should succeed
        assert total_time < 10.0  # Should complete in under 10 seconds
        assert total_time / 100 < 0.1  # Average response time under 100ms 