import pytest
from sqlalchemy.orm import Session
from app.models.user import User, TrainerProfile, ClientProfile
from app.schemas.auth import UserRole
from app.services.auth_service import get_password_hash

class TestDatabaseOperations:
    """Test database operations and models."""

    def test_user_creation(self, db_session: Session):
        """Test creating a user in the database."""
        user_data = {
            "email": "test@example.com",
            "hashed_password": get_password_hash("testpassword"),
            "full_name": "Test User",
            "role": UserRole.CLIENT,
            "is_active": True
        }
        
        user = User(**user_data)
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        
        assert user.id is not None
        assert user.email == user_data["email"]
        assert user.full_name == user_data["full_name"]
        assert user.role == UserRole.CLIENT
        assert user.is_active is True
        assert user.created_at is not None

    def test_trainer_profile_creation(self, db_session: Session):
        """Test creating a trainer profile."""
        # First create a trainer user
        trainer = User(
            email="trainer@example.com",
            hashed_password=get_password_hash("password"),
            full_name="Test Trainer",
            role=UserRole.TRAINER
        )
        db_session.add(trainer)
        db_session.commit()
        db_session.refresh(trainer)
        
        # Create trainer profile
        profile = TrainerProfile(
            user_id=trainer.id,
            specialization="Strength Training",
            bio="Experienced trainer",
            years_of_experience=5,
            certification="ACE Certified"
        )
        db_session.add(profile)
        db_session.commit()
        db_session.refresh(profile)
        
        assert profile.id is not None
        assert profile.user_id == trainer.id
        assert profile.specialization == "Strength Training"
        assert profile.years_of_experience == 5

    def test_client_profile_creation(self, db_session: Session):
        """Test creating a client profile."""
        # First create a trainer and client
        trainer = User(
            email="trainer@example.com",
            hashed_password=get_password_hash("password"),
            full_name="Test Trainer",
            role=UserRole.TRAINER
        )
        db_session.add(trainer)
        db_session.commit()
        db_session.refresh(trainer)
        
        client = User(
            email="client@example.com",
            hashed_password=get_password_hash("password"),
            full_name="Test Client",
            role=UserRole.CLIENT,
            trainer_id=trainer.id
        )
        db_session.add(client)
        db_session.commit()
        db_session.refresh(client)
        
        # Create client profile
        profile = ClientProfile(
            user_id=client.id,
            trainer_id=trainer.id,
            height=175,
            target_weight=70000,  # 70kg in grams
            fitness_goals="Build muscle and lose fat",
            medical_conditions="None",
            dietary_restrictions="Vegetarian"
        )
        db_session.add(profile)
        db_session.commit()
        db_session.refresh(profile)
        
        assert profile.id is not None
        assert profile.user_id == client.id
        assert profile.trainer_id == trainer.id
        assert profile.height == 175
        assert profile.target_weight == 70000

    def test_trainer_client_relationship(self, db_session: Session):
        """Test trainer-client relationship."""
        # Create trainer
        trainer = User(
            email="trainer@example.com",
            hashed_password=get_password_hash("password"),
            full_name="Test Trainer",
            role=UserRole.TRAINER
        )
        db_session.add(trainer)
        db_session.commit()
        db_session.refresh(trainer)
        
        # Create clients
        client1 = User(
            email="client1@example.com",
            hashed_password=get_password_hash("password"),
            full_name="Client 1",
            role=UserRole.CLIENT,
            trainer_id=trainer.id
        )
        client2 = User(
            email="client2@example.com",
            hashed_password=get_password_hash("password"),
            full_name="Client 2",
            role=UserRole.CLIENT,
            trainer_id=trainer.id
        )
        
        db_session.add_all([client1, client2])
        db_session.commit()
        db_session.refresh(trainer)
        
        # Test relationship
        assert len(trainer.clients) == 2
        assert client1 in trainer.clients
        assert client2 in trainer.clients
        assert client1.trainer == trainer
        assert client2.trainer == trainer

    def test_user_role_enum(self, db_session: Session):
        """Test user role enum values."""
        trainer = User(
            email="trainer@example.com",
            hashed_password=get_password_hash("password"),
            full_name="Test Trainer",
            role=UserRole.TRAINER
        )
        client = User(
            email="client@example.com",
            hashed_password=get_password_hash("password"),
            full_name="Test Client",
            role=UserRole.CLIENT
        )
        
        db_session.add_all([trainer, client])
        db_session.commit()
        
        assert trainer.role == "trainer"
        assert client.role == "client"
        assert trainer.role == UserRole.TRAINER
        assert client.role == UserRole.CLIENT

    def test_user_timestamps(self, db_session: Session):
        """Test that user timestamps are automatically set."""
        user = User(
            email="timestamp@example.com",
            hashed_password=get_password_hash("password"),
            full_name="Timestamp User",
            role=UserRole.CLIENT
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        
        assert user.created_at is not None
        assert user.updated_at is None  # Should be None initially
        
        # Update user to trigger updated_at
        user.full_name = "Updated Name"
        db_session.commit()
        db_session.refresh(user)
        
        assert user.updated_at is not None

    def test_user_email_uniqueness(self, db_session: Session):
        """Test that email addresses must be unique."""
        user1 = User(
            email="unique@example.com",
            hashed_password=get_password_hash("password"),
            full_name="User 1",
            role=UserRole.CLIENT
        )
        db_session.add(user1)
        db_session.commit()
        
        # Try to create another user with the same email
        user2 = User(
            email="unique@example.com",
            hashed_password=get_password_hash("password"),
            full_name="User 2",
            role=UserRole.CLIENT
        )
        db_session.add(user2)
        
        with pytest.raises(Exception):  # Should raise integrity error
            db_session.commit()

    def test_user_deletion(self, db_session: Session):
        """Test user deletion."""
        user = User(
            email="delete@example.com",
            hashed_password=get_password_hash("password"),
            full_name="Delete User",
            role=UserRole.CLIENT
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        
        user_id = user.id
        db_session.delete(user)
        db_session.commit()
        
        # Verify user is deleted
        deleted_user = db_session.query(User).filter(User.id == user_id).first()
        assert deleted_user is None

    def test_user_query_by_email(self, db_session: Session):
        """Test querying user by email."""
        user = User(
            email="query@example.com",
            hashed_password=get_password_hash("password"),
            full_name="Query User",
            role=UserRole.CLIENT
        )
        db_session.add(user)
        db_session.commit()
        
        # Query by email
        found_user = db_session.query(User).filter(User.email == "query@example.com").first()
        assert found_user is not None
        assert found_user.id == user.id
        assert found_user.full_name == "Query User"

    def test_user_query_by_role(self, db_session: Session):
        """Test querying users by role."""
        trainer = User(
            email="trainer@example.com",
            hashed_password=get_password_hash("password"),
            full_name="Test Trainer",
            role=UserRole.TRAINER
        )
        client = User(
            email="client@example.com",
            hashed_password=get_password_hash("password"),
            full_name="Test Client",
            role=UserRole.CLIENT
        )
        
        db_session.add_all([trainer, client])
        db_session.commit()
        
        # Query trainers
        trainers = db_session.query(User).filter(User.role == UserRole.TRAINER).all()
        assert len(trainers) == 1
        assert trainers[0].email == "trainer@example.com"
        
        # Query clients
        clients = db_session.query(User).filter(User.role == UserRole.CLIENT).all()
        assert len(clients) == 1
        assert clients[0].email == "client@example.com" 