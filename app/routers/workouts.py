from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.auth.utils import get_current_user
from app.models.user import User
from app.services.workout_service import WorkoutService
from app.schemas.workouts import (
    WorkoutPlanCreate, WorkoutPlanUpdate, WorkoutPlanResponse, WorkoutPlanFilter,
    WorkoutSessionCreate, WorkoutSessionUpdate, WorkoutSessionResponse,
    WorkoutExerciseCreate, WorkoutExerciseUpdate, WorkoutExerciseResponse,
    ExerciseCompletionCreate, ExerciseCompletionResponse,
    CompleteWorkoutPlanResponse, CompleteWorkoutSessionResponse
)

router = APIRouter()

def get_workout_service(db: Session = Depends(get_db)) -> WorkoutService:
    return WorkoutService(db)

# Workout Plan Endpoints
@router.post("/plans", response_model=WorkoutPlanResponse, status_code=status.HTTP_201_CREATED)
async def create_workout_plan(
    workout_plan_data: WorkoutPlanCreate,
    current_user: User = Depends(get_current_user),
    workout_service: WorkoutService = Depends(get_workout_service)
):
    """Create a new workout plan for a client."""
    if current_user.role != "trainer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can create workout plans"
        )
    
    # Verify the client exists and is assigned to this trainer
    # This would need to be implemented in the user service
    # For now, we'll assume the client exists
    
    workout_plan = workout_service.create_workout_plan(workout_plan_data, current_user.id)
    return workout_plan

@router.get("/plans", response_model=List[WorkoutPlanResponse])
async def get_workout_plans(
    trainer_id: Optional[int] = Query(None, description="Filter by trainer ID"),
    client_id: Optional[int] = Query(None, description="Filter by client ID"),
    search: Optional[str] = Query(None, description="Search in plan name or description"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Number of items per page"),
    current_user: User = Depends(get_current_user),
    workout_service: WorkoutService = Depends(get_workout_service)
):
    """Get workout plans with filtering."""
    # Apply role-based filtering
    if current_user.role == "trainer":
        trainer_id = current_user.id
    elif current_user.role == "client":
        client_id = current_user.id
    
    filter_params = WorkoutPlanFilter(
        trainer_id=trainer_id,
        client_id=client_id,
        search=search,
        page=page,
        size=size
    )
    
    workout_plans, total = workout_service.get_workout_plans(filter_params)
    return workout_plans

@router.get("/plans/{workout_plan_id}", response_model=WorkoutPlanResponse)
async def get_workout_plan(
    workout_plan_id: int,
    current_user: User = Depends(get_current_user),
    workout_service: WorkoutService = Depends(get_workout_service)
):
    """Get a specific workout plan."""
    workout_plan = workout_service.get_workout_plan(workout_plan_id)
    if not workout_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout plan not found"
        )
    
    # Check authorization
    if current_user.role == "trainer" and workout_plan.trainer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own workout plans"
        )
    elif current_user.role == "client" and workout_plan.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access workout plans assigned to you"
        )
    
    return workout_plan

@router.get("/plans/{workout_plan_id}/complete", response_model=CompleteWorkoutPlanResponse)
async def get_complete_workout_plan(
    workout_plan_id: int,
    current_user: User = Depends(get_current_user),
    workout_service: WorkoutService = Depends(get_workout_service)
):
    """Get a complete workout plan with all sessions and exercises."""
    workout_plan = workout_service.get_complete_workout_plan(workout_plan_id)
    if not workout_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout plan not found"
        )
    
    # Check authorization
    if current_user.role == "trainer" and workout_plan.trainer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own workout plans"
        )
    elif current_user.role == "client" and workout_plan.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access workout plans assigned to you"
        )
    
    return workout_plan

@router.put("/plans/{workout_plan_id}", response_model=WorkoutPlanResponse)
async def update_workout_plan(
    workout_plan_id: int,
    workout_plan_data: WorkoutPlanUpdate,
    current_user: User = Depends(get_current_user),
    workout_service: WorkoutService = Depends(get_workout_service)
):
    """Update a workout plan."""
    if current_user.role != "trainer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can update workout plans"
        )
    
    workout_plan = workout_service.get_workout_plan(workout_plan_id)
    if not workout_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout plan not found"
        )
    
    if workout_plan.trainer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own workout plans"
        )
    
    updated_plan = workout_service.update_workout_plan(workout_plan_id, workout_plan_data)
    return updated_plan

