from sqlalchemy.orm import Session
from sqlalchemy import and_, func, extract
from datetime import datetime, timedelta, time
from typing import List, Optional
from app.models.user import User
from app.models.progress import ProgressEntry
from app.models.workout import WorkoutExercise, ExerciseCompletion
from app.models.nutrition import MealPlan, MealUpload
from app.services.notification_service import notification_service

class NotificationTriggers:
    @staticmethod
    def send_critical_server_notification(
        db: Session,
        title: str,
        message: str,
        notification_type: str = "error"
    ):
        """Send critical notifications to all admin users"""
        admin_users = db.query(User).filter(User.role == "admin").all()
        admin_ids = [user.id for user in admin_users]
        
        if admin_ids:
            notification_service.create_system_notification(
                db=db,
                title=title,
                message=message,
                notification_type=notification_type,
                recipient_ids=admin_ids
            )

    @staticmethod
    def check_goal_achievements(db: Session, client_id: int):
        """Check if client has reached their goals and notify trainer"""
        # Get client's trainer
        client = db.query(User).filter(User.id == client_id).first()
        if not client or not client.trainer_id:
            return
        
        # Get latest progress entry
        latest_progress = db.query(ProgressEntry).filter(
            ProgressEntry.client_id == client_id
        ).order_by(ProgressEntry.recorded_at.desc()).first()
        
        if not latest_progress:
            return
        
        # Check weight goal achievement
        if latest_progress.target_weight and latest_progress.current_weight:
            if latest_progress.current_weight <= latest_progress.target_weight:
                notification_service.create_notification(
                    db=db,
                    notification_data={
                        "title": "Goal Achievement! 🎉",
                        "message": f"Client {client.full_name} has reached their target weight goal!",
                        "type": "success",
                        "recipient_id": client.trainer_id
                    },
                    sender_id=None  # System notification
                )

    @staticmethod
    def check_missed_exercises_weekly(db: Session):
        """Check for missed exercises at the end of the week (Sunday 12 PM)"""
        now = datetime.now()
        
        # Only run on Sunday at 12 PM
        if now.weekday() != 6 or now.hour != 12:  # Sunday = 6
            return
        
        # Get the start of the week (Monday)
        week_start = now - timedelta(days=now.weekday() + 1)
        week_end = week_start + timedelta(days=7)
        
        # Get all clients with their trainers
        clients = db.query(User).filter(User.role == "client").all()
        
        for client in clients:
            if not client.trainer_id:
                continue
            
            # Count missed exercises for this client this week
            missed_exercises = db.query(WorkoutExercise).join(
                ExerciseCompletion, 
                and_(
                    WorkoutExercise.id == ExerciseCompletion.workout_exercise_id,
                    ExerciseCompletion.client_id == client.id,
                    ExerciseCompletion.completed_at >= week_start,
                    ExerciseCompletion.completed_at < week_end
                ),
                isouter=True
            ).filter(
                and_(
                    WorkoutExercise.workout_session.has(trainer_id=client.trainer_id),
                    ExerciseCompletion.id.is_(None)
                )
            ).count()
            
            # If missed 2 or more exercises, notify trainer
            if missed_exercises >= 2:
                notification_service.create_notification(
                    db=db,
                    notification_data={
                        "title": "Missed Exercises Alert ⚠️",
                        "message": f"Client {client.full_name} missed {missed_exercises} exercises this week. Consider reaching out to provide support.",
                        "type": "warning",
                        "recipient_id": client.trainer_id
                    },
                    sender_id=None
                )

    @staticmethod
    def check_missed_meals_weekly(db: Session):
        """Check for missed meals at the end of the week (Sunday 12 PM)"""
        now = datetime.now()
        
        # Only run on Sunday at 12 PM
        if now.weekday() != 6 or now.hour != 12:  # Sunday = 6
            return
        
        # Get the start of the week (Monday)
        week_start = now - timedelta(days=now.weekday() + 1)
        week_end = week_start + timedelta(days=7)
        
        # Get all clients with their trainers
        clients = db.query(User).filter(User.role == "client").all()
        
        for client in clients:
            if not client.trainer_id:
                continue
            
            # Count missed meals for this client this week
            total_meals = db.query(MealPlan).filter(
                and_(
                    MealPlan.client_id == client.id,
                    MealPlan.date >= week_start.date(),
                    MealPlan.date < week_end.date()
                )
            ).count()
            
            completed_meals = db.query(MealUpload).join(
                MealPlan, MealUpload.meal_entry_id == MealPlan.id
            ).filter(
                and_(
                    MealPlan.client_id == client.id,
                    MealPlan.date >= week_start.date(),
                    MealPlan.date < week_end.date(),
                    MealUpload.marked_ok == True
                )
            ).count()
            
            missed_meals = total_meals - completed_meals
            
            # If missed 4 or more meals, notify trainer
            if missed_meals >= 4:
                notification_service.create_notification(
                    db=db,
                    notification_data={
                        "title": "Missed Meals Alert 🍽️",
                        "message": f"Client {client.full_name} missed {missed_meals} meals this week. They may need nutritional guidance or support.",
                        "type": "warning",
                        "recipient_id": client.trainer_id
                    },
                    sender_id=None
                )

    @staticmethod
    def notify_trainer_on_client_registration(db: Session, client_id: int, trainer_id: int):
        """Notify trainer when a new client is assigned"""
        client = db.query(User).filter(User.id == client_id).first()
        if client:
            notification_service.create_notification(
                db=db,
                notification_data={
                    "title": "New Client Assigned 👤",
                    "message": f"New client {client.full_name} has been assigned to you. Welcome them and start their fitness journey!",
                    "type": "info",
                    "recipient_id": trainer_id
                },
                sender_id=None
            )

    @staticmethod
    def notify_admin_on_critical_error(db: Session, error_type: str, details: str):
        """Notify admins about critical system errors"""
        NotificationTriggers.send_critical_server_notification(
            db=db,
            title=f"Critical System Error: {error_type}",
            message=f"System encountered a critical error: {details}. Immediate attention required.",
            notification_type="error"
        )

    @staticmethod
    def notify_admin_on_system_warning(db: Session, warning_type: str, details: str):
        """Notify admins about system warnings"""
        NotificationTriggers.send_critical_server_notification(
            db=db,
            title=f"System Warning: {warning_type}",
            message=f"System warning detected: {details}. Monitor closely.",
            notification_type="warning"
        )

    @staticmethod
    def notify_admin_on_user_activity(db: Session, activity_type: str, user_id: int, details: str):
        """Notify admins about important user activities"""
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            NotificationTriggers.send_critical_server_notification(
                db=db,
                title=f"User Activity: {activity_type}",
                message=f"User {user.full_name} ({user.role}) performed: {details}",
                notification_type="info"
            )

# Create a scheduler function that can be called periodically
def run_weekly_notification_checks(db: Session):
    """Run all weekly notification checks"""
    try:
        NotificationTriggers.check_missed_exercises_weekly(db)
        NotificationTriggers.check_missed_meals_weekly(db)
    except Exception as e:
        # Log error but don't fail the entire process
        print(f"Error in weekly notification checks: {e}")

# Create a function to check goal achievements for a specific client
def check_client_goals(db: Session, client_id: int):
    """Check goals for a specific client"""
    try:
        NotificationTriggers.check_goal_achievements(db, client_id)
    except Exception as e:
        print(f"Error checking goals for client {client_id}: {e}") 