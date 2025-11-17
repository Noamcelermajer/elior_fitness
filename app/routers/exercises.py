from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
import json

from app.database import get_db
from app.services.workout_service import WorkoutService
from app.services.file_service import FileService
from app.auth.utils import get_current_user
from app.schemas.auth import UserResponse, UserRole
from app.schemas.workout import (
    ExerciseCreate, ExerciseUpdate, ExerciseResponse, ExerciseFilter
)
from app.models.workout import MuscleGroup

logger = logging.getLogger(__name__)
router = APIRouter()

def get_file_service():
    """Dependency to get file service instance."""
    return FileService()

@router.post("/", response_model=ExerciseResponse, status_code=status.HTTP_201_CREATED)
async def create_exercise(
    # Accept either JSON body or form fields
    exercise_data: Optional[ExerciseCreate] = None,
    # Form fields for multipart/form-data
    exercise_json: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
    file_service: FileService = Depends(get_file_service)
):
    """
    Create a new exercise in the trainer's exercise bank.
    Supports both JSON (application/json) and multipart/form-data with optional image upload.
    
    For multipart/form-data:
    - Send exercise_json as a JSON string containing all exercise fields
    - Optionally send image file for exercise demonstration
    """
    if current_user.role != UserRole.TRAINER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can create exercises"
        )
    
    # Handle multipart/form-data (for image uploads)
    if exercise_json:
        try:
            exercise_dict = json.loads(exercise_json)
            exercise_data = ExerciseCreate(**exercise_dict)
        except (json.JSONDecodeError, TypeError, ValueError) as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid JSON in exercise_json field: {str(e)}"
            )
    
    # If no data from form, check if we got JSON body (backward compatibility)
    if not exercise_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exercise data is required. Send exercise_json as form field (for multipart/form-data) or JSON body (for application/json)."
        )
    
    # Handle image upload if provided
    image_path = None
    if image and image.filename:
        try:
            # Validate file
            is_valid, error_msg = await file_service.validate_file(image, file_type="image")
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=error_msg
                )
            
            # Save file - use temp directory first, then we'll move it after exercise creation
            file_result = await file_service.save_file(
                file=image,
                category="exercise_image",
                entity_id=0,  # Temporary ID
                process_image=True
            )
            image_path = file_result["original_path"]
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error uploading exercise image: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error uploading image: {str(e)}"
            )
    
    # Update exercise_data with image_path if uploaded
    exercise_dict = exercise_data.model_dump()
    if image_path:
        exercise_dict["image_path"] = image_path
    
    # Don't include image_path if video_url is already set (video takes priority)
    if exercise_dict.get("video_url") and image_path:
        # Still save image but video will be used for display
        pass
    
    exercise_data = ExerciseCreate(**exercise_dict)
    
    workout_service = WorkoutService(db)
    created_exercise = workout_service.create_exercise(exercise_data, current_user.id)
    
    # If image was uploaded and exercise was created successfully, we could rename the file
    # For now, the path is stored and will work
    if image_path and created_exercise.id:
        logger.info(f"Exercise {created_exercise.id} created with image: {image_path}")
    
    return created_exercise

@router.get("/", response_model=List[ExerciseResponse])
def get_exercises(
    trainer_id: Optional[int] = Query(None, description="Filter by trainer ID"),
    muscle_group: Optional[MuscleGroup] = Query(None, description="Filter by muscle group"),
    search: Optional[str] = Query(None, description="Search in exercise name, description, or instructions"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get exercises with filtering and pagination."""
    workout_service = WorkoutService(db)
    
    filter_params = ExerciseFilter(
        trainer_id=trainer_id,
        muscle_group=muscle_group,
        search=search,
        page=page,
        size=size
    )
    
    exercises, total = workout_service.get_exercises(filter_params)
    return exercises

@router.get("/{exercise_id}", response_model=ExerciseResponse)
def get_exercise(
    exercise_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific exercise by ID."""
    workout_service = WorkoutService(db)
    exercise = workout_service.get_exercise(exercise_id)
    
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found"
        )
    
    return exercise

@router.put("/{exercise_id}", response_model=ExerciseResponse)
def update_exercise(
    exercise_id: int,
    exercise_data: ExerciseUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an exercise (only by the trainer who created it)."""
    if current_user.role != UserRole.TRAINER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can update exercises"
        )
    
    workout_service = WorkoutService(db)
    exercise = workout_service.update_exercise(exercise_id, exercise_data, current_user.id)
    
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found or you don't have permission to update it"
        )
    
    return exercise

@router.delete("/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exercise(
    exercise_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an exercise (only by the trainer who created it)."""
    if current_user.role != UserRole.TRAINER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can delete exercises"
        )
    
    # Check if exercise exists and belongs to the trainer
    from app.models.workout import Exercise
    from sqlalchemy import and_
    exercise = db.query(Exercise).filter(
        and_(
            Exercise.id == exercise_id,
            Exercise.created_by == current_user.id
        )
    ).first()
    
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found or you don't have permission to delete it"
        )
    
    # Check if exercise is used in any workout plans
    from app.models.workout import WorkoutExercise
    from app.models.workout_system import WorkoutExerciseV2, ExercisePersonalRecord
    
    workout_exercise_count = db.query(WorkoutExercise).filter(
        WorkoutExercise.exercise_id == exercise_id
    ).count()
    
    workout_exercise_v2_count = db.query(WorkoutExerciseV2).filter(
        WorkoutExerciseV2.exercise_id == exercise_id
    ).count()
    
    exercise_pr_count = db.query(ExercisePersonalRecord).filter(
        ExercisePersonalRecord.exercise_id == exercise_id
    ).count()
    
    if workout_exercise_count > 0 or workout_exercise_v2_count > 0 or exercise_pr_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete exercise: It is currently used in {workout_exercise_count + workout_exercise_v2_count} workout plan(s) and {exercise_pr_count} personal record(s). Please remove it from all workout plans first."
        )
    
    # Try to delete the exercise directly
    try:
        db.delete(exercise)
        db.commit()
        return None  # 204 No Content
    except Exception as e:
        db.rollback()
        import traceback
        error_detail = str(e)
        logger.error(f"Error deleting exercise {exercise_id}: {error_detail}\n{traceback.format_exc()}")
        
        # Check if it's a foreign key constraint error
        if "foreign key" in str(e).lower() or "constraint" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete exercise: It is still referenced in the database. Please ensure it's not used in any workout plans."
            )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete exercise: {error_detail}"
        )

@router.get("/test")
async def test_exercises():
    return {"message": "Exercises router working"} 