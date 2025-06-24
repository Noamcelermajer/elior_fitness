from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.auth.utils import get_current_user
from app.models.user import User
from app.services.exercise_service import ExerciseService
from app.schemas.exercises import (
    ExerciseCreate, ExerciseUpdate, ExerciseResponse, 
    ExerciseListResponse, ExerciseFilter
)

router = APIRouter()

def get_exercise_service(db: Session = Depends(get_db)) -> ExerciseService:
    return ExerciseService(db)

@router.post("/", response_model=ExerciseResponse, status_code=status.HTTP_201_CREATED)
async def create_exercise(
    exercise_data: ExerciseCreate,
    current_user: User = Depends(get_current_user),
    exercise_service: ExerciseService = Depends(get_exercise_service)
):
    """Create a new exercise in the exercise bank."""
    if current_user.role != "trainer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can create exercises"
        )
    
    exercise = exercise_service.create_exercise(exercise_data, current_user.id)
    return exercise

@router.get("/", response_model=ExerciseListResponse)
async def get_exercises(
    search: Optional[str] = Query(None, description="Search term for exercise name, description, muscle groups, or equipment"),
    muscle_groups: Optional[str] = Query(None, description="Filter by muscle groups"),
    equipment_needed: Optional[str] = Query(None, description="Filter by equipment needed"),
    difficulty_level: Optional[str] = Query(None, description="Filter by difficulty level"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Number of items per page"),
    exercise_service: ExerciseService = Depends(get_exercise_service)
):
    """Get exercises with search and filtering capabilities."""
    filter_params = ExerciseFilter(
        search=search,
        muscle_groups=muscle_groups,
        equipment_needed=equipment_needed,
        difficulty_level=difficulty_level,
        page=page,
        size=size
    )
    
    exercises, total = exercise_service.search_exercises(filter_params)
    
    return ExerciseListResponse(
        exercises=exercises,
        total=total,
        page=page,
        size=size
    )

@router.get("/categories")
async def get_exercise_categories(
    exercise_service: ExerciseService = Depends(get_exercise_service)
):
    """Get available exercise categories for filtering."""
    return exercise_service.get_exercise_categories()

@router.get("/my-exercises", response_model=List[ExerciseResponse])
async def get_my_exercises(
    current_user: User = Depends(get_current_user),
    exercise_service: ExerciseService = Depends(get_exercise_service),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    """Get exercises created by the current user."""
    if current_user.role != "trainer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can access their created exercises"
        )
    
    exercises = exercise_service.get_exercises_by_creator(current_user.id, skip, limit)
    return exercises

@router.get("/{exercise_id}", response_model=ExerciseResponse)
async def get_exercise(
    exercise_id: int,
    exercise_service: ExerciseService = Depends(get_exercise_service)
):
    """Get a specific exercise by ID."""
    exercise = exercise_service.get_exercise(exercise_id)
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found"
        )
    return exercise

@router.put("/{exercise_id}", response_model=ExerciseResponse)
async def update_exercise(
    exercise_id: int,
    exercise_data: ExerciseUpdate,
    current_user: User = Depends(get_current_user),
    exercise_service: ExerciseService = Depends(get_exercise_service)
):
    """Update an exercise."""
    if current_user.role != "trainer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can update exercises"
        )
    
    # Check if exercise exists and was created by the current user
    exercise = exercise_service.get_exercise(exercise_id)
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found"
        )
    
    if exercise.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update exercises you created"
        )
    
    updated_exercise = exercise_service.update_exercise(exercise_id, exercise_data)
    if not updated_exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found"
        )
    
    return updated_exercise

@router.delete("/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exercise(
    exercise_id: int,
    current_user: User = Depends(get_current_user),
    exercise_service: ExerciseService = Depends(get_exercise_service)
):
    """Delete an exercise."""
    if current_user.role != "trainer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can delete exercises"
        )
    
    # Check if exercise exists and was created by the current user
    exercise = exercise_service.get_exercise(exercise_id)
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found"
        )
    
    if exercise.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete exercises you created"
        )
    
    success = exercise_service.delete_exercise(exercise_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found"
        ) 