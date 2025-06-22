import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
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
    def override_get_db():
        try:
            yield db_session
        finally:
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
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

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