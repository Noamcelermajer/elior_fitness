from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from app.models.workout import Exercise
from app.schemas.exercises import ExerciseCreate, ExerciseUpdate, ExerciseFilter

class ExerciseService:
    def __init__(self, db: Session):
        self.db = db

    def create_exercise(self, exercise_data: ExerciseCreate, created_by: int) -> Exercise:
        """Create a new exercise in the exercise bank."""
        db_exercise = Exercise(
            **exercise_data.model_dump(),
            created_by=created_by
        )
        self.db.add(db_exercise)
        self.db.commit()
        self.db.refresh(db_exercise)
        return db_exercise

    def get_exercise(self, exercise_id: int) -> Optional[Exercise]:
        """Get an exercise by ID."""
        return self.db.query(Exercise).filter(Exercise.id == exercise_id).first()

    def get_exercises(self, skip: int = 0, limit: int = 100) -> List[Exercise]:
        """Get all exercises with pagination."""
        return self.db.query(Exercise).offset(skip).limit(limit).all()

    def search_exercises(self, filter_params: ExerciseFilter) -> tuple[List[Exercise], int]:
        """Search and filter exercises."""
        query = self.db.query(Exercise)
        
        # Apply search filter
        if filter_params.search:
            search_term = f"%{filter_params.search}%"
            query = query.filter(
                or_(
                    Exercise.name.ilike(search_term),
                    Exercise.description.ilike(search_term),
                    Exercise.muscle_groups.ilike(search_term),
                    Exercise.equipment_needed.ilike(search_term)
                )
            )
        
        # Apply muscle groups filter
        if filter_params.muscle_groups:
            query = query.filter(Exercise.muscle_groups.ilike(f"%{filter_params.muscle_groups}%"))
        
        # Apply equipment filter
        if filter_params.equipment_needed:
            query = query.filter(Exercise.equipment_needed.ilike(f"%{filter_params.equipment_needed}%"))
        
        # Apply difficulty level filter
        if filter_params.difficulty_level:
            query = query.filter(Exercise.difficulty_level == filter_params.difficulty_level)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (filter_params.page - 1) * filter_params.size
        exercises = query.offset(offset).limit(filter_params.size).all()
        
        return exercises, total

    def update_exercise(self, exercise_id: int, exercise_data: ExerciseUpdate) -> Optional[Exercise]:
        """Update an exercise."""
        db_exercise = self.get_exercise(exercise_id)
        if not db_exercise:
            return None
        
        update_data = exercise_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_exercise, field, value)
        
        self.db.commit()
        self.db.refresh(db_exercise)
        return db_exercise

    def delete_exercise(self, exercise_id: int) -> bool:
        """Delete an exercise."""
        db_exercise = self.get_exercise(exercise_id)
        if not db_exercise:
            return False
        
        self.db.delete(db_exercise)
        self.db.commit()
        return True

    def get_exercises_by_creator(self, created_by: int, skip: int = 0, limit: int = 100) -> List[Exercise]:
        """Get exercises created by a specific user."""
        return self.db.query(Exercise).filter(
            Exercise.created_by == created_by
        ).offset(skip).limit(limit).all()

    def get_exercise_categories(self) -> dict:
        """Get available exercise categories for filtering."""
        muscle_groups = self.db.query(Exercise.muscle_groups).distinct().all()
        equipment = self.db.query(Exercise.equipment_needed).distinct().all()
        difficulty_levels = self.db.query(Exercise.difficulty_level).distinct().all()
        
        return {
            "muscle_groups": [mg[0] for mg in muscle_groups if mg[0]],
            "equipment": [eq[0] for eq in equipment if eq[0]],
            "difficulty_levels": [dl[0] for dl in difficulty_levels if dl[0]]
        } 