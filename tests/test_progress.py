import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from uuid import uuid4

from app.main import app
from app.models.user import User
from app.models.workout import WorkoutPlan, WorkoutSession, WorkoutExercise, Exercise, SessionCompletion, ProgressRecord
from app.auth.utils import create_access_token
from app.services.password_service import get_password_hash

client = TestClient(app)

class TestProgressTracking:
    """Test Sprint 3 Progress Tracking functionality."""
    
    @pytest.fixture
    def trainer_user(self, db_session: Session):
        """Create a trainer user."""
        trainer = User(
            email=f"trainer_{uuid4()}@test.com",
            full_name="Test Trainer",
            hashed_password=get_password_hash("testpassword123"),
            role="trainer"
        )
        db_session.add(trainer)
        db_session.commit()
        db_session.refresh(trainer)
        return trainer

    @pytest.fixture
    def client_user(self, db_session: Session, trainer_user: User):
        """Create a client user."""
        client_user = User(
            email=f"client_{uuid4()}@test.com",
            full_name="Test Client",
            hashed_password=get_password_hash("testpassword123"),
            role="client",
            trainer_id=trainer_user.id
        )
        db_session.add(client_user)
        db_session.commit()
        db_session.refresh(client_user)
        return client_user

    @pytest.fixture
    def exercise(self, db_session: Session):
        """Create a test exercise."""
        exercise = Exercise(
            name="Push-ups",
            description="Standard push-ups",
            muscle_groups="chest,triceps,shoulders",
            difficulty_level="beginner"
        )
        db_session.add(exercise)
        db_session.commit()
        db_session.refresh(exercise)
        return exercise

    @pytest.fixture
    def workout_plan(self, db_session: Session, trainer_user: User, client_user: User):
        """Create a test workout plan."""
        plan = WorkoutPlan(
            name="Test Workout Plan",
            description="Test description",
            trainer_id=trainer_user.id,
            client_id=client_user.id,
            start_date=datetime.utcnow(),
            end_date=datetime.utcnow() + timedelta(days=30)
        )
        db_session.add(plan)
        db_session.commit()
        db_session.refresh(plan)
        return plan

    @pytest.fixture
    def workout_session(self, db_session: Session, workout_plan: WorkoutPlan):
        """Create a test workout session."""
        session = WorkoutSession(
            workout_plan_id=workout_plan.id,
            name="Test Session",
            day_of_week=1,
            notes="Test session notes"
        )
        db_session.add(session)
        db_session.commit()
        db_session.refresh(session)
        return session

    @pytest.fixture
    def workout_exercise(self, db_session: Session, workout_session: WorkoutSession, exercise: Exercise):
        """Create a test workout exercise."""
        workout_ex = WorkoutExercise(
            workout_session_id=workout_session.id,
            exercise_id=exercise.id,
            order=1,
            sets=3,
            reps=10,
            rest_time=60
        )
        db_session.add(workout_ex)
        db_session.commit()
        db_session.refresh(workout_ex)
        return workout_ex

    def test_complete_session_success(self, client_user: User, workout_session: WorkoutSession):
        """Test successful session completion."""
        client_token = create_access_token(data={"sub": str(client_user.id), "role": client_user.role})
        
        completion_data = {
            "workout_session_id": workout_session.id,
            "duration_minutes": 45,
            "difficulty_rating": 4,
            "notes": "Great workout!"
        }
        
        response = client.post(
            "/api/progress/sessions/complete",
            headers={"Authorization": f"Bearer {client_token}"},
            json=completion_data
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["workout_session_id"] == workout_session.id
        assert data["duration_minutes"] == 45
        assert data["difficulty_rating"] == 4
        assert data["notes"] == "Great workout!"
        assert data["client_id"] == client_user.id

    def test_complete_session_only_clients(self, trainer_user: User, workout_session: WorkoutSession):
        """Test that only clients can complete sessions."""
        trainer_token = create_access_token(data={"sub": str(trainer_user.id), "role": trainer_user.role})
        
        completion_data = {
            "workout_session_id": workout_session.id,
            "duration_minutes": 45,
            "difficulty_rating": 4
        }
        
        response = client.post(
            "/api/progress/sessions/complete",
            headers={"Authorization": f"Bearer {trainer_token}"},
            json=completion_data
        )
        
        assert response.status_code == 403
        assert "Only clients can complete workout sessions" in response.json()["detail"]

    def test_get_session_completion(self, db_session: Session, client_user: User, workout_session: WorkoutSession):
        """Test retrieving session completion."""
        # Create a session completion
        completion = SessionCompletion(
            workout_session_id=workout_session.id,
            client_id=client_user.id,
            duration_minutes=30,
            difficulty_rating=3,
            notes="Good session"
        )
        db_session.add(completion)
        db_session.commit()
        db_session.refresh(completion)
        
        client_token = create_access_token(data={"sub": str(client_user.id), "role": client_user.role})
        
        response = client.get(
            f"/api/progress/sessions/{workout_session.id}/completion",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["workout_session_id"] == workout_session.id
        assert data["duration_minutes"] == 30
        assert data["difficulty_rating"] == 3

    def test_create_progress_record(self, client_user: User, workout_plan: WorkoutPlan):
        """Test creating a progress record."""
        client_token = create_access_token(data={"sub": str(client_user.id), "role": client_user.role})
        
        record_data = {
            "workout_plan_id": workout_plan.id,
            "weight": 70000,  # 70kg in grams
            "body_fat_percentage": 150,  # 15.0% in tenths
            "muscle_mass": 35000,  # 35kg in grams
            "notes": "Feeling stronger!"
        }
        
        response = client.post(
            "/api/progress/records",
            headers={"Authorization": f"Bearer {client_token}"},
            json=record_data
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["workout_plan_id"] == workout_plan.id
        assert data["weight"] == 70000
        assert data["body_fat_percentage"] == 150
        assert data["client_id"] == client_user.id

    def test_create_progress_record_only_clients(self, trainer_user: User, workout_plan: WorkoutPlan):
        """Test that only clients can create progress records."""
        trainer_token = create_access_token(data={"sub": str(trainer_user.id), "role": trainer_user.role})
        
        record_data = {
            "workout_plan_id": workout_plan.id,
            "weight": 70000
        }
        
        response = client.post(
            "/api/progress/records",
            headers={"Authorization": f"Bearer {trainer_token}"},
            json=record_data
        )
        
        assert response.status_code == 403
        assert "Only clients can create progress records" in response.json()["detail"]

    def test_get_progress_summary_client(self, client_user: User):
        """Test getting progress summary as a client."""
        client_token = create_access_token(data={"sub": str(client_user.id), "role": client_user.role})
        
        response = client.get(
            "/api/progress/summary",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["client_id"] == client_user.id
        assert data["client_name"] == client_user.full_name
        assert "total_workouts_completed" in data
        assert "total_exercises_completed" in data

    def test_get_progress_summary_trainer_for_client(self, trainer_user: User, client_user: User):
        """Test trainer getting progress summary for their client."""
        trainer_token = create_access_token(data={"sub": str(trainer_user.id), "role": trainer_user.role})
        
        response = client.get(
            f"/api/progress/summary?client_id={client_user.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["client_id"] == client_user.id

    def test_get_session_status(self, db_session: Session, client_user: User, workout_session: WorkoutSession, workout_exercise: WorkoutExercise):
        """Test getting session completion status."""
        client_token = create_access_token(data={"sub": str(client_user.id), "role": client_user.role})
        
        response = client.get(
            f"/api/progress/sessions/{workout_session.id}/status",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["session_id"] == workout_session.id
        assert data["session_name"] == workout_session.name
        assert data["total_exercises"] == 1
        assert data["completed_exercises"] == 0
        assert data["completion_percentage"] == 0.0
        assert data["is_session_completed"] == False

    def test_get_workout_plan_status(self, client_user: User, workout_plan: WorkoutPlan, workout_session: WorkoutSession):
        """Test getting workout plan completion status."""
        client_token = create_access_token(data={"sub": str(client_user.id), "role": client_user.role})
        
        response = client.get(
            f"/api/progress/workout-plans/{workout_plan.id}/status",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["workout_plan_id"] == workout_plan.id
        assert data["plan_name"] == workout_plan.name
        assert data["total_sessions"] == 1
        assert data["completed_sessions"] == 0
        assert len(data["sessions"]) == 1

    def test_generate_progress_report_client(self, client_user: User):
        """Test generating progress report as client."""
        client_token = create_access_token(data={"sub": str(client_user.id), "role": client_user.role})
        
        filter_data = {
            "include_exercises": True,
            "include_sessions": True,
            "include_body_metrics": True
        }
        
        response = client.post(
            "/api/progress/reports",
            headers={"Authorization": f"Bearer {client_token}"},
            json=filter_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert data["summary"]["client_id"] == client_user.id
        assert "exercise_stats" in data
        assert "session_stats" in data
        assert "generated_at" in data

    def test_generate_progress_report_trainer_missing_client_id(self, trainer_user: User):
        """Test that trainer must specify client_id for reports."""
        trainer_token = create_access_token(data={"sub": str(trainer_user.id), "role": trainer_user.role})
        
        filter_data = {
            "include_exercises": True
        }
        
        response = client.post(
            "/api/progress/reports",
            headers={"Authorization": f"Bearer {trainer_token}"},
            json=filter_data
        )
        
        assert response.status_code == 400
        assert "must specify a client_id" in response.json()["detail"]

    def test_export_progress_report_json(self, client_user: User):
        """Test exporting progress report in JSON format."""
        client_token = create_access_token(data={"sub": str(client_user.id), "role": client_user.role})
        
        filter_data = {
            "include_exercises": True,
            "include_sessions": True
        }
        
        response = client.post(
            "/api/progress/reports/export?format=json",
            headers={"Authorization": f"Bearer {client_token}"},
            json=filter_data
        )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/json"
        assert "attachment" in response.headers["content-disposition"]

    def test_export_progress_report_csv(self, client_user: User):
        """Test exporting progress report in CSV format."""
        client_token = create_access_token(data={"sub": str(client_user.id), "role": client_user.role})
        
        filter_data = {
            "include_exercises": True,
            "include_sessions": True
        }
        
        response = client.post(
            "/api/progress/reports/export?format=csv",
            headers={"Authorization": f"Bearer {client_token}"},
            json=filter_data
        )
        
        assert response.status_code == 200
        assert "text/csv" in response.headers["content-type"]
        assert "attachment" in response.headers["content-disposition"]

    def test_session_completion_validation(self, client_user: User, workout_session: WorkoutSession):
        """Test session completion with invalid data."""
        client_token = create_access_token(data={"sub": str(client_user.id), "role": client_user.role})
        
        # Test invalid difficulty rating
        completion_data = {
            "workout_session_id": workout_session.id,
            "difficulty_rating": 10  # Should be 1-5
        }
        
        response = client.post(
            "/api/progress/sessions/complete",
            headers={"Authorization": f"Bearer {client_token}"},
            json=completion_data
        )
        
        assert response.status_code == 422  # Validation error

    def test_progress_record_validation(self, client_user: User, workout_plan: WorkoutPlan):
        """Test progress record with invalid data."""
        client_token = create_access_token(data={"sub": str(client_user.id), "role": client_user.role})
        
        # Test invalid weight (too low)
        record_data = {
            "workout_plan_id": workout_plan.id,
            "weight": 1000  # Too low (under 20kg)
        }
        
        response = client.post(
            "/api/progress/records",
            headers={"Authorization": f"Bearer {client_token}"},
            json=record_data
        )
        
        assert response.status_code == 422  # Validation error 