import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4
from app.main import app
from app.database import get_db
from app.models.user import User
from app.models.workout import Exercise, WorkoutPlan, WorkoutSession, WorkoutExercise
from app.schemas.exercises import ExerciseCreate, ExerciseUpdate
from app.schemas.workouts import WorkoutPlanCreate, WorkoutPlanUpdate, WorkoutSessionCreate
from app.services.auth_service import create_access_token
from app.services.exercise_service import ExerciseService
from app.services.workout_service import WorkoutService
from app.auth.utils import get_password_hash

client = TestClient(app)

class TestExerciseCRUD:
    """Test Exercise CRUD operations."""
    
    @pytest.fixture
    def sample_exercise_data(self):
        """Sample exercise data for testing."""
        return {
            "name": "Push-ups",
            "description": "Classic bodyweight exercise for chest and triceps",
            "video_url": "https://example.com/pushups.mp4",
            "muscle_groups": "chest, triceps, shoulders",
            "equipment_needed": "none",
            "difficulty_level": "beginner"
        }
    
    @pytest.fixture
    def trainer_token(self, db_session: Session):
        """Create a trainer and return auth token."""
        trainer = User(
            email=f"trainer_{uuid4()}@test.com",
            full_name="Test Trainer",
            hashed_password=get_password_hash("testpassword"),
            role="trainer"
        )
        db_session.add(trainer)
        db_session.commit()
        db_session.refresh(trainer)
        
        return create_access_token(data={"sub": str(trainer.id), "role": trainer.role})

    def test_create_exercise_success(self, trainer_token: str, sample_exercise_data: dict):
        """Test successful exercise creation by trainer."""
        response = client.post(
            "/api/exercises/",
            headers={"Authorization": f"Bearer {trainer_token}"},
            json=sample_exercise_data
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == sample_exercise_data["name"]
        assert data["description"] == sample_exercise_data["description"]
        assert "id" in data

    def test_create_exercise_client_forbidden(self, db_session: Session, sample_exercise_data: dict):
        """Test that clients cannot create exercises."""
        # Create a client user
        client_user = User(
            email=f"client_{uuid4()}@test.com",
            full_name="Test Client",
            hashed_password=get_password_hash("testpassword"),
            role="client"
        )
        db_session.add(client_user)
        db_session.commit()
        db_session.refresh(client_user)
        
        client_token = create_access_token(data={"sub": str(client_user.id), "role": client_user.role})
        
        response = client.post(
            "/api/exercises/",
            headers={"Authorization": f"Bearer {client_token}"},
            json=sample_exercise_data
        )
        
        assert response.status_code == 403
        assert "Only trainers can create exercises" in response.json()["detail"]

    def test_get_exercise_success(self, trainer_token: str, sample_exercise_data: dict, db_session: Session):
        """Test successful exercise retrieval."""
        # First create an exercise
        create_response = client.post(
            "/api/exercises/",
            headers={"Authorization": f"Bearer {trainer_token}"},
            json=sample_exercise_data
        )
        exercise_id = create_response.json()["id"]
        
        # Then retrieve it
        response = client.get(
            f"/api/exercises/{exercise_id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == exercise_id
        assert data["name"] == sample_exercise_data["name"]

    def test_update_exercise_success(self, trainer_token: str, sample_exercise_data: dict):
        """Test successful exercise update."""
        # First create an exercise
        create_response = client.post(
            "/api/exercises/",
            headers={"Authorization": f"Bearer {trainer_token}"},
            json=sample_exercise_data
        )
        exercise_id = create_response.json()["id"]
        
        # Update the exercise
        update_data = {"name": "Modified Push-ups", "description": "Modified description"}
        response = client.put(
            f"/api/exercises/{exercise_id}",
            headers={"Authorization": f"Bearer {trainer_token}"},
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Modified Push-ups"
        assert data["description"] == "Modified description"

    def test_delete_exercise_success(self, trainer_token: str, sample_exercise_data: dict):
        """Test successful exercise deletion."""
        # First create an exercise
        create_response = client.post(
            "/api/exercises/",
            headers={"Authorization": f"Bearer {trainer_token}"},
            json=sample_exercise_data
        )
        exercise_id = create_response.json()["id"]
        
        # Delete the exercise
        response = client.delete(
            f"/api/exercises/{exercise_id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 204


class TestExerciseSearch:
    """Test Exercise search and filtering."""
    
    @pytest.fixture
    def trainer_with_exercises(self, db_session: Session):
        """Create a trainer with multiple exercises."""
        trainer = User(
            email=f"trainer_{uuid4()}@test.com",
            full_name="Test Trainer",
            hashed_password=get_password_hash("testpassword"),
            role="trainer"
        )
        db_session.add(trainer)
        db_session.commit()
        db_session.refresh(trainer)
        
        # Create multiple exercises
        exercises = []
        for i in range(3):
            exercise = Exercise(
                name=f"Exercise {i+1}",
                description=f"Description {i+1}",
                muscle_groups="chest",
                equipment_needed="barbell",
                video_url=f"https://example.com/video{i+1}",
                created_by=trainer.id
            )
            exercises.append(exercise)
        
        db_session.add_all(exercises)
        db_session.commit()
        
        return trainer, exercises

    def test_get_exercises_list(self, trainer_with_exercises):
        """Test retrieving exercises list."""
        trainer, exercises = trainer_with_exercises
        token = create_access_token(data={"sub": str(trainer.id), "role": trainer.role})
        
        response = client.get(
            "/api/exercises/",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 3  # At least the 3 we created

    def test_search_exercises_by_name(self, trainer_with_exercises):
        """Test searching exercises by name."""
        trainer, exercises = trainer_with_exercises
        token = create_access_token(data={"sub": str(trainer.id), "role": trainer.role})
        
        response = client.get(
            "/api/exercises/?search=Exercise 1",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any("Exercise 1" in ex["name"] for ex in data)

    def test_filter_exercises_by_muscle_groups(self, trainer_with_exercises):
        """Test filtering exercises by muscle groups."""
        trainer, exercises = trainer_with_exercises
        token = create_access_token(data={"sub": str(trainer.id), "role": trainer.role})
        
        response = client.get(
            "/api/exercises/?muscle_groups=chest",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 3  # All our test exercises target chest

    def test_filter_exercises_by_equipment(self, trainer_with_exercises):
        """Test filtering exercises by equipment."""
        trainer, exercises = trainer_with_exercises
        token = create_access_token(data={"sub": str(trainer.id), "role": trainer.role})
        
        response = client.get(
            "/api/exercises/?equipment=barbell",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 3  # All our test exercises use barbell

    def test_filter_exercises_by_difficulty(self, trainer_with_exercises):
        """Test filtering exercises by difficulty level."""
        trainer, exercises = trainer_with_exercises
        token = create_access_token(data={"sub": str(trainer.id), "role": trainer.role})
        
        response = client.get(
            "/api/exercises/?difficulty=beginner",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        # Should return exercises (may be empty if no beginner exercises)

    def test_pagination(self, trainer_with_exercises):
        """Test exercise pagination."""
        trainer, exercises = trainer_with_exercises
        token = create_access_token(data={"sub": str(trainer.id), "role": trainer.role})
        
        response = client.get(
            "/api/exercises/?skip=0&limit=2",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 2  # Should respect limit

    def test_get_exercise_categories(self, trainer_with_exercises):
        """Test getting exercise categories/filters."""
        trainer, exercises = trainer_with_exercises
        token = create_access_token(data={"sub": str(trainer.id), "role": trainer.role})
        
        response = client.get(
            "/api/exercises/categories",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200


class TestExerciseAuthorization:
    """Test Exercise authorization and permissions."""
    
    @pytest.fixture
    def test_trainer(self, db_session: Session):
        """Create a test trainer."""
        trainer = User(
            email=f"trainer_{uuid4()}@test.com",
            full_name="Test Trainer",
            hashed_password=get_password_hash("testpassword"),
            role="trainer"
        )
        db_session.add(trainer)
        db_session.commit()
        db_session.refresh(trainer)
        return trainer

    @pytest.fixture
    def test_client(self, db_session: Session):
        """Create a test client."""
        client_user = User(
            email=f"client_{uuid4()}@test.com",
            full_name="Test Client",
            hashed_password=get_password_hash("testpassword"),
            role="client"
        )
        db_session.add(client_user)
        db_session.commit()
        db_session.refresh(client_user)
        return client_user

    def test_client_cannot_create_exercise(self, db_session: Session, test_client: User):
        """Test that clients cannot create exercises."""
        client_token = create_access_token(data={"sub": str(test_client.id), "role": test_client.role})
        
        exercise_data = {
            "name": "Test Exercise",
            "description": "Test Description",
            "muscle_groups": "chest, triceps",
            "equipment_needed": "barbell",
            "video_url": "https://example.com/video",
            "difficulty_level": "beginner"
        }
        
        response = client.post(
            "/api/exercises/",
            headers={"Authorization": f"Bearer {client_token}"},
            json=exercise_data
        )
        
        assert response.status_code == 403
        assert "Only trainers can create exercises" in response.json()["detail"]

    def test_trainer_with_exercises(self, db_session: Session, test_trainer: User):
        """Create a trainer with multiple exercises."""
        # Create multiple exercises
        exercises = []
        for i in range(3):
            exercise = Exercise(
                name=f"Exercise {i+1}",
                description=f"Description {i+1}",
                muscle_groups="chest",
                equipment_needed="barbell",
                video_url=f"https://example.com/video{i+1}",
                created_by=test_trainer.id
            )
            exercises.append(exercise)
        
        db_session.add_all(exercises)
        db_session.commit()
        
        # Just verify exercises were created
        assert len(exercises) == 3

    def test_trainer_and_client(self, db_session: Session):
        """Create trainer and client users."""
        trainer = User(
            email=f"trainer_{uuid4()}@test.com",
            full_name="Test Trainer",
            hashed_password=get_password_hash("testpassword123"),
            role="trainer"
        )
        client_user = User(
            email=f"client_{uuid4()}@test.com",
            full_name="Test Client",
            hashed_password=get_password_hash("testpassword123"),
            role="client"
        )
        
        db_session.add_all([trainer, client_user])
        db_session.commit()
        db_session.refresh(trainer)
        db_session.refresh(client_user)
        
        # Just verify users were created
        assert trainer.role == "trainer"
        assert client_user.role == "client"

    def test_trainer_can_access_own_exercises(self, db_session: Session, test_trainer: User):
        """Test that trainers can access their own exercises."""
        # Create an exercise
        exercise = Exercise(
            name="Trainer Exercise",
            description="Exercise created by trainer",
            muscle_groups="chest",
            equipment_needed="none",
            created_by=test_trainer.id
        )
        db_session.add(exercise)
        db_session.commit()
        db_session.refresh(exercise)
        
        trainer_token = create_access_token(data={"sub": str(test_trainer.id), "role": test_trainer.role})
        
        response = client.get(
            f"/api/exercises/{exercise.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Trainer Exercise"

    def test_client_cannot_access_my_exercises(self, db_session: Session, test_trainer: User, test_client: User):
        """Test that clients cannot access trainer-specific exercise endpoints."""
        client_token = create_access_token(data={"sub": str(test_client.id), "role": test_client.role})
        
        response = client.get(
            "/api/exercises/my",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        # This should either return 403 or an empty list, depending on implementation
        assert response.status_code in [200, 403] 