@router.delete("/plans/{workout_plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workout_plan(
    workout_plan_id: int,
    current_user: User = Depends(get_current_user),
    workout_service: WorkoutService = Depends(get_workout_service)
):
    """Delete a workout plan."""
    if current_user.role != "trainer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can delete workout plans"
        )
    
    workout_plan = workout_service.get_workout_plan(workout_plan_id)
    if not workout_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout plan not found"
        )
    
    if workout_plan.trainer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own workout plans"
        )
    
    success = workout_service.delete_workout_plan(workout_plan_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout plan not found"
        )

# Workout Session Endpoints
@router.post("/sessions", response_model=WorkoutSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_workout_session(
    session_data: WorkoutSessionCreate,
    current_user: User = Depends(get_current_user),
    workout_service: WorkoutService = Depends(get_workout_service)
):
    """Create a new workout session."""
    if current_user.role != "trainer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can create workout sessions"
        )
    
    # Verify the workout plan exists and belongs to the trainer
    workout_plan = workout_service.get_workout_plan(session_data.workout_plan_id)
    if not workout_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout plan not found"
        )
    
    if workout_plan.trainer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create sessions for your own workout plans"
        )
    
    session = workout_service.create_workout_session(session_data)
    return session

@router.get("/plans/{workout_plan_id}/sessions", response_model=List[WorkoutSessionResponse])
async def get_workout_sessions(
    workout_plan_id: int,
    current_user: User = Depends(get_current_user),
    workout_service: WorkoutService = Depends(get_workout_service)
):
    """Get all sessions for a workout plan."""
    # Verify the workout plan exists and user has access
    workout_plan = workout_service.get_workout_plan(workout_plan_id)
    if not workout_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout plan not found"
        )
    
    if current_user.role == "trainer" and workout_plan.trainer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access sessions for your own workout plans"
        )
    elif current_user.role == "client" and workout_plan.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access sessions for workout plans assigned to you"
        )
    
    sessions = workout_service.get_sessions_by_plan(workout_plan_id)
    return sessions

@router.put("/sessions/{session_id}", response_model=WorkoutSessionResponse)
async def update_workout_session(
    session_id: int,
    session_data: WorkoutSessionUpdate,
    current_user: User = Depends(get_current_user),
    workout_service: WorkoutService = Depends(get_workout_service)
):
    """Update a workout session."""
    if current_user.role != "trainer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can update workout sessions"
        )
    
    session = workout_service.get_workout_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )
    
    # Check if the session belongs to a workout plan created by the trainer
    workout_plan = workout_service.get_workout_plan(session.workout_plan_id)
    if workout_plan.trainer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update sessions for your own workout plans"
        )
    
    updated_session = workout_service.update_workout_session(session_id, session_data)
    return updated_session

@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workout_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    workout_service: WorkoutService = Depends(get_workout_service)
):
    """Delete a workout session."""
    if current_user.role != "trainer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can delete workout sessions"
        )
    
    session = workout_service.get_workout_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )
    
    # Check if the session belongs to a workout plan created by the trainer
    workout_plan = workout_service.get_workout_plan(session.workout_plan_id)
    if workout_plan.trainer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete sessions for your own workout plans"
        )
    
    success = workout_service.delete_workout_session(session_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )

# Workout Exercise Endpoints
@router.post("/sessions/{session_id}/exercises", response_model=WorkoutExerciseResponse, status_code=status.HTTP_201_CREATED)
async def add_exercise_to_session(
    session_id: int,
    exercise_data: WorkoutExerciseCreate,
    current_user: User = Depends(get_current_user),
    workout_service: WorkoutService = Depends(get_workout_service)
):
    """Add an exercise to a workout session."""
    if current_user.role != "trainer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can add exercises to sessions"
        )
    
    # Verify the session exists and belongs to a workout plan created by the trainer
    session = workout_service.get_workout_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )
    
    workout_plan = workout_service.get_workout_plan(session.workout_plan_id)
    if workout_plan.trainer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only add exercises to sessions in your own workout plans"
        )
    
    # Override the session_id in the exercise data
    exercise_data.workout_session_id = session_id
    workout_exercise = workout_service.add_exercise_to_session(exercise_data)
    return workout_exercise

@router.get("/sessions/{session_id}/exercises", response_model=List[WorkoutExerciseResponse])
async def get_session_exercises(
    session_id: int,
    current_user: User = Depends(get_current_user),
    workout_service: WorkoutService = Depends(get_workout_service)
):
    """Get all exercises for a workout session."""
    session = workout_service.get_workout_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )
    
    # Check authorization
    workout_plan = workout_service.get_workout_plan(session.workout_plan_id)
    if current_user.role == "trainer" and workout_plan.trainer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access exercises for your own workout plans"
        )
    elif current_user.role == "client" and workout_plan.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access exercises for workout plans assigned to you"
        )
    
    exercises = workout_service.get_session_exercises(session_id)
    return [WorkoutExerciseResponse.from_orm_with_exercise(exercise) for exercise in exercises]

@router.put("/sessions/{session_id}/exercises/order")
async def update_exercise_order(
    session_id: int,
    exercise_orders: List[dict],
    current_user: User = Depends(get_current_user),
    workout_service: WorkoutService = Depends(get_workout_service)
):
    """Update the order of exercises in a session."""
    if current_user.role != "trainer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can reorder exercises"
        )
    
    session = workout_service.get_workout_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )
    
    workout_plan = workout_service.get_workout_plan(session.workout_plan_id)
    if workout_plan.trainer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only reorder exercises in your own workout plans"
        )
    
    success = workout_service.update_exercise_order(session_id, exercise_orders)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update exercise order"
        )
    
    return {"message": "Exercise order updated successfully"}

@router.put("/exercises/{exercise_id}", response_model=WorkoutExerciseResponse)
async def update_workout_exercise(
    exercise_id: int,
    exercise_data: WorkoutExerciseUpdate,
    current_user: User = Depends(get_current_user),
    workout_service: WorkoutService = Depends(get_workout_service)
):
    """Update a workout exercise."""
    if current_user.role != "trainer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can update workout exercises"
        )
    
    # Get the workout exercise and verify ownership
    workout_exercise = workout_service.get_workout_exercise(exercise_id)
    if not workout_exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout exercise not found"
        )
    
    # Check if the exercise belongs to a session in a workout plan created by the trainer
    session = workout_service.get_workout_session(workout_exercise.workout_session_id)
    workout_plan = workout_service.get_workout_plan(session.workout_plan_id)
    if workout_plan.trainer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update exercises in your own workout plans"
        )
    
    updated_exercise = workout_service.update_workout_exercise(exercise_id, exercise_data)
    if not updated_exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout exercise not found"
        )
    
    return updated_exercise

@router.delete("/exercises/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_exercise_from_session(
    exercise_id: int,
    current_user: User = Depends(get_current_user),
    workout_service: WorkoutService = Depends(get_workout_service)
):
    """Remove an exercise from a workout session."""
    if current_user.role != "trainer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can remove exercises from sessions"
        )
    
    success = workout_service.remove_exercise_from_session(exercise_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout exercise not found"
        )

# Exercise Completion Endpoints
@router.post("/completions", response_model=ExerciseCompletionResponse, status_code=status.HTTP_201_CREATED)
async def log_exercise_completion(
    completion_data: ExerciseCompletionCreate,
    current_user: User = Depends(get_current_user),
    workout_service: WorkoutService = Depends(get_workout_service)
):
    """Log the completion of an exercise by a client."""
    if current_user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can log exercise completions"
        )
    
    completion = workout_service.log_exercise_completion(completion_data, current_user.id)
    return completion

@router.get("/completions/my", response_model=List[ExerciseCompletionResponse])
async def get_my_completions(
    current_user: User = Depends(get_current_user),
    workout_service: WorkoutService = Depends(get_workout_service),
    limit: int = Query(50, ge=1, le=100)
):
    """Get recent exercise completions for the current user."""
    if current_user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can view their completions"
        )
    
    completions = workout_service.get_client_completions(current_user.id, limit)
    return completions 