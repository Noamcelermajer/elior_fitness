from sqlalchemy import Boolean, Column, Integer, String, ForeignKey, DateTime, JSON
from sqlalchemy.sql import func
from app.database import Base

class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    video_url = Column(String)
    muscle_groups = Column(String)  # Comma-separated list
    equipment_needed = Column(String)
    difficulty_level = Column(String)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class WorkoutPlan(Base):
    __tablename__ = "workout_plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    trainer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id = Column(Integer, primary_key=True, index=True)
    workout_plan_id = Column(Integer, ForeignKey("workout_plans.id"), nullable=False)
    name = Column(String, nullable=False)  # e.g., "Day 1: Upper Body"
    day_of_week = Column(Integer)  # 0-6 for Monday-Sunday
    notes = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class WorkoutExercise(Base):
    __tablename__ = "workout_exercises"

    id = Column(Integer, primary_key=True, index=True)
    workout_session_id = Column(Integer, ForeignKey("workout_sessions.id"), nullable=False)
    exercise_id = Column(Integer, ForeignKey("exercises.id"), nullable=False)
    order = Column(Integer, nullable=False)
    sets = Column(Integer)
    reps = Column(Integer)
    rest_time = Column(Integer)  # in seconds
    notes = Column(String)

class ExerciseCompletion(Base):
    __tablename__ = "exercise_completions"

    id = Column(Integer, primary_key=True, index=True)
    workout_exercise_id = Column(Integer, ForeignKey("workout_exercises.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    completed_at = Column(DateTime(timezone=True), server_default=func.now())
    actual_sets = Column(Integer)
    actual_reps = Column(Integer)
    difficulty_rating = Column(Integer)  # 1-5
    notes = Column(String) 