from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import datetime
from app.models.workout import WorkoutPlan, WorkoutSession, WorkoutExercise, ExerciseCompletion, Exercise
from app.schemas.workouts import (
    WorkoutPlanCreate, WorkoutPlanUpdate, WorkoutSessionCreate, WorkoutSessionUpdate,
    WorkoutExerciseCreate, WorkoutExerciseUpdate, ExerciseCompletionCreate, WorkoutPlanFilter
)

class WorkoutService:
    def __init__(self, db: Session):
        self.db = db

    # Workout Plan Methods
    def create_workout_plan(self, workout_plan_data: WorkoutPlanCreate, trainer_id: int) -> WorkoutPlan:
        """Create a new workout plan for a client."""
        db_workout_plan = WorkoutPlan(
            **workout_plan_data.model_dump(),
            trainer_id=trainer_id
        )
        self.db.add(db_workout_plan)
        self.db.commit()
        self.db.refresh(db_workout_plan)
        return db_workout_plan

    def get_workout_plan(self, workout_plan_id: int) -> Optional[WorkoutPlan]:
        """Get a workout plan by ID."""
        return self.db.query(WorkoutPlan).filter(WorkoutPlan.id == workout_plan_id).first()

    def get_workout_plans(self, filter_params: WorkoutPlanFilter) -> tuple[List[WorkoutPlan], int]:
        """Get workout plans with filtering and pagination."""
        query = self.db.query(WorkoutPlan)
        
        # Apply filters
        if filter_params.trainer_id:
            query = query.filter(WorkoutPlan.trainer_id == filter_params.trainer_id)
        
        if filter_params.client_id:
            query = query.filter(WorkoutPlan.client_id == filter_params.client_id)
        
        if filter_params.search:
            search_term = f"%{filter_params.search}%"
            query = query.filter(
                or_(
                    WorkoutPlan.name.ilike(search_term),
                    WorkoutPlan.description.ilike(search_term)
                )
            )
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (filter_params.page - 1) * filter_params.size
        workout_plans = query.offset(offset).limit(filter_params.size).all()
        
        return workout_plans, total

    def update_workout_plan(self, workout_plan_id: int, workout_plan_data: WorkoutPlanUpdate) -> Optional[WorkoutPlan]:
        """Update a workout plan."""
        db_workout_plan = self.get_workout_plan(workout_plan_id)
        if not db_workout_plan:
            return None
        
        update_data = workout_plan_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_workout_plan, field, value)
        
        self.db.commit()
        self.db.refresh(db_workout_plan)
        return db_workout_plan

    def delete_workout_plan(self, workout_plan_id: int) -> bool:
        """Delete a workout plan and all associated sessions and exercises."""
        db_workout_plan = self.get_workout_plan(workout_plan_id)
        if not db_workout_plan:
            return False
        
        self.db.delete(db_workout_plan)
        self.db.commit()
        return True

    # Workout Session Methods
    def create_workout_session(self, session_data: WorkoutSessionCreate) -> WorkoutSession:
        """Create a new workout session."""
        db_session = WorkoutSession(**session_data.model_dump())
        self.db.add(db_session)
        self.db.commit()
        self.db.refresh(db_session)
        return db_session

    def get_workout_session(self, session_id: int) -> Optional[WorkoutSession]:
        """Get a workout session by ID."""
        return self.db.query(WorkoutSession).filter(WorkoutSession.id == session_id).first()

    def get_sessions_by_plan(self, workout_plan_id: int) -> List[WorkoutSession]:
        """Get all sessions for a workout plan."""
        return self.db.query(WorkoutSession).filter(
            WorkoutSession.workout_plan_id == workout_plan_id
        ).order_by(WorkoutSession.day_of_week).all()

    def update_workout_session(self, session_id: int, session_data: WorkoutSessionUpdate) -> Optional[WorkoutSession]:
        """Update a workout session."""
        db_session = self.get_workout_session(session_id)
        if not db_session:
            return None
        
        update_data = session_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_session, field, value)
        
        self.db.commit()
        self.db.refresh(db_session)
        return db_session

    def delete_workout_session(self, session_id: int) -> bool:
        """Delete a workout session and all associated exercises."""
        db_session = self.get_workout_session(session_id)
        if not db_session:
            return False
        
        self.db.delete(db_session)
        self.db.commit()
        return True

    # Workout Exercise Methods
    def add_exercise_to_session(self, exercise_data: WorkoutExerciseCreate) -> WorkoutExercise:
        """Add an exercise to a workout session."""
        # Get the current max order for this session
        max_order = self.db.query(WorkoutExercise).filter(
            WorkoutExercise.workout_session_id == exercise_data.workout_session_id
        ).count()
        
        db_exercise = WorkoutExercise(
            **exercise_data.model_dump(),
            order=max_order + 1
        )
        self.db.add(db_exercise)
        self.db.commit()
        self.db.refresh(db_exercise)
        return db_exercise

    def get_session_exercises(self, session_id: int) -> List[WorkoutExercise]:
        """Get all exercises for a workout session with exercise details."""
        return self.db.query(WorkoutExercise).options(
            joinedload(WorkoutExercise.exercise)
        ).filter(
            WorkoutExercise.workout_session_id == session_id
        ).order_by(WorkoutExercise.order).all()

    def get_workout_exercise(self, exercise_id: int) -> Optional[WorkoutExercise]:
        """Get a specific workout exercise by ID."""
        return self.db.query(WorkoutExercise).filter(WorkoutExercise.id == exercise_id).first()

    def update_exercise_order(self, session_id: int, exercise_orders: List[dict]) -> bool:
        """Update the order of exercises in a session."""
        try:
            for order_data in exercise_orders:
                exercise_id = order_data.get('exercise_id')
                new_order = order_data.get('order')
                if exercise_id and new_order is not None:
                    db_exercise = self.db.query(WorkoutExercise).filter(
                        WorkoutExercise.id == exercise_id,
                        WorkoutExercise.workout_session_id == session_id
                    ).first()
                    if db_exercise:
                        db_exercise.order = new_order
            
            self.db.commit()
            return True
        except Exception:
            self.db.rollback()
            return False

    def update_workout_exercise(self, exercise_id: int, exercise_data: WorkoutExerciseUpdate) -> Optional[WorkoutExercise]:
        """Update a workout exercise."""
        db_exercise = self.db.query(WorkoutExercise).filter(WorkoutExercise.id == exercise_id).first()
        if not db_exercise:
            return None
        
        update_data = exercise_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_exercise, field, value)
        
        self.db.commit()
        self.db.refresh(db_exercise)
        return db_exercise

    def remove_exercise_from_session(self, exercise_id: int) -> bool:
        """Remove an exercise from a workout session."""
        db_exercise = self.db.query(WorkoutExercise).filter(WorkoutExercise.id == exercise_id).first()
        if not db_exercise:
            return False
        
        self.db.delete(db_exercise)
        self.db.commit()
        return True

    # Exercise Completion Methods
    def log_exercise_completion(self, completion_data: ExerciseCompletionCreate, client_id: int) -> ExerciseCompletion:
        """Log the completion of an exercise by a client."""
        db_completion = ExerciseCompletion(
            **completion_data.model_dump(),
            client_id=client_id
        )
        self.db.add(db_completion)
        self.db.commit()
        self.db.refresh(db_completion)
        return db_completion

    def get_client_completions(self, client_id: int, limit: int = 50) -> List[ExerciseCompletion]:
        """Get recent exercise completions for a client."""
        return self.db.query(ExerciseCompletion).filter(
            ExerciseCompletion.client_id == client_id
        ).order_by(ExerciseCompletion.completed_at.desc()).limit(limit).all()

    # Complete Workout Plan Methods
    def get_complete_workout_plan(self, workout_plan_id: int) -> Optional[WorkoutPlan]:
        """Get a complete workout plan with all sessions and exercises."""
        return self.db.query(WorkoutPlan).options(
            joinedload(WorkoutPlan.sessions).joinedload(WorkoutSession.exercises).joinedload(WorkoutExercise.exercise)
        ).filter(WorkoutPlan.id == workout_plan_id).first() 