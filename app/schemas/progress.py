from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum

# Session Completion Schemas
class SessionCompletionBase(BaseModel):
    duration_minutes: Optional[int] = Field(None, ge=1, le=600, description="Session duration in minutes")
    difficulty_rating: Optional[int] = Field(None, ge=1, le=5, description="Overall session difficulty (1-5)")
    notes: Optional[str] = Field(None, max_length=1000)

class SessionCompletionCreate(SessionCompletionBase):
    workout_session_id: int

class SessionCompletionResponse(SessionCompletionBase):
    id: int
    workout_session_id: int
    client_id: int
    completed_at: datetime

    class Config:
        from_attributes = True

# Progress Record Schemas
class ProgressRecordBase(BaseModel):
    weight: Optional[int] = Field(None, ge=20000, le=300000, description="Weight in grams")
    body_fat_percentage: Optional[int] = Field(None, ge=30, le=500, description="Body fat in tenths of percent")
    muscle_mass: Optional[int] = Field(None, ge=10000, le=200000, description="Muscle mass in grams")
    notes: Optional[str] = Field(None, max_length=1000)

class ProgressRecordCreate(ProgressRecordBase):
    workout_plan_id: int
    date: Optional[datetime] = None

class ProgressRecordResponse(ProgressRecordBase):
    id: int
    client_id: int
    workout_plan_id: int
    date: datetime

    class Config:
        from_attributes = True

# Progress Analytics Schemas
class ExerciseProgressStats(BaseModel):
    exercise_id: int
    exercise_name: str
    total_completions: int
    avg_difficulty_rating: Optional[float] = None
    avg_sets: Optional[float] = None
    avg_reps: Optional[float] = None
    last_completed: Optional[datetime] = None
    improvement_trend: Optional[str] = None  # "improving", "stable", "declining"

class SessionProgressStats(BaseModel):
    session_id: int
    session_name: str
    total_completions: int
    avg_duration_minutes: Optional[float] = None
    avg_difficulty_rating: Optional[float] = None
    completion_rate: float  # Percentage of exercises completed in sessions
    last_completed: Optional[datetime] = None

class WorkoutPlanProgressStats(BaseModel):
    workout_plan_id: int
    plan_name: str
    total_sessions: int
    completed_sessions: int
    completion_percentage: float
    avg_session_duration: Optional[float] = None
    avg_session_difficulty: Optional[float] = None
    start_date: Optional[datetime] = None
    last_activity: Optional[datetime] = None

class ClientProgressSummary(BaseModel):
    client_id: int
    client_name: str
    total_workouts_completed: int
    total_exercises_completed: int
    avg_workout_difficulty: Optional[float] = None
    total_workout_time_minutes: int
    current_streak_days: int
    longest_streak_days: int
    active_workout_plans: int
    weight_change_grams: Optional[int] = None  # Change from first to last record
    body_fat_change: Optional[int] = None  # Change in tenths of percent
    
# Progress Report Schemas
class ProgressReportFilter(BaseModel):
    client_id: Optional[int] = None
    workout_plan_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    include_exercises: bool = True
    include_sessions: bool = True
    include_body_metrics: bool = True

class ProgressReportData(BaseModel):
    summary: ClientProgressSummary
    exercise_stats: List[ExerciseProgressStats] = []
    session_stats: List[SessionProgressStats] = []
    workout_plan_stats: List[WorkoutPlanProgressStats] = []
    progress_records: List[ProgressRecordResponse] = []
    generated_at: datetime

class ExportFormat(str, Enum):
    JSON = "json"
    CSV = "csv"

# Completion Status Schemas
class CompletionStatusResponse(BaseModel):
    session_id: int
    session_name: str
    total_exercises: int
    completed_exercises: int
    completion_percentage: float
    is_session_completed: bool
    session_completion_date: Optional[datetime] = None

class WorkoutPlanStatusResponse(BaseModel):
    workout_plan_id: int
    plan_name: str
    total_sessions: int
    completed_sessions: int
    completion_percentage: float
    sessions: List[CompletionStatusResponse] = [] 