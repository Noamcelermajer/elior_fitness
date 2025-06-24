import pytest
import asyncio
from typing import Generator, AsyncGenerator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import os
import tempfile
import shutil
import uuid
import random
import string

from app.main import app
from app.database import Base, get_db, SessionLocal
from app.models.user import User, TrainerProfile, ClientProfile
from app.models.nutrition import NutritionPlan, Recipe, PlannedMeal, MealCompletion, WeighIn
from app.schemas.auth import UserRole
from app.services.auth_service import get_password_hash

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

def generate_unique_email():
    """Generate a unique email for testing."""
    random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"test_{random_suffix}@test.com"

def cleanup_test_data(session):
    """Clean up all test data from the database."""
    try:
        # Delete nutrition data first (due to foreign key constraints)
        # Delete in reverse order of dependencies
        session.query(MealCompletion).delete()
        session.query(PlannedMeal).delete()
        session.query(WeighIn).delete()
        session.query(Recipe).delete()
        session.query(NutritionPlan).delete()
        
        # Delete workout-related data that might reference users
        session.execute(text("DELETE FROM exercises WHERE created_by IN (SELECT id FROM users WHERE email LIKE '%test.com')"))
        session.execute(text("DELETE FROM workout_plans WHERE trainer_id IN (SELECT id FROM users WHERE email LIKE '%test.com')"))
        session.execute(text("DELETE FROM workout_sessions WHERE workout_plan_id IN (SELECT id FROM workout_plans WHERE trainer_id IN (SELECT id FROM users WHERE email LIKE '%test.com'))"))
        
        # Delete all test users (those with @test.com emails)
        session.query(User).filter(User.email.like("%test.com")).delete()
        session.commit()
    except Exception as e:
        print(f"Warning: Could not clean up test data: {e}")
        session.rollback()

def cleanup_uploaded_files():
    """Clean up uploaded files from test runs."""
    try:
        upload_dir = "uploads/meal_photos"
        if os.path.exists(upload_dir):
            for filename in os.listdir(upload_dir):
                if filename.startswith("test_"):
                    file_path = os.path.join(upload_dir, filename)
                    if os.path.isfile(file_path):
                        os.remove(file_path)
    except Exception as e:
        print(f"Warning: Could not clean up uploaded files: {e}")

@pytest.fixture(scope="function")
def db_session():
    """Create a database session for each test using the current database."""
    # Use the current database session
    session = SessionLocal()
    
    # Clean up before the test
    cleanup_test_data(session)
    cleanup_uploaded_files()
    
    try:
        yield session
    finally:
        # Clean up after the test
        cleanup_test_data(session)
        cleanup_uploaded_files()
        session.close()

@pytest.fixture(autouse=True)
def cleanup_database(db_session):
    """Clean up test data after each test."""
    yield
    # Clean up any test data
    cleanup_test_data(db_session)
    cleanup_uploaded_files()

@pytest.fixture(scope="function")
def client(db_session) -> Generator:
    """Create a test client with overridden database dependency."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    # Override the database dependency
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    # Clear the override after the test
    app.dependency_overrides.clear()

@pytest.fixture
def test_trainer_data():
    """Sample trainer data for testing."""
    return {
        "email": generate_unique_email(),
        "password": "testpassword123",
        "full_name": "Test Trainer",
        "role": "trainer"
    }

@pytest.fixture
def test_client_data():
    """Sample client data for testing."""
    return {
        "email": generate_unique_email(),
        "password": "testpassword123",
        "full_name": "Test Client",
        "role": "client"
    }

@pytest.fixture
def test_user_data():
    """Sample user data for testing."""
    return {
        "email": generate_unique_email(),
        "password": "testpassword123",
        "full_name": "Test User",
        "role": "client"
    }

@pytest.fixture
def test_trainer(db_session, test_trainer_data):
    """Create a test trainer in the database."""
    trainer = User(
        email=test_trainer_data["email"],
        hashed_password=get_password_hash(test_trainer_data["password"]),
        full_name=test_trainer_data["full_name"],
        role=UserRole.TRAINER,
        is_active=True
    )
    db_session.add(trainer)
    db_session.commit()
    db_session.refresh(trainer)
    return trainer

@pytest.fixture
def test_client(db_session, test_client_data):
    """Create a test client in the database."""
    client = User(
        email=test_client_data["email"],
        hashed_password=get_password_hash(test_client_data["password"]),
        full_name=test_client_data["full_name"],
        role=UserRole.CLIENT,
        is_active=True
    )
    db_session.add(client)
    db_session.commit()
    db_session.refresh(client)
    return client

@pytest.fixture
def test_user(db_session, test_user_data):
    """Create a test user in the database."""
    user = User(
        email=test_user_data["email"],
        hashed_password=get_password_hash(test_user_data["password"]),
        full_name=test_user_data["full_name"],
        role=UserRole.CLIENT,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def trainer_token(client, test_trainer_data):
    """Get authentication token for trainer."""
    # First register the trainer
    client.post("/api/auth/register", json=test_trainer_data)
    # Then login
    response = client.post("/api/auth/login", json=test_trainer_data)
    return response.json()["access_token"]

@pytest.fixture
def client_token(client, test_client_data):
    """Get authentication token for client."""
    # First register the client
    client.post("/api/auth/register", json=test_client_data)
    # Then login
    response = client.post("/api/auth/login", json=test_client_data)
    return response.json()["access_token"]

@pytest.fixture
def test_user_token(client, test_user_data):
    """Get authentication token for test user."""
    # First register the user
    client.post("/api/auth/register", json=test_user_data)
    # Then login
    response = client.post("/api/auth/login", json=test_user_data)
    return response.json()["access_token"]

@pytest.fixture
def test_trainer_token(client, test_trainer_data):
    """Get authentication token for test trainer."""
    # First register the trainer
    client.post("/api/auth/register", json=test_trainer_data)
    # Then login
    response = client.post("/api/auth/login", json=test_trainer_data)
    return response.json()["access_token"]

@pytest.fixture
def auth_headers_trainer(trainer_token):
    """Headers with trainer authentication."""
    return {"Authorization": f"Bearer {trainer_token}"}

@pytest.fixture
def auth_headers_client(client_token):
    """Headers with client authentication."""
    return {"Authorization": f"Bearer {client_token}"}

@pytest.fixture
def temp_upload_dir():
    """Create a temporary directory for file uploads during testing."""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir)
