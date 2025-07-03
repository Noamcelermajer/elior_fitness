from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.models.workout import MuscleGroup

# Exercise Schemas
class ExerciseBase(BaseModel):
    name: str
    description: Optional[str] = None
    video_url: Optional[str] = None
    muscle_group: MuscleGroup
    equipment_needed: Optional[str] = None
    instructions: Optional[str] = None

class ExerciseCreate(ExerciseBase):
    pass

class ExerciseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    video_url: Optional[str] = None
    muscle_group: Optional[MuscleGroup] = None
    equipment_needed: Optional[str] = None
    instructions: Optional[str] = None

class ExerciseResponse(ExerciseBase):
    id: int
    created_by: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

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

    model_config = ConfigDict(from_attributes=True)

# Workout Session Schemas
class WorkoutSessionBase(BaseModel):
    name: str
    day_of_week: Optional[int] = Field(None, ge=0, le=6)  # 0-6 for Monday-Sunday
    notes: Optional[str] = None

class WorkoutSessionCreate(WorkoutSessionBase):
    pass

class WorkoutSessionUpdate(BaseModel):
    name: Optional[str] = None
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    notes: Optional[str] = None

class WorkoutSessionResponse(WorkoutSessionBase):
    id: int
    workout_plan_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Workout Exercise Schemas
class WorkoutExerciseBase(BaseModel):
    exercise_id: int
    order: int = Field(ge=1)
    sets: Optional[int] = Field(None, ge=1)
    reps: Optional[str] = None  # e.g., "8-12", "30 seconds", "to failure"
    rest_time: Optional[int] = Field(None, ge=0)  # in seconds
    notes: Optional[str] = None

class WorkoutExerciseCreate(WorkoutExerciseBase):
    pass

class WorkoutExerciseUpdate(BaseModel):
    exercise_id: Optional[int] = None
    order: Optional[int] = Field(None, ge=1)
    sets: Optional[int] = Field(None, ge=1)
    reps: Optional[str] = None
    rest_time: Optional[int] = Field(None, ge=0)
    notes: Optional[str] = None

class WorkoutExerciseResponse(WorkoutExerciseBase):
    id: int
    workout_session_id: int
    exercise: Optional[ExerciseResponse] = None

    model_config = ConfigDict(from_attributes=True)

# Exercise Completion Schemas
class ExerciseCompletionBase(BaseModel):
    actual_sets: Optional[int] = Field(None, ge=0)
    actual_reps: Optional[str] = None
    weight_used: Optional[str] = None  # e.g., "50kg", "bodyweight"
    difficulty_rating: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None

class ExerciseCompletionCreate(ExerciseCompletionBase):
    workout_exercise_id: int

class ExerciseCompletionUpdate(BaseModel):
    actual_sets: Optional[int] = Field(None, ge=0)
    actual_reps: Optional[str] = None
    weight_used: Optional[str] = None
    difficulty_rating: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None

class ExerciseCompletionResponse(ExerciseCompletionBase):
    id: int
    workout_exercise_id: int
    client_id: int
    completed_at: datetime
    form_photo_path: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# Complete Workout Schemas
class CompleteWorkoutSessionResponse(WorkoutSessionResponse):
    workout_exercises: List[WorkoutExerciseResponse] = []

class CompleteWorkoutPlanResponse(WorkoutPlanResponse):
    workout_sessions: List[CompleteWorkoutSessionResponse] = []

# Filter Schemas
class ExerciseFilter(BaseModel):
    trainer_id: Optional[int] = None
    muscle_group: Optional[MuscleGroup] = None
    search: Optional[str] = None
    page: int = 1
    size: int = 20

class WorkoutPlanFilter(BaseModel):
    trainer_id: Optional[int] = None
    client_id: Optional[int] = None
    search: Optional[str] = None
    page: int = 1
    size: int = 20

class ExerciseCompletionFilter(BaseModel):
    client_id: Optional[int] = None
    workout_exercise_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    page: int = 1
    size: int = 20

# Analytics Schemas
class WorkoutSummary(BaseModel):
    workout_plan_id: int
    workout_plan_name: str
    total_sessions: int
    completed_sessions: int
    total_exercises: int
    completed_exercises: int
    completion_rate: float
    last_workout_date: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ExerciseProgress(BaseModel):
    exercise_id: int
    exercise_name: str
    muscle_group: MuscleGroup
    total_completions: int
    average_sets: float
    average_reps: str
    average_weight: str
    average_difficulty: float
    last_completed: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# Bulk Operations
class BulkWorkoutExerciseCreate(BaseModel):
    exercises: List[WorkoutExerciseCreate]

class BulkExerciseCompletionCreate(BaseModel):
    completions: List[ExerciseCompletionCreate] 