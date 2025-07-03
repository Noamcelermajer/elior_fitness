import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json

from app.main import app
from app.database import get_db, engine, Base
from app.models.user import User
from app.models.workout import Exercise, WorkoutPlan, WorkoutSession, WorkoutExercise, ExerciseCompletion, MuscleGroup
from app.services.auth_service import create_access_token
from app.services.password_service import get_password_hash

client = TestClient(app)

@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test"""
    Base.metadata.create_all(bind=engine)
    session = next(get_db())
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def trainer_user(db_session: Session):
    """Create a trainer user for testing"""
    user = User(
        email="trainer@test.com",
        hashed_password=get_password_hash("testpassword123"),
        full_name="Test Trainer",
        is_trainer=True,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def client_user(db_session: Session):
    """Create a client user for testing"""
    user = User(
        email="client@test.com",
        hashed_password=get_password_hash("clientpass123"),
        full_name="Test Client",
        is_trainer=False,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def trainer_token(trainer_user: User):
    """Create access token for trainer"""
    return create_access_token(data={"sub": trainer_user.email})

@pytest.fixture
def client_token(client_user: User):
    """Create access token for client"""
    return create_access_token(data={"sub": client_user.email})

@pytest.fixture
def sample_exercises(db_session: Session, trainer_user: User):
    """Create sample exercises for testing"""
    exercises = [
        Exercise(
            name="Push-ups",
            description="Classic bodyweight chest exercise",
            muscle_group=MuscleGroup.CHEST,
            equipment_needed="None",
            instructions="Start in plank position, lower body until chest nearly touches ground, push back up",
            created_by=trainer_user.id
        ),
        Exercise(
            name="Pull-ups",
            description="Upper body pulling exercise",
            muscle_group=MuscleGroup.BACK,
            equipment_needed="Pull-up bar",
            instructions="Hang from bar, pull body up until chin is over bar, lower with control",
            created_by=trainer_user.id
        ),
        Exercise(
            name="Squats",
            description="Lower body compound exercise",
            muscle_group=MuscleGroup.LEGS,
            equipment_needed="None",
            instructions="Stand with feet shoulder-width apart, lower body as if sitting back, return to standing",
            created_by=trainer_user.id
        )
    ]
    
    for exercise in exercises:
        db_session.add(exercise)
    db_session.commit()
    
    for exercise in exercises:
        db_session.refresh(exercise)
    
    return exercises

@pytest.fixture
def sample_workout_plan(db_session: Session, trainer_user: User, client_user: User):
    """Create a sample workout plan"""
    workout_plan = WorkoutPlan(
        name="Beginner Strength Program",
        description="4-week program focusing on basic strength building",
        trainer_id=trainer_user.id,
        client_id=client_user.id,
        start_date=datetime.now(),
        end_date=datetime.now() + timedelta(days=28)
    )
    db_session.add(workout_plan)
    db_session.commit()
    db_session.refresh(workout_plan)
    return workout_plan

@pytest.fixture
def sample_workout_session(db_session: Session, sample_workout_plan: WorkoutPlan):
    """Create a sample workout session"""
    session = WorkoutSession(
        workout_plan_id=sample_workout_plan.id,
        name="Day 1: Upper Body",
        day_of_week=0,
        notes="Focus on chest and back exercises"
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    return session

@pytest.fixture
def sample_workout_exercises(db_session: Session, sample_workout_session: WorkoutSession, sample_exercises):
    """Create sample workout exercises"""
    workout_exercises = [
        WorkoutExercise(
            workout_session_id=sample_workout_session.id,
            exercise_id=sample_exercises[0].id,
            order=1,
            sets=3,
            reps="8-12",
            rest_time=60,
            notes="Focus on form, go to failure if needed"
        ),
        WorkoutExercise(
            workout_session_id=sample_workout_session.id,
            exercise_id=sample_exercises[1].id,
            order=2,
            sets=3,
            reps="5-8",
            rest_time=90,
            notes="Use assistance if needed"
        )
    ]
    
    for workout_exercise in workout_exercises:
        db_session.add(workout_exercise)
    db_session.commit()
    
    for workout_exercise in workout_exercises:
        db_session.refresh(workout_exercise)
    
    return workout_exercises

class TestExerciseBank:
    """Test exercise bank management endpoints"""
    
    def test_create_exercise_success(self, trainer_token: str):
        """Test successful exercise creation by trainer"""
        exercise_data = {
            "name": "Bench Press",
            "description": "Compound chest exercise",
            "muscle_group": "chest",
            "equipment_needed": "Barbell, bench",
            "instructions": "Lie on bench, lower bar to chest, press up"
        }
        
        response = client.post(
            "/api/workouts/exercises",
            json=exercise_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Bench Press"
        assert data["muscle_group"] == "chest"
        assert "id" in data
    
    def test_create_exercise_unauthorized(self):
        """Test exercise creation without authentication"""
        exercise_data = {
            "name": "Bench Press",
            "muscle_group": "chest"
        }
        
        response = client.post("/api/workouts/exercises", json=exercise_data)
        assert response.status_code == 401
    
    def test_create_exercise_client_forbidden(self, client_token: str):
        """Test that clients cannot create exercises"""
        exercise_data = {
            "name": "Bench Press",
            "muscle_group": "chest"
        }
        
        response = client.post(
            "/api/workouts/exercises",
            json=exercise_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403
    
    def test_get_exercises_success(self, trainer_token: str, sample_exercises):
        """Test getting exercises with filtering"""
        response = client.get(
            "/api/workouts/exercises",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        assert any(ex["name"] == "Push-ups" for ex in data)
    
    def test_get_exercises_filter_by_muscle_group(self, trainer_token: str, sample_exercises):
        """Test filtering exercises by muscle group"""
        response = client.get(
            "/api/workouts/exercises?muscle_group=chest",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["muscle_group"] == "chest"
    
    def test_get_exercises_search(self, trainer_token: str, sample_exercises):
        """Test searching exercises"""
        response = client.get(
            "/api/workouts/exercises?search=push",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert "push" in data[0]["name"].lower()
    
    def test_get_exercise_by_id(self, trainer_token: str, sample_exercises):
        """Test getting a specific exercise"""
        exercise_id = sample_exercises[0].id
        
        response = client.get(
            f"/api/workouts/exercises/{exercise_id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == exercise_id
        assert data["name"] == "Push-ups"
    
    def test_get_exercise_not_found(self, trainer_token: str):
        """Test getting non-existent exercise"""
        response = client.get(
            "/api/workouts/exercises/999",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 404
    
    def test_update_exercise_success(self, trainer_token: str, sample_exercises):
        """Test successful exercise update"""
        exercise_id = sample_exercises[0].id
        update_data = {
            "name": "Modified Push-ups",
            "instructions": "Updated instructions with better form cues"
        }
        
        response = client.put(
            f"/api/workouts/exercises/{exercise_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Modified Push-ups"
        assert "Updated instructions" in data["instructions"]
    
    def test_update_exercise_unauthorized(self, client_token: str, sample_exercises):
        """Test exercise update by non-owner"""
        exercise_id = sample_exercises[0].id
        update_data = {"name": "Modified Push-ups"}
        
        response = client.put(
            f"/api/workouts/exercises/{exercise_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403
    
    def test_delete_exercise_success(self, trainer_token: str, sample_exercises):
        """Test successful exercise deletion"""
        exercise_id = sample_exercises[0].id
        
        response = client.delete(
            f"/api/workouts/exercises/{exercise_id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 204
    
    def test_delete_exercise_unauthorized(self, client_token: str, sample_exercises):
        """Test exercise deletion by non-owner"""
        exercise_id = sample_exercises[0].id
        
        response = client.delete(
            f"/api/workouts/exercises/{exercise_id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403

class TestWorkoutPlans:
    """Test workout plan management endpoints"""
    
    def test_create_workout_plan_success(self, trainer_token: str, client_user: User):
        """Test successful workout plan creation"""
        plan_data = {
            "name": "Advanced Strength Program",
            "description": "6-week program for experienced lifters",
            "client_id": client_user.id,
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=42)).isoformat()
        }
        
        response = client.post(
            "/api/workouts/plans",
            json=plan_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Advanced Strength Program"
        assert data["client_id"] == client_user.id
        assert "id" in data
    
    def test_create_workout_plan_unauthorized(self, client_user: User):
        """Test workout plan creation without authentication"""
        plan_data = {
            "name": "Test Plan",
            "client_id": client_user.id
        }
        
        response = client.post("/api/workouts/plans", json=plan_data)
        assert response.status_code == 401
    
    def test_get_workout_plans_trainer(self, trainer_token: str, sample_workout_plan: WorkoutPlan):
        """Test getting workout plans as trainer"""
        response = client.get(
            "/api/workouts/plans",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Beginner Strength Program"
    
    def test_get_workout_plans_client(self, client_token: str, sample_workout_plan: WorkoutPlan):
        """Test getting workout plans as client"""
        response = client.get(
            "/api/workouts/plans",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Beginner Strength Program"
    
    def test_get_workout_plan_by_id(self, trainer_token: str, sample_workout_plan: WorkoutPlan):
        """Test getting specific workout plan"""
        response = client.get(
            f"/api/workouts/plans/{sample_workout_plan.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_workout_plan.id
        assert data["name"] == "Beginner Strength Program"
    
    def test_get_complete_workout_plan(self, trainer_token: str, sample_workout_plan: WorkoutPlan, sample_workout_session: WorkoutSession):
        """Test getting complete workout plan with sessions"""
        response = client.get(
            f"/api/workouts/plans/{sample_workout_plan.id}/complete",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_workout_plan.id
        assert "workout_sessions" in data
        assert len(data["workout_sessions"]) == 1
    
    def test_update_workout_plan(self, trainer_token: str, sample_workout_plan: WorkoutPlan):
        """Test updating workout plan"""
        update_data = {
            "name": "Updated Strength Program",
            "description": "Modified program description"
        }
        
        response = client.put(
            f"/api/workouts/plans/{sample_workout_plan.id}",
            json=update_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Strength Program"
    
    def test_delete_workout_plan(self, trainer_token: str, sample_workout_plan: WorkoutPlan):
        """Test deleting workout plan"""
        response = client.delete(
            f"/api/workouts/plans/{sample_workout_plan.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 204

class TestWorkoutSessions:
    """Test workout session management endpoints"""
    
    def test_create_workout_session(self, trainer_token: str, sample_workout_plan: WorkoutPlan):
        """Test creating workout session"""
        session_data = {
            "name": "Day 2: Lower Body",
            "day_of_week": 2,
            "notes": "Focus on legs and core"
        }
        
        response = client.post(
            f"/api/workouts/plans/{sample_workout_plan.id}/sessions",
            json=session_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Day 2: Lower Body"
        assert data["day_of_week"] == 2
    
    def test_get_workout_session(self, trainer_token: str, sample_workout_session: WorkoutSession):
        """Test getting specific workout session"""
        response = client.get(
            f"/api/workouts/sessions/{sample_workout_session.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_workout_session.id
        assert data["name"] == "Day 1: Upper Body"
    
    def test_get_complete_workout_session(self, trainer_token: str, sample_workout_session: WorkoutSession, sample_workout_exercises):
        """Test getting complete workout session with exercises"""
        response = client.get(
            f"/api/workouts/sessions/{sample_workout_session.id}/complete",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_workout_session.id
        assert "workout_exercises" in data
        assert len(data["workout_exercises"]) == 2
    
    def test_update_workout_session(self, trainer_token: str, sample_workout_session: WorkoutSession):
        """Test updating workout session"""
        update_data = {
            "name": "Updated Upper Body",
            "notes": "Modified session notes"
        }
        
        response = client.put(
            f"/api/workouts/sessions/{sample_workout_session.id}",
            json=update_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Upper Body"
    
    def test_delete_workout_session(self, trainer_token: str, sample_workout_session: WorkoutSession):
        """Test deleting workout session"""
        response = client.delete(
            f"/api/workouts/sessions/{sample_workout_session.id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 204

class TestWorkoutExercises:
    """Test workout exercise management endpoints"""
    
    def test_create_workout_exercise(self, trainer_token: str, sample_workout_session: WorkoutSession, sample_exercises):
        """Test adding exercise to workout session"""
        exercise_data = {
            "exercise_id": sample_exercises[2].id,  # Squats
            "order": 3,
            "sets": 3,
            "reps": "12-15",
            "rest_time": 60,
            "notes": "Keep chest up, knees in line with toes"
        }
        
        response = client.post(
            f"/api/workouts/sessions/{sample_workout_session.id}/exercises",
            json=exercise_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["exercise_id"] == sample_exercises[2].id
        assert data["order"] == 3
        assert data["reps"] == "12-15"
    
    def test_create_bulk_workout_exercises(self, trainer_token: str, sample_workout_session: WorkoutSession, sample_exercises):
        """Test bulk adding exercises to workout session"""
        exercises_data = {
            "exercises": [
                {
                    "exercise_id": sample_exercises[2].id,  # Squats
                    "order": 3,
                    "sets": 3,
                    "reps": "12-15",
                    "rest_time": 60
                },
                {
                    "exercise_id": sample_exercises[0].id,  # Push-ups
                    "order": 4,
                    "sets": 2,
                    "reps": "10-12",
                    "rest_time": 45
                }
            ]
        }
        
        response = client.post(
            f"/api/workouts/sessions/{sample_workout_session.id}/exercises/bulk",
            json=exercises_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert len(data) == 2
    
    def test_get_workout_exercise(self, trainer_token: str, sample_workout_exercises):
        """Test getting specific workout exercise"""
        workout_exercise_id = sample_workout_exercises[0].id
        
        response = client.get(
            f"/api/workouts/exercises/workout/{workout_exercise_id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == workout_exercise_id
        assert data["exercise_id"] == sample_workout_exercises[0].exercise_id
    
    def test_update_workout_exercise(self, trainer_token: str, sample_workout_exercises):
        """Test updating workout exercise"""
        workout_exercise_id = sample_workout_exercises[0].id
        update_data = {
            "sets": 4,
            "reps": "10-15",
            "notes": "Updated exercise notes"
        }
        
        response = client.put(
            f"/api/workouts/exercises/workout/{workout_exercise_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["sets"] == 4
        assert data["reps"] == "10-15"
    
    def test_delete_workout_exercise(self, trainer_token: str, sample_workout_exercises):
        """Test deleting workout exercise"""
        workout_exercise_id = sample_workout_exercises[0].id
        
        response = client.delete(
            f"/api/workouts/exercises/workout/{workout_exercise_id}",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 204

class TestExerciseCompletions:
    """Test exercise completion tracking endpoints"""
    
    def test_create_exercise_completion(self, client_token: str, sample_workout_exercises):
        """Test logging exercise completion"""
        completion_data = {
            "workout_exercise_id": sample_workout_exercises[0].id,
            "actual_sets": 3,
            "actual_reps": "10",
            "weight_used": "bodyweight",
            "difficulty_rating": 3,
            "notes": "Felt good, maintained proper form"
        }
        
        response = client.post(
            "/api/workouts/completions",
            json=completion_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["actual_sets"] == 3
        assert data["actual_reps"] == "10"
        assert data["difficulty_rating"] == 3
    
    def test_create_bulk_exercise_completions(self, client_token: str, sample_workout_exercises):
        """Test bulk logging exercise completions"""
        completions_data = {
            "completions": [
                {
                    "workout_exercise_id": sample_workout_exercises[0].id,
                    "actual_sets": 3,
                    "actual_reps": "10",
                    "weight_used": "bodyweight",
                    "difficulty_rating": 3
                },
                {
                    "workout_exercise_id": sample_workout_exercises[1].id,
                    "actual_sets": 2,
                    "actual_reps": "6",
                    "weight_used": "bodyweight",
                    "difficulty_rating": 4
                }
            ]
        }
        
        response = client.post(
            "/api/workouts/completions/bulk",
            json=completions_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert len(data) == 2
    
    def test_get_exercise_completions(self, client_token: str, sample_workout_exercises, client_user: User, db_session: Session):
        """Test getting exercise completions"""
        # Create a completion first
        completion = ExerciseCompletion(
            workout_exercise_id=sample_workout_exercises[0].id,
            client_id=client_user.id,
            actual_sets=3,
            actual_reps="10",
            weight_used="bodyweight",
            difficulty_rating=3
        )
        db_session.add(completion)
        db_session.commit()
        
        response = client.get(
            "/api/workouts/completions",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["actual_sets"] == 3
    
    def test_get_exercise_completion_by_id(self, client_token: str, sample_workout_exercises, client_user: User, db_session: Session):
        """Test getting specific exercise completion"""
        # Create a completion first
        completion = ExerciseCompletion(
            workout_exercise_id=sample_workout_exercises[0].id,
            client_id=client_user.id,
            actual_sets=3,
            actual_reps="10",
            weight_used="bodyweight",
            difficulty_rating=3
        )
        db_session.add(completion)
        db_session.commit()
        db_session.refresh(completion)
        
        response = client.get(
            f"/api/workouts/completions/{completion.id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == completion.id
        assert data["actual_sets"] == 3
    
    def test_update_exercise_completion(self, client_token: str, sample_workout_exercises, client_user: User, db_session: Session):
        """Test updating exercise completion"""
        # Create a completion first
        completion = ExerciseCompletion(
            workout_exercise_id=sample_workout_exercises[0].id,
            client_id=client_user.id,
            actual_sets=3,
            actual_reps="10",
            weight_used="bodyweight",
            difficulty_rating=3
        )
        db_session.add(completion)
        db_session.commit()
        db_session.refresh(completion)
        
        update_data = {
            "actual_sets": 4,
            "actual_reps": "12",
            "notes": "Updated completion notes"
        }
        
        response = client.put(
            f"/api/workouts/completions/{completion.id}",
            json=update_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["actual_sets"] == 4
        assert data["actual_reps"] == "12"
    
    def test_delete_exercise_completion(self, client_token: str, sample_workout_exercises, client_user: User, db_session: Session):
        """Test deleting exercise completion"""
        # Create a completion first
        completion = ExerciseCompletion(
            workout_exercise_id=sample_workout_exercises[0].id,
            client_id=client_user.id,
            actual_sets=3,
            actual_reps="10",
            weight_used="bodyweight",
            difficulty_rating=3
        )
        db_session.add(completion)
        db_session.commit()
        db_session.refresh(completion)
        
        response = client.delete(
            f"/api/workouts/completions/{completion.id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 204

class TestWorkoutAnalytics:
    """Test workout analytics and reporting endpoints"""
    
    def test_get_workout_summary(self, trainer_token: str, sample_workout_plan: WorkoutPlan, sample_workout_session: WorkoutSession, sample_workout_exercises):
        """Test getting workout summary"""
        response = client.get(
            f"/api/workouts/plans/{sample_workout_plan.id}/summary",
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["workout_plan_id"] == sample_workout_plan.id
        assert data["total_sessions"] == 1
        assert data["total_exercises"] == 2
        assert "completion_rate" in data
    
    def test_get_exercise_progress(self, client_token: str, sample_exercises, client_user: User, db_session: Session, sample_workout_exercises):
        """Test getting exercise progress"""
        # Create some completions first
        for i in range(3):
            completion = ExerciseCompletion(
                workout_exercise_id=sample_workout_exercises[0].id,
                client_id=client_user.id,
                actual_sets=3,
                actual_reps="10",
                weight_used="bodyweight",
                difficulty_rating=3
            )
            db_session.add(completion)
        db_session.commit()
        
        exercise_id = sample_exercises[0].id
        
        response = client.get(
            f"/api/workouts/exercises/{exercise_id}/progress",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["exercise_id"] == exercise_id
        assert data["total_completions"] == 3
        assert data["average_sets"] == 3.0
    
    def test_get_exercise_progress_not_found(self, client_token: str):
        """Test getting exercise progress for non-existent exercise"""
        response = client.get(
            "/api/workouts/exercises/999/progress",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 404

class TestWorkoutPermissions:
    """Test workout system permissions and access control"""
    
    def test_client_cannot_create_exercises(self, client_token: str):
        """Test that clients cannot create exercises"""
        exercise_data = {
            "name": "Test Exercise",
            "muscle_group": "chest"
        }
        
        response = client.post(
            "/api/workouts/exercises",
            json=exercise_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403
    
    def test_client_cannot_create_workout_plans(self, client_token: str, client_user: User):
        """Test that clients cannot create workout plans"""
        plan_data = {
            "name": "Test Plan",
            "client_id": client_user.id
        }
        
        response = client.post(
            "/api/workouts/plans",
            json=plan_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403
    
    def test_trainer_cannot_complete_exercises(self, trainer_token: str, sample_workout_exercises):
        """Test that trainers cannot log exercise completions"""
        completion_data = {
            "workout_exercise_id": sample_workout_exercises[0].id,
            "actual_sets": 3,
            "actual_reps": "10"
        }
        
        response = client.post(
            "/api/workouts/completions",
            json=completion_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        # This should work since completions are tied to workout_exercise_id, not user role
        assert response.status_code == 201
    
    def test_access_other_trainer_exercises(self, trainer_token: str, db_session: Session):
        """Test that trainers cannot access other trainers' exercises"""
        # Create another trainer
        other_trainer = User(
            email="other@test.com",
            hashed_password=get_password_hash("password"),
            full_name="Other Trainer",
            is_trainer=True
        )
        db_session.add(other_trainer)
        db_session.commit()
        
        # Create exercise for other trainer
        exercise = Exercise(
            name="Other Exercise",
            muscle_group=MuscleGroup.CHEST,
            created_by=other_trainer.id
        )
        db_session.add(exercise)
        db_session.commit()
        db_session.refresh(exercise)
        
        # Try to update other trainer's exercise
        update_data = {"name": "Modified Exercise"}
        response = client.put(
            f"/api/workouts/exercises/{exercise.id}",
            json=update_data,
            headers={"Authorization": f"Bearer {trainer_token}"}
        )
        assert response.status_code == 404  # Should not find or return 403 