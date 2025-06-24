from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Workout Plan Schemas
class WorkoutPlanBase(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class WorkoutPlanCreate(WorkoutPlanBase):
    client_id: int

class WorkoutPlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class WorkoutPlanResponse(WorkoutPlanBase):
    id: int
    trainer_id: int
    client_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Workout Session Schemas
class WorkoutSessionBase(BaseModel):
    name: str
    day_of_week: Optional[int] = None
    notes: Optional[str] = None

class WorkoutSessionCreate(WorkoutSessionBase):
    workout_plan_id: int

class WorkoutSessionUpdate(BaseModel):
    name: Optional[str] = None
    day_of_week: Optional[int] = None
    notes: Optional[str] = None

class WorkoutSessionResponse(WorkoutSessionBase):
    id: int
    workout_plan_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Workout Exercise Schemas
class WorkoutExerciseBase(BaseModel):
    order: int
    sets: Optional[int] = None
    reps: Optional[int] = None
    rest_time: Optional[int] = None  # in seconds
    notes: Optional[str] = None

class WorkoutExerciseCreate(WorkoutExerciseBase):
    workout_session_id: int
    exercise_id: int

class WorkoutExerciseUpdate(BaseModel):
    order: Optional[int] = None
    sets: Optional[int] = None
    reps: Optional[int] = None
    rest_time: Optional[int] = None
    notes: Optional[str] = None

class WorkoutExerciseResponse(WorkoutExerciseBase):
    id: int
    workout_session_id: int
    exercise_id: int
    exercise_name: Optional[str] = None
    exercise_description: Optional[str] = None
    exercise_video_url: Optional[str] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_exercise(cls, workout_exercise):
        """Create response from workout exercise with exercise details."""
        data = {
            "id": workout_exercise.id,
            "workout_session_id": workout_exercise.workout_session_id,
            "exercise_id": workout_exercise.exercise_id,
            "order": workout_exercise.order,
            "sets": workout_exercise.sets,
            "reps": workout_exercise.reps,
            "rest_time": workout_exercise.rest_time,
            "notes": workout_exercise.notes,
            "exercise_name": workout_exercise.exercise.name if workout_exercise.exercise else None,
            "exercise_description": workout_exercise.exercise.description if workout_exercise.exercise else None,
            "exercise_video_url": workout_exercise.exercise.video_url if workout_exercise.exercise else None,
        }
        return cls(**data)

# Complete Workout Plan with Sessions and Exercises
class CompleteWorkoutPlanResponse(WorkoutPlanResponse):
    sessions: List[WorkoutSessionResponse] = []

class CompleteWorkoutSessionResponse(WorkoutSessionResponse):
    exercises: List[WorkoutExerciseResponse] = []

# Exercise Completion Schemas
class ExerciseCompletionBase(BaseModel):
    actual_sets: Optional[int] = None
    actual_reps: Optional[int] = None
    difficulty_rating: Optional[int] = None  # 1-5
    notes: Optional[str] = None

class ExerciseCompletionCreate(ExerciseCompletionBase):
    workout_exercise_id: int

class ExerciseCompletionResponse(ExerciseCompletionBase):
    id: int
    workout_exercise_id: int
    client_id: int
    completed_at: datetime

    class Config:
        from_attributes = True

# Filter Schemas
class WorkoutPlanFilter(BaseModel):
    trainer_id: Optional[int] = None
    client_id: Optional[int] = None
    search: Optional[str] = None
    page: int = 1
    size: int = 20 