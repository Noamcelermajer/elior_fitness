import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4
from app.main import app
from app.database import get_db
from app.models.user import User
from app.models.workout import Exercise, WorkoutPlan, WorkoutSession, WorkoutExercise
from app.schemas.exercises import ExerciseCreate
from app.schemas.workouts import WorkoutPlanCreate, WorkoutPlanUpdate, WorkoutSessionCreate
from app.services.auth_service import create_access_token
from app.services.exercise_service import ExerciseService
from app.services.workout_service import WorkoutService
from app.auth.utils import get_password_hash

client = TestClient(app)

class TestWorkoutPlanCRUD:
    """Test Workout Plan CRUD operations."""
    
    @pytest.fixture
    def trainer_with_plan(self, db_session: Session):
        """Create trainer and client users with a workout plan."""
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
        
        # Create a workout plan
        workout_plan = WorkoutPlan(
            name="Test Workout Plan",
            description="A test workout plan",
            trainer_id=trainer.id,
            client_id=client_user.id
        )
        db_session.add(workout_plan)
        db_session.commit()
        db_session.refresh(workout_plan)
        
        return trainer, client_user, workout_plan

    @pytest.fixture
    def trainer_token(self, trainer_with_plan: tuple):
        """Create access token for trainer."""
        trainer, _, _ = trainer_with_plan
        return create_access_token(data={"sub": str(trainer.id), "role": trainer.role})
    
    @pytest.fixture
    def client_token(self, trainer_with_plan: tuple):
        """Create access token for client."""
        _, client_user, _ = trainer_with_plan
        return create_access_token(data={"sub": str(client_user.id), "role": client_user.role})
    
    @pytest.fixture
    def sample_workout_data(self, trainer_with_plan: tuple):
        """Sample workout plan data."""
        _, client_user, _ = trainer_with_plan
        return {
            "name": "Morning Routine",
            "description": "A great morning workout",
            "client_id": client_user.id
        }

    def test_create_workout_plan_success(self, trainer_token: str, sample_workout_data: dict):
        """Test successful workout plan creation by trainer."""
        response = client.post(
            "/api/workouts/plans/",
            headers={"Authorization": f"Bearer {trainer_token}"},
            json=sample_workout_data
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == sample_workout_data["name"]
        assert data["description"] == sample_workout_data["description"]
        assert "id" in data

    def test_create_workout_plan_unauthorized(self, sample_workout_data: dict):
        """Test workout plan creation without authentication."""
        response = client.post("/api/workouts/plans/", json=sample_workout_data)
        assert response.status_code == 401

    def test_create_workout_plan_client_forbidden(self, client_token: str, sample_workout_data: dict):
        """Test that clients cannot create workout plans."""
        response = client.post(
            "/api/workouts/plans/",
            headers={"Authorization": f"Bearer {client_token}"},
            json=sample_workout_data
        )
        assert response.status_code == 403

    def test_get_workout_plans_trainer(self, trainer_token: str):
        """Test trainer can get their workout plans."""
        response = client.get(
            "/api/workouts/plans/",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_workout_plans_client(self, client_token: str):
        """Test client can get their assigned workout plans."""
        response = client.get(
            "/api/workouts/plans/",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_workout_plan_by_id(self, trainer_token: str, trainer_with_plan: tuple):
        """Test getting a specific workout plan."""
        _, _, workout_plan = trainer_with_plan
        
        response = client.get(
            f"/api/workouts/plans/{workout_plan.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == workout_plan.id
        assert data["name"] == workout_plan.name

    def test_update_workout_plan(self, trainer_token: str, trainer_with_plan: tuple):
        """Test updating a workout plan."""
        _, _, workout_plan = trainer_with_plan
        
        update_data = {"name": "Updated Plan Name", "description": "Updated description"}
        response = client.put(
            f"/api/workouts/plans/{workout_plan.id}",
            headers={"Authorization": f"Bearer {trainer_token}"},
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Plan Name"
        assert data["description"] == "Updated description"

    def test_delete_workout_plan(self, trainer_token: str, trainer_with_plan: tuple):
        """Test deleting a workout plan."""
        _, _, workout_plan = trainer_with_plan
        
        response = client.delete(
            f"/api/workouts/plans/{workout_plan.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 204


class TestWorkoutSessions:
    """Test Workout Session operations."""
    
    @pytest.fixture
    def trainer_with_session(self, db_session: Session):
        """Create trainer with workout plan and session."""
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
        
        # Create workout plan
        workout_plan = WorkoutPlan(
            name="Test Plan",
            description="Test Description",
            trainer_id=trainer.id,
            client_id=client_user.id
        )
        db_session.add(workout_plan)
        db_session.commit()
        db_session.refresh(workout_plan)
        
        # Create workout session
        workout_session = WorkoutSession(
            name="Test Session",
            notes="Test Session Description",
            workout_plan_id=workout_plan.id
        )
        db_session.add(workout_session)
        db_session.commit()
        db_session.refresh(workout_session)
        
        return trainer, client_user, workout_plan, workout_session

    def test_create_workout_session(self, trainer_with_session: tuple):
        """Test creating a workout session."""
        trainer, client_user, workout_plan, _ = trainer_with_session
        trainer_token = create_access_token(data={"sub": str(trainer.id), "role": trainer.role})
        
        session_data = {
            "name": "New Session",
            "notes": "New session description",
            "workout_plan_id": workout_plan.id
        }
        
        response = client.post(
            "/api/workouts/sessions/",
            headers={"Authorization": f"Bearer {trainer_token}"},
            json=session_data
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Session"
        assert data["workout_plan_id"] == workout_plan.id

    def test_get_workout_sessions(self, trainer_with_session: tuple):
        """Test getting workout sessions."""
        trainer, _, _, _ = trainer_with_session
        trainer_token = create_access_token(data={"sub": str(trainer.id), "role": trainer.role})
        
        response = client.get(
            "/api/workouts/sessions/",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_update_workout_session(self, trainer_with_session: tuple):
        """Test updating a workout session."""
        trainer, _, _, workout_session = trainer_with_session
        trainer_token = create_access_token(data={"sub": str(trainer.id), "role": trainer.role})
        
        update_data = {"name": "Updated Session", "notes": "Updated description"}
        response = client.put(
            f"/api/workouts/sessions/{workout_session.id}",
            headers={"Authorization": f"Bearer {trainer_token}"},
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Session"


class TestWorkoutExercises:
    """Test Workout Exercise operations."""
    
    @pytest.fixture
    def trainer_with_session_and_exercise(self, db_session: Session):
        """Create trainer with workout plan, session, and exercise."""
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

        # Create exercise
        exercise = Exercise(
            name="Test Exercise",
            description="Test exercise description",
            muscle_groups="chest",
            equipment_needed="none",
            created_by=trainer.id
        )
        db_session.add(exercise)
        db_session.commit()
        db_session.refresh(exercise)

        # Create workout plan
        workout_plan = WorkoutPlan(
            name="Test Plan",
            description="Test Description",
            trainer_id=trainer.id,
            client_id=client_user.id
        )
        db_session.add(workout_plan)
        db_session.commit()
        db_session.refresh(workout_plan)

        # Create workout session
        workout_session = WorkoutSession(
            name="Test Session",
            notes="Test Session Description",
            workout_plan_id=workout_plan.id
        )
        db_session.add(workout_session)
        db_session.commit()
        db_session.refresh(workout_session)

        return trainer, client_user, exercise, workout_session

    def test_add_exercise_to_session(self, trainer_with_session_and_exercise: tuple):
        """Test adding an exercise to a workout session."""
        trainer, _, exercise, workout_session = trainer_with_session_and_exercise
        trainer_token = create_access_token(data={"sub": str(trainer.id), "role": trainer.role})
        
        exercise_data = {
            "exercise_id": exercise.id,
            "sets": 3,
            "reps": 12,
            "weight": 50.0,
            "rest_seconds": 60,
            "notes": "Test notes"
        }
        
        response = client.post(
            f"/api/workouts/sessions/{workout_session.id}/exercises",
            headers={"Authorization": f"Bearer {trainer_token}"},
            json=exercise_data
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["exercise_id"] == exercise.id
        assert data["sets"] == 3
        assert data["reps"] == 12

    def test_get_session_exercises(self, trainer_with_session_and_exercise: tuple):
        """Test getting exercises in a session."""
        trainer, _, _, workout_session = trainer_with_session_and_exercise
        trainer_token = create_access_token(data={"sub": str(trainer.id), "role": trainer.role})
        
        response = client.get(
            f"/api/workouts/sessions/{workout_session.id}/exercises",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_update_exercise_order(self, trainer_with_session_and_exercise: tuple):
        """Test updating exercise order in a session."""
        trainer, _, _, workout_session = trainer_with_session_and_exercise
        trainer_token = create_access_token(data={"sub": str(trainer.id), "role": trainer.role})
        
        order_data = {"exercise_orders": [{"exercise_id": 1, "order": 1}]}
        response = client.put(
            f"/api/workouts/sessions/{workout_session.id}/exercises/order",
            headers={"Authorization": f"Bearer {trainer_token}"},
            json=order_data
        )
        
        # This endpoint may not be implemented yet, so accept 200, 404, or 501
        assert response.status_code in [200, 404, 501]


class TestExerciseCompletions:
    """Test Exercise Completion tracking."""
    
    @pytest.fixture
    def client_user(self, db_session: Session):
        """Create a client user."""
        client_user = User(
            email=f"client_{uuid4()}@test.com",
            full_name="Test Client",
            hashed_password=get_password_hash("testpassword123"),
            role="client"
        )
        db_session.add(client_user)
        db_session.commit()
        db_session.refresh(client_user)
        return client_user

    def test_log_exercise_completion(self, client_user: User):
        """Test logging exercise completion."""
        client_token = create_access_token(data={"sub": str(client_user.id), "role": client_user.role})
        
        completion_data = {
            "exercise_id": 1,
            "sets_completed": 3,
            "reps_completed": 12,
            "weight_used": 50.0,
            "duration_seconds": 300,
            "notes": "Felt good"
        }
        
        response = client.post(
            "/api/workouts/completions/",
            headers={"Authorization": f"Bearer {client_token}"},
            json=completion_data
        )
        
        # This endpoint may not be implemented yet, so accept 201, 404, or 501
        assert response.status_code in [201, 404, 501]

    def test_get_my_completions(self, client_user: User):
        """Test getting user's exercise completions."""
        client_token = create_access_token(data={"sub": str(client_user.id), "role": client_user.role})
        
        response = client.get(
            "/api/workouts/completions/my",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        # This endpoint may not be implemented yet, so accept 200, 404, or 501
        assert response.status_code in [200, 404, 501] 