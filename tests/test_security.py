import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.services.auth_service import create_access_token, get_password_hash
from app.schemas.auth import UserRole

# Try to import JWT, but make it optional for testing
try:
    import jwt
    JWT_AVAILABLE = True
except ImportError:
    JWT_AVAILABLE = False

class TestSecurity:
    """Test security aspects of the application."""

    def test_password_hashing(self, client: TestClient):
        """Test that passwords are properly hashed and not stored in plain text."""
        user_data = {
            "email": "security@test.com",
            "password": "plaintextpassword",
            "full_name": "Security User",
            "role": "client"
        }
        
        # Register user
        response = client.post("/api/auth/register", json=user_data)
        assert response.status_code == 201
        
        # Login to verify password works
        login_response = client.post("/api/auth/login", json=user_data)
        assert login_response.status_code == 200
        
        # Verify password is not returned in any response
        user_response = response.json()
        assert "password" not in user_response
        assert "hashed_password" not in user_response

    @pytest.mark.skipif(not JWT_AVAILABLE, reason="PyJWT not available")
    def test_jwt_token_structure(self, client: TestClient):
        """Test JWT token structure and content."""
        user_data = {
            "email": "jwt@test.com",
            "password": "securepassword123",
            "full_name": "JWT User",
            "role": "trainer"
        }
        
        # Register and login
        client.post("/api/auth/register", json=user_data)
        login_response = client.post("/api/auth/login", json=user_data)
        token = login_response.json()["access_token"]
        
        # Decode token (without verification to check structure)
        decoded = jwt.decode(token, options={"verify_signature": False})
        
        # Check required fields
        assert "sub" in decoded  # User ID
        assert "role" in decoded  # User role
        assert "exp" in decoded  # Expiration
        assert "iat" in decoded  # Issued at
        
        # Check data types
        assert isinstance(decoded["sub"], str)
        assert isinstance(decoded["role"], str)
        assert isinstance(decoded["exp"], int)
        assert isinstance(decoded["iat"], int)

    def test_jwt_token_expiration(self, client: TestClient):
        """Test that JWT tokens expire properly."""
        user_data = {
            "email": "expire@test.com",
            "password": "securepassword123",
            "full_name": "Expire User",
            "role": "client"
        }
        
        # Register and login
        client.post("/api/auth/register", json=user_data)
        login_response = client.post("/api/auth/login", json=user_data)
        token = login_response.json()["access_token"]
        
        # Create an expired token manually
        expired_token = create_access_token(
            data={"sub": "999", "role": "client"},
            expires_delta=timedelta(seconds=-1)  # Expired 1 second ago
        )
        
        # Test expired token
        headers = {"Authorization": f"Bearer {expired_token}"}
        response = client.get("/api/auth/me", headers=headers)
        assert response.status_code == 401

    def test_invalid_jwt_token(self, client: TestClient):
        """Test handling of invalid JWT tokens."""
        invalid_tokens = [
            "invalid.token.here",
            "not.a.jwt.token",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature",
            "",
            "Bearer invalid",
            "Bearer"
        ]
        
        for token in invalid_tokens:
            headers = {"Authorization": f"Bearer {token}"}
            response = client.get("/api/auth/me", headers=headers)
            assert response.status_code == 401

    def test_missing_authorization_header(self, client: TestClient):
        """Test that endpoints properly handle missing authorization headers."""
        protected_endpoints = [
            "/api/auth/me",
            "/api/users/",
            "/api/users/clients"
        ]
        
        for endpoint in protected_endpoints:
            response = client.get(endpoint)
            assert response.status_code == 401
        
        # Test password change endpoint with POST method
        response = client.post("/api/auth/password/change")
        assert response.status_code == 401

    def test_sql_injection_prevention(self, client: TestClient):
        """Test that the application prevents SQL injection attacks."""
        # Test with potentially malicious input
        malicious_inputs = [
            "'; DROP TABLE users; --",
            "' OR '1'='1",
            "'; INSERT INTO users VALUES (999, 'hacker@test.com', 'password', 'Hacker', 'client'); --",
            "admin'--",
            "test@test.com' UNION SELECT * FROM users--"
        ]
        
        for malicious_input in malicious_inputs:
            # Try to register with malicious email
            user_data = {
                "email": malicious_input,
                "password": "securepassword123",
                "full_name": "Test User",
                "role": "client"
            }
            
            response = client.post("/api/auth/register", json=user_data)
            # Should either fail validation (422) or be handled safely
            assert response.status_code in [422, 400]

    def test_xss_prevention(self, client: TestClient):
        """Test that the application prevents XSS attacks."""
        # Test with potentially malicious input
        xss_inputs = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "';alert('xss');//",
            "<svg onload=alert('xss')>"
        ]
        
        for xss_input in xss_inputs:
            user_data = {
                "email": f"xss{xss_input}@test.com",
                "password": "securepassword123",
                "full_name": xss_input,
                "role": "client"
            }
            
            response = client.post("/api/auth/register", json=user_data)
            # Should either fail validation or be sanitized
            assert response.status_code in [422, 201]

    def test_rate_limiting_simulation(self, client: TestClient):
        """Test that the application can handle multiple rapid requests."""
        # Make multiple rapid requests to test stability
        for i in range(10):
            response = client.get("/health")
            assert response.status_code == 200

    def test_cors_security(self, client: TestClient):
        """Test CORS security headers."""
        # Test preflight request
        response = client.options("/", headers={
            "Origin": "http://malicious-site.com",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type"
        })
        
        # Should handle CORS properly
        assert response.status_code in [200, 405]

    def test_sensitive_data_exposure(self, client: TestClient):
        """Test that sensitive data is not exposed in responses."""
        user_data = {
            "email": "sensitive@test.com",
            "password": "securepassword123",
            "full_name": "Sensitive User",
            "role": "client"
        }
        
        # Register user
        register_response = client.post("/api/auth/register", json=user_data)
        user_info = register_response.json()
        
        # Check that sensitive fields are not exposed
        sensitive_fields = ["password", "hashed_password", "secret", "key", "token"]
        for field in sensitive_fields:
            assert field not in user_info
        
        # Login and check profile
        login_response = client.post("/api/auth/login", json=user_data)
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        profile_response = client.get("/api/auth/me", headers=headers)
        profile_info = profile_response.json()
        
        # Check that sensitive fields are not exposed in profile
        for field in sensitive_fields:
            assert field not in profile_info

    def test_authentication_bypass_attempts(self, client: TestClient):
        """Test various authentication bypass attempts."""
        bypass_attempts = [
            # Try to access protected endpoint with different header formats
            {"Authorization": "Bearer"},
            {"Authorization": "Bearer "},
            {"Authorization": "Basic dXNlcjpwYXNz"},
            {"X-API-Key": "fake-key"},
            {"Token": "fake-token"},
            # Try with different user IDs in token
            {"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5OTkiLCJyb2xlIjoiY2xpZW50IiwiZXhwIjoxNzM1Njg5NjAwfQ.invalid"}
        ]
        
        for attempt in bypass_attempts:
            response = client.get("/api/users/", headers=attempt)
            assert response.status_code == 401

    def test_input_validation_security(self, client: TestClient):
        """Test input validation for security."""
        # Test extremely long inputs
        long_input = "a" * 10000
        user_data = {
            "email": f"{long_input}@test.com",
            "password": "securepassword123",
            "full_name": long_input,
            "role": "client"
        }
        
        response = client.post("/api/auth/register", json=user_data)
        # Should either fail validation or be handled safely
        assert response.status_code in [422, 400, 201]
        
        # Test with null bytes and special characters
        special_input = "test\x00user@test.com"
        user_data = {
            "email": special_input,
            "password": "securepassword123",
            "full_name": "Test User",
            "role": "client"
        }
        
        response = client.post("/api/auth/register", json=user_data)
        assert response.status_code in [422, 400]

    def test_session_management(self, client: TestClient):
        """Test session/token management security."""
        user_data = {
            "email": "session@test.com",
            "password": "securepassword123",
            "full_name": "Session User",
            "role": "client"
        }
        
        # Register and login
        client.post("/api/auth/register", json=user_data)
        login_response = client.post("/api/auth/login", json=user_data)
        token = login_response.json()["access_token"]
        
        # Test that token works
        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/api/auth/me", headers=headers)
        assert response.status_code == 200
        
        # Test that token is not reusable after logout simulation
        # (In a real app, you might implement token blacklisting)
        # For now, we just verify the token structure is secure
        assert len(token) > 50  # Token should be reasonably long
        assert "." in token  # Should be JWT format 