from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, asc, and_, or_, case, text
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, date
import csv
import json
import io
from app.models.workout import (
    WorkoutPlan, WorkoutSession, WorkoutExercise, ExerciseCompletion, 
    SessionCompletion, ProgressRecord, Exercise
)
from app.models.user import User
from app.schemas.progress import (
    SessionCompletionCreate, ProgressRecordCreate, ProgressReportFilter,
    ExerciseProgressStats, SessionProgressStats, WorkoutPlanProgressStats,
    ClientProgressSummary, ProgressReportData, CompletionStatusResponse,
    WorkoutPlanStatusResponse, ExportFormat
)

class ProgressService:
    def __init__(self, db: Session):
        self.db = db

    # Session Completion Methods
    def complete_session(self, completion_data: SessionCompletionCreate, client_id: int) -> SessionCompletion:
        """Mark a workout session as completed by a client."""
        # Check if session is already completed
        existing_completion = self.db.query(SessionCompletion).filter(
            SessionCompletion.workout_session_id == completion_data.workout_session_id,
            SessionCompletion.client_id == client_id
        ).first()
        
        if existing_completion:
            # Update existing completion
            for field, value in completion_data.model_dump(exclude_unset=True).items():
                setattr(existing_completion, field, value)
            existing_completion.completed_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(existing_completion)
            return existing_completion
        
        # Create new completion
        db_completion = SessionCompletion(
            **completion_data.model_dump(),
            client_id=client_id
        )
        self.db.add(db_completion)
        self.db.commit()
        self.db.refresh(db_completion)
        return db_completion

    def get_session_completion(self, session_id: int, client_id: int) -> Optional[SessionCompletion]:
        """Get session completion for a specific session and client."""
        return self.db.query(SessionCompletion).filter(
            SessionCompletion.workout_session_id == session_id,
            SessionCompletion.client_id == client_id
        ).first()

    def get_client_session_completions(self, client_id: int, limit: int = 50) -> List[SessionCompletion]:
        """Get recent session completions for a client."""
        return self.db.query(SessionCompletion).filter(
            SessionCompletion.client_id == client_id
        ).order_by(SessionCompletion.completed_at.desc()).limit(limit).all()

    # Progress Record Methods
    def create_progress_record(self, record_data: ProgressRecordCreate, client_id: int) -> ProgressRecord:
        """Create a new progress record for a client."""
        db_record = ProgressRecord(
            **record_data.model_dump(),
            client_id=client_id
        )
        self.db.add(db_record)
        self.db.commit()
        self.db.refresh(db_record)
        return db_record

    def get_client_progress_records(self, client_id: int, workout_plan_id: Optional[int] = None) -> List[ProgressRecord]:
        """Get all progress records for a client, optionally filtered by workout plan."""
        query = self.db.query(ProgressRecord).filter(ProgressRecord.client_id == client_id)
        
        if workout_plan_id:
            query = query.filter(ProgressRecord.workout_plan_id == workout_plan_id)
        
        return query.order_by(ProgressRecord.date.desc()).all()

    # Analytics Methods
    def get_exercise_progress_stats(self, client_id: int, exercise_id: Optional[int] = None) -> List[ExerciseProgressStats]:
        """Get detailed exercise progress statistics for a client."""
        query = self.db.query(
            Exercise.id.label('exercise_id'),
            Exercise.name.label('exercise_name'),
            func.count(ExerciseCompletion.id).label('total_completions'),
            func.avg(ExerciseCompletion.difficulty_rating).label('avg_difficulty_rating'),
            func.avg(ExerciseCompletion.actual_sets).label('avg_sets'),
            func.avg(ExerciseCompletion.actual_reps).label('avg_reps'),
            func.max(ExerciseCompletion.completed_at).label('last_completed')
        ).join(
            WorkoutExercise, Exercise.id == WorkoutExercise.exercise_id
        ).join(
            ExerciseCompletion, WorkoutExercise.id == ExerciseCompletion.workout_exercise_id
        ).filter(
            ExerciseCompletion.client_id == client_id
        )
        
        if exercise_id:
            query = query.filter(Exercise.id == exercise_id)
        
        query = query.group_by(Exercise.id, Exercise.name)
        results = query.all()
        
        stats = []
        for result in results:
            # Calculate improvement trend (simplified - could be more sophisticated)
            trend = self._calculate_improvement_trend(client_id, result.exercise_id)
            
            stats.append(ExerciseProgressStats(
                exercise_id=result.exercise_id,
                exercise_name=result.exercise_name,
                total_completions=result.total_completions,
                avg_difficulty_rating=round(result.avg_difficulty_rating, 2) if result.avg_difficulty_rating else None,
                avg_sets=round(result.avg_sets, 2) if result.avg_sets else None,
                avg_reps=round(result.avg_reps, 2) if result.avg_reps else None,
                last_completed=result.last_completed,
                improvement_trend=trend
            ))
        
        return stats

    def get_session_progress_stats(self, client_id: int, workout_plan_id: Optional[int] = None) -> List[SessionProgressStats]:
        """Get detailed session progress statistics for a client."""
        query = self.db.query(
            WorkoutSession.id.label('session_id'),
            WorkoutSession.name.label('session_name'),
            func.count(SessionCompletion.id).label('total_completions'),
            func.avg(SessionCompletion.duration_minutes).label('avg_duration_minutes'),
            func.avg(SessionCompletion.difficulty_rating).label('avg_difficulty_rating'),
            func.max(SessionCompletion.completed_at).label('last_completed')
        ).outerjoin(
            SessionCompletion, and_(
                WorkoutSession.id == SessionCompletion.workout_session_id,
                SessionCompletion.client_id == client_id
            )
        )
        
        if workout_plan_id:
            query = query.filter(WorkoutSession.workout_plan_id == workout_plan_id)
        
        query = query.group_by(WorkoutSession.id, WorkoutSession.name)
        results = query.all()
        
        stats = []
        for result in results:
            # Calculate completion rate for this session
            completion_rate = self._calculate_session_completion_rate(result.session_id, client_id)
            
            stats.append(SessionProgressStats(
                session_id=result.session_id,
                session_name=result.session_name,
                total_completions=result.total_completions or 0,
                avg_duration_minutes=round(result.avg_duration_minutes, 2) if result.avg_duration_minutes else None,
                avg_difficulty_rating=round(result.avg_difficulty_rating, 2) if result.avg_difficulty_rating else None,
                completion_rate=completion_rate,
                last_completed=result.last_completed
            ))
        
        return stats

    def get_workout_plan_progress_stats(self, client_id: int) -> List[WorkoutPlanProgressStats]:
        """Get detailed workout plan progress statistics for a client."""
        query = self.db.query(
            WorkoutPlan.id.label('workout_plan_id'),
            WorkoutPlan.name.label('plan_name'),
            WorkoutPlan.start_date,
            func.count(WorkoutSession.id).label('total_sessions'),
            func.count(SessionCompletion.id).label('completed_sessions'),
            func.avg(SessionCompletion.duration_minutes).label('avg_session_duration'),
            func.avg(SessionCompletion.difficulty_rating).label('avg_session_difficulty'),
            func.max(SessionCompletion.completed_at).label('last_activity')
        ).outerjoin(
            WorkoutSession, WorkoutPlan.id == WorkoutSession.workout_plan_id
        ).outerjoin(
            SessionCompletion, and_(
                WorkoutSession.id == SessionCompletion.workout_session_id,
                SessionCompletion.client_id == client_id
            )
        ).filter(
            WorkoutPlan.client_id == client_id
        ).group_by(
            WorkoutPlan.id, WorkoutPlan.name, WorkoutPlan.start_date
        )
        
        results = query.all()
        
        stats = []
        for result in results:
            completion_percentage = (
                (result.completed_sessions / result.total_sessions * 100) 
                if result.total_sessions > 0 else 0
            )
            
            stats.append(WorkoutPlanProgressStats(
                workout_plan_id=result.workout_plan_id,
                plan_name=result.plan_name,
                total_sessions=result.total_sessions or 0,
                completed_sessions=result.completed_sessions or 0,
                completion_percentage=round(completion_percentage, 2),
                avg_session_duration=round(result.avg_session_duration, 2) if result.avg_session_duration else None,
                avg_session_difficulty=round(result.avg_session_difficulty, 2) if result.avg_session_difficulty else None,
                start_date=result.start_date,
                last_activity=result.last_activity
            ))
        
        return stats

    def get_client_progress_summary(self, client_id: int) -> ClientProgressSummary:
        """Get comprehensive progress summary for a client."""
        # Get client info
        client = self.db.query(User).filter(User.id == client_id).first()
        if not client:
            raise ValueError("Client not found")
        
        # Basic stats
        total_sessions_completed = self.db.query(SessionCompletion).filter(
            SessionCompletion.client_id == client_id
        ).count()
        
        total_exercises_completed = self.db.query(ExerciseCompletion).filter(
            ExerciseCompletion.client_id == client_id
        ).count()
        
        avg_workout_difficulty = self.db.query(
            func.avg(SessionCompletion.difficulty_rating)
        ).filter(SessionCompletion.client_id == client_id).scalar()
        
        total_workout_time = self.db.query(
            func.sum(SessionCompletion.duration_minutes)
        ).filter(SessionCompletion.client_id == client_id).scalar() or 0
        
        # Active workout plans
        active_plans = self.db.query(WorkoutPlan).filter(
            WorkoutPlan.client_id == client_id,
            or_(WorkoutPlan.end_date.is_(None), WorkoutPlan.end_date > datetime.utcnow())
        ).count()
        
        return ClientProgressSummary(
            client_id=client_id,
            client_name=client.full_name or client.email,
            total_workouts_completed=total_sessions_completed,
            total_exercises_completed=total_exercises_completed,
            avg_workout_difficulty=round(avg_workout_difficulty, 2) if avg_workout_difficulty else None,
            total_workout_time_minutes=total_workout_time,
            current_streak_days=0,  # Simplified for now
            longest_streak_days=0,  # Simplified for now  
            active_workout_plans=active_plans,
            weight_change_grams=None,  # Simplified for now
            body_fat_change=None  # Simplified for now
        )

    # Completion Status Methods
    def get_session_completion_status(self, session_id: int, client_id: int) -> CompletionStatusResponse:
        """Get completion status for a specific session."""
        session = self.db.query(WorkoutSession).filter(WorkoutSession.id == session_id).first()
        if not session:
            raise ValueError("Session not found")
        
        # Count total exercises in session
        total_exercises = self.db.query(WorkoutExercise).filter(
            WorkoutExercise.workout_session_id == session_id
        ).count()
        
        # Count completed exercises
        completed_exercises = self.db.query(WorkoutExercise).join(
            ExerciseCompletion, WorkoutExercise.id == ExerciseCompletion.workout_exercise_id
        ).filter(
            WorkoutExercise.workout_session_id == session_id,
            ExerciseCompletion.client_id == client_id
        ).count()
        
        # Check if session is marked as completed
        session_completion = self.get_session_completion(session_id, client_id)
        
        completion_percentage = (completed_exercises / total_exercises * 100) if total_exercises > 0 else 0
        
        return CompletionStatusResponse(
            session_id=session_id,
            session_name=session.name,
            total_exercises=total_exercises,
            completed_exercises=completed_exercises,
            completion_percentage=round(completion_percentage, 2),
            is_session_completed=session_completion is not None,
            session_completion_date=session_completion.completed_at if session_completion else None
        )

    def get_workout_plan_completion_status(self, workout_plan_id: int, client_id: int) -> WorkoutPlanStatusResponse:
        """Get completion status for an entire workout plan."""
        workout_plan = self.db.query(WorkoutPlan).filter(WorkoutPlan.id == workout_plan_id).first()
        if not workout_plan:
            raise ValueError("Workout plan not found")
        
        # Get all sessions in the plan
        sessions = self.db.query(WorkoutSession).filter(
            WorkoutSession.workout_plan_id == workout_plan_id
        ).all()
        
        session_statuses = []
        completed_sessions = 0
        
        for session in sessions:
            status = self.get_session_completion_status(session.id, client_id)
            session_statuses.append(status)
            if status.is_session_completed:
                completed_sessions += 1
        
        total_sessions = len(sessions)
        completion_percentage = (completed_sessions / total_sessions * 100) if total_sessions > 0 else 0
        
        return WorkoutPlanStatusResponse(
            workout_plan_id=workout_plan_id,
            plan_name=workout_plan.name,
            total_sessions=total_sessions,
            completed_sessions=completed_sessions,
            completion_percentage=round(completion_percentage, 2),
            sessions=session_statuses
        )

    # Report Generation Methods
    def generate_progress_report(self, filter_params: ProgressReportFilter) -> ProgressReportData:
        """Generate comprehensive progress report."""
        if not filter_params.client_id:
            raise ValueError("Client ID is required for progress reports")
        
        # Get summary
        summary = self.get_client_progress_summary(filter_params.client_id)
        
        return ProgressReportData(
            summary=summary,
            exercise_stats=[],
            session_stats=[],
            workout_plan_stats=[],
            progress_records=[],
            generated_at=datetime.utcnow()
        )

    def export_progress_report(self, report_data: ProgressReportData, format: ExportFormat) -> str:
        """Export progress report in specified format."""
        if format == ExportFormat.JSON:
            return json.dumps(report_data.model_dump(), default=str, indent=2)
        elif format == ExportFormat.CSV:
            # Simplified CSV export
            return f"Client Progress Report\nClient: {report_data.summary.client_name}\nTotal Workouts: {report_data.summary.total_workouts_completed}\n"
        else:
            raise ValueError(f"Unsupported export format: {format}")

    # Helper Methods
    def _calculate_improvement_trend(self, client_id: int, exercise_id: int) -> str:
        """Calculate improvement trend for an exercise (simplified)."""
        # Get recent completions for this exercise
        recent_completions = self.db.query(ExerciseCompletion).join(
            WorkoutExercise, ExerciseCompletion.workout_exercise_id == WorkoutExercise.id
        ).filter(
            WorkoutExercise.exercise_id == exercise_id,
            ExerciseCompletion.client_id == client_id
        ).order_by(ExerciseCompletion.completed_at.desc()).limit(10).all()
        
        if len(recent_completions) < 3:
            return "insufficient_data"
        
        # Simple trend analysis based on difficulty ratings
        first_half = recent_completions[len(recent_completions)//2:]
        second_half = recent_completions[:len(recent_completions)//2]
        
        avg_first = sum(c.difficulty_rating for c in first_half if c.difficulty_rating) / len(first_half)
        avg_second = sum(c.difficulty_rating for c in second_half if c.difficulty_rating) / len(second_half)
        
        if avg_second < avg_first - 0.3:
            return "improving"  # Lower difficulty means getting easier
        elif avg_second > avg_first + 0.3:
            return "declining"  # Higher difficulty means struggling more
        else:
            return "stable"

    def _calculate_session_completion_rate(self, session_id: int, client_id: int) -> float:
        """Calculate the completion rate for exercises in a session."""
        total_exercises = self.db.query(WorkoutExercise).filter(
            WorkoutExercise.workout_session_id == session_id
        ).count()
        
        if total_exercises == 0:
            return 0.0
        
        completed_exercises = self.db.query(WorkoutExercise).join(
            ExerciseCompletion, WorkoutExercise.id == ExerciseCompletion.workout_exercise_id
        ).filter(
            WorkoutExercise.workout_session_id == session_id,
            ExerciseCompletion.client_id == client_id
        ).count()
        
        return round((completed_exercises / total_exercises) * 100, 2) 