import pytest
<<<<<<< HEAD
import asyncio
from typing import Generator, AsyncGenerator
=======
>>>>>>> e7ee85d4e4b297f901fe29f2e4e5f6d4468c8e89
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
<<<<<<< HEAD
import os
import tempfile
import shutil
import uuid

from app.main import app
from app.database import Base, get_db
from app.models.user import User, TrainerProfile, ClientProfile
from app.schemas.auth import UserRole
from app.services.auth_service import get_password_hash

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test if TEST_MODE is set, otherwise use the normal DB session."""
    test_mode = os.getenv("TEST_MODE", "false").lower() == "true"
    
    if test_mode:
        # Create a unique database file for each test
        test_db_path = f"./test_{uuid.uuid4().hex}.db"
        TEST_DATABASE_URL = f"sqlite:///{test_db_path}"
        
        # Create test engine
        test_engine = create_engine(
            TEST_DATABASE_URL,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        
        # Create test session
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
        
        # Create tables
        Base.metadata.create_all(bind=test_engine)
        
        # Create session
        session = TestingSessionLocal()
        
        try:
            yield session
        finally:
            session.close()
            # Drop tables and remove file
            Base.metadata.drop_all(bind=test_engine)
            test_engine.dispose()
            if os.path.exists(test_db_path):
                os.remove(test_db_path)
    else:
        # Use the normal DB session (no reset)
        from app.database import SessionLocal
        session = SessionLocal()
        try:
            yield session
        finally:
            session.close()

@pytest.fixture(scope="function")
def client(db_session) -> Generator:
    """Create a test client with overridden database dependency."""
=======
from app.main import app
from app.database import Base, get_db
from app.models.user import User
from app.auth.utils import get_password_hash

# Use in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    """Create a clean database session for a test."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with a clean database."""
>>>>>>> e7ee85d4e4b297f901fe29f2e4e5f6d4468c8e89
    def override_get_db():
        try:
            yield db_session
        finally:
<<<<<<< HEAD
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
        "email": "trainer@test.com",
        "password": "testpassword123",
        "full_name": "Test Trainer",
        "role": "trainer"
    }

@pytest.fixture
def test_client_data():
    """Sample client data for testing."""
    return {
        "email": "client@test.com",
        "password": "testpassword123",
        "full_name": "Test Client",
        "role": "client"
    }

@pytest.fixture
def test_user_data():
    """Sample user data for testing."""
    return {
        "email": "user@test.com",
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
=======
            db_session.close()
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def test_user(db_session):
    """Create a test user."""
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("testpassword"),
        full_name="Test User",
        role="CLIENT"
>>>>>>> e7ee85d4e4b297f901fe29f2e4e5f6d4468c8e89
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

<<<<<<< HEAD
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
=======
@pytest.fixture(scope="function")
def test_trainer(db_session):
    """Create a test trainer."""
    trainer = User(
        email="trainer@example.com",
        hashed_password=get_password_hash("trainerpassword"),
        full_name="Test Trainer",
        role="TRAINER"
    )
    db_session.add(trainer)
    db_session.commit()
    db_session.refresh(trainer)
    return trainer

@pytest.fixture(scope="function")
def test_user_token(client, test_user):
    """Get authentication token for test user."""
    response = client.post(
        "/auth/login",
        data={"username": test_user.email, "password": "testpassword"}
    )
    return response.json()["access_token"]

@pytest.fixture(scope="function")
def test_trainer_token(client, test_trainer):
    """Get authentication token for test trainer."""
    response = client.post(
        "/auth/login",
        data={"username": test_trainer.email, "password": "trainerpassword"}
    )
    return response.json()["access_token"] 
>>>>>>> e7ee85d4e4b297f901fe29f2e4e5f6d4468c8e89
