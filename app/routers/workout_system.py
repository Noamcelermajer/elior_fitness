"""
API endpoints for the new workout system
Trainers can create workout plans with splits (Push/Pull/Legs) and detailed tracking
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List

from app.database import get_db
from app.auth.utils import get_current_user
from app.schemas.auth import UserResponse
from app.schemas.workout_system import (
    WorkoutPlanCreate,
    WorkoutPlanUpdate,
    WorkoutPlanResponse,
    CompleteWorkoutPlanCreate,
    WorkoutDayCreate,
    WorkoutDayUpdate,
    WorkoutDayResponse,
    WorkoutExerciseCreate,
    WorkoutExerciseUpdate,
    WorkoutExerciseResponse,
    WorkoutSessionCreate,
    WorkoutSessionUpdate,
    WorkoutSessionResponse,
    SetCompletionCreate,
    SetCompletionResponse,
    PersonalRecordCreate,
    PersonalRecordResponse,
)
from app.models.workout_system import (
    WorkoutPlanV2 as NewWorkoutPlan,
    WorkoutDay,
    WorkoutExerciseV2 as NewWorkoutExercise,
    WorkoutSessionV2 as NewWorkoutSession,
    SetCompletion,
    ExercisePersonalRecord,
    WorkoutSplitType,
    DayType,
)
from app.models.workout import Exercise

router = APIRouter()

# ============ Workout Plan Endpoints ============

@router.post("/plans", response_model=WorkoutPlanResponse, status_code=status.HTTP_201_CREATED)
def create_workout_plan(
    plan_data: WorkoutPlanCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new workout plan (trainer only)"""
    if current_user.role != "TRAINER" and current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can create workout plans"
        )
    
    # Create workout plan
    workout_plan = NewWorkoutPlan(
        client_id=plan_data.client_id,
        trainer_id=current_user.id,
        name=plan_data.name,
        description=plan_data.description,
        split_type=plan_data.split_type,
        days_per_week=plan_data.days_per_week,
        duration_weeks=plan_data.duration_weeks,
        is_active=plan_data.is_active,
        notes=plan_data.notes,
        start_date=plan_data.start_date,
        end_date=plan_data.end_date
    )
    
    db.add(workout_plan)
    db.commit()
    db.refresh(workout_plan)
    
    return workout_plan

@router.post("/plans/complete", response_model=WorkoutPlanResponse, status_code=status.HTTP_201_CREATED)
def create_complete_workout_plan(
    plan_data: CompleteWorkoutPlanCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a complete workout plan with all days and exercises at once (trainer only)"""
    if current_user.role != "TRAINER" and current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can create workout plans"
        )
    
    # Create workout plan
    workout_plan = NewWorkoutPlan(
        client_id=plan_data.client_id,
        trainer_id=current_user.id,
        name=plan_data.name,
        description=plan_data.description,
        split_type=plan_data.split_type,
        days_per_week=plan_data.days_per_week,
        duration_weeks=plan_data.duration_weeks,
        notes=plan_data.notes
    )
    
    db.add(workout_plan)
    db.flush()  # Get workout_plan.id without committing
    
    # Create workout days
    for day_data in plan_data.workout_days:
        workout_day = WorkoutDay(
            workout_plan_id=workout_plan.id,
            name=day_data.name,
            day_type=day_data.day_type,
            order_index=day_data.order_index,
            notes=day_data.notes
        )
        db.add(workout_day)
        db.flush()
        
        # Create workout exercises
        for exercise_data in day_data.exercises:
            workout_exercise = NewWorkoutExercise(
                workout_day_id=workout_day.id,
                exercise_id=exercise_data.exercise_id,
                order_index=exercise_data.order_index,
                target_sets=exercise_data.target_sets,
                target_reps=exercise_data.target_reps,
                target_weight=exercise_data.target_weight,
                rest_seconds=exercise_data.rest_seconds,
                tempo=exercise_data.tempo,
                notes=exercise_data.notes
            )
            db.add(workout_exercise)
    
    db.commit()
    db.refresh(workout_plan)
    
    return workout_plan

@router.get("/plans", response_model=List[WorkoutPlanResponse])
def get_workout_plans(
    client_id: int = None,
    active_only: bool = True,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get workout plans (trainers see their plans, admins see all, clients see their own)"""
    query = db.query(NewWorkoutPlan).options(
        joinedload(NewWorkoutPlan.workout_days).joinedload(WorkoutDay.workout_exercises)
    )
    
    if current_user.role == "CLIENT":
        query = query.filter(NewWorkoutPlan.client_id == current_user.id)
    elif current_user.role == "TRAINER":
        query = query.filter(NewWorkoutPlan.trainer_id == current_user.id)
    # Admins see all
    
    if client_id:
        query = query.filter(NewWorkoutPlan.client_id == client_id)
    
    if active_only:
        query = query.filter(NewWorkoutPlan.is_active == True)
    
    return query.all()

@router.get("/plans/{plan_id}", response_model=WorkoutPlanResponse)
def get_workout_plan(
    plan_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific workout plan with all details"""
    workout_plan = db.query(NewWorkoutPlan).options(
        joinedload(NewWorkoutPlan.workout_days).joinedload(WorkoutDay.workout_exercises)
    ).filter(NewWorkoutPlan.id == plan_id).first()
    
    if not workout_plan:
        raise HTTPException(status_code=404, detail="Workout plan not found")
    
    # Check permissions
    if current_user.role == "CLIENT" and workout_plan.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this workout plan")
    elif current_user.role == "TRAINER" and workout_plan.trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this workout plan")
    
    return workout_plan

@router.put("/plans/{plan_id}", response_model=WorkoutPlanResponse)
def update_workout_plan(
    plan_id: int,
    plan_data: WorkoutPlanUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a workout plan (trainer only)"""
    if current_user.role != "TRAINER" and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only trainers can update workout plans")
    
    workout_plan = db.query(NewWorkoutPlan).filter(NewWorkoutPlan.id == plan_id).first()
    
    if not workout_plan:
        raise HTTPException(status_code=404, detail="Workout plan not found")
    
    if current_user.role == "TRAINER" and workout_plan.trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this workout plan")
    
    # Update fields
    for field, value in plan_data.dict(exclude_unset=True).items():
        setattr(workout_plan, field, value)
    
    db.commit()
    db.refresh(workout_plan)
    
    return workout_plan

@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout_plan(
    plan_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a workout plan (trainer only)"""
    if current_user.role != "TRAINER" and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only trainers can delete workout plans")
    
    workout_plan = db.query(NewWorkoutPlan).filter(NewWorkoutPlan.id == plan_id).first()
    
    if not workout_plan:
        raise HTTPException(status_code=404, detail="Workout plan not found")
    
    if current_user.role == "TRAINER" and workout_plan.trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this workout plan")
    
    db.delete(workout_plan)
    db.commit()
    
    return None

# ============ Workout Day Endpoints ============

@router.post("/plans/{plan_id}/days", response_model=WorkoutDayResponse, status_code=status.HTTP_201_CREATED)
def add_workout_day(
    plan_id: int,
    day_data: WorkoutDayCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a workout day to a plan (trainer only)"""
    if current_user.role != "TRAINER" and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only trainers can add workout days")
    
    # Verify plan exists and trainer owns it
    workout_plan = db.query(NewWorkoutPlan).filter(NewWorkoutPlan.id == plan_id).first()
    if not workout_plan:
        raise HTTPException(status_code=404, detail="Workout plan not found")
    
    if current_user.role == "TRAINER" and workout_plan.trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    workout_day = WorkoutDay(
        workout_plan_id=plan_id,
        name=day_data.name,
        day_type=day_data.day_type,
        order_index=day_data.order_index,
        notes=day_data.notes,
        estimated_duration=day_data.estimated_duration
    )
    
    db.add(workout_day)
    db.commit()
    db.refresh(workout_day)
    
    return workout_day

@router.put("/days/{day_id}", response_model=WorkoutDayResponse)
def update_workout_day(
    day_id: int,
    day_data: WorkoutDayUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a workout day (trainer only)"""
    if current_user.role != "TRAINER" and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only trainers can update workout days")
    
    workout_day = db.query(WorkoutDay).filter(WorkoutDay.id == day_id).first()
    
    if not workout_day:
        raise HTTPException(status_code=404, detail="Workout day not found")
    
    for field, value in day_data.dict(exclude_unset=True).items():
        setattr(workout_day, field, value)
    
    db.commit()
    db.refresh(workout_day)
    
    return workout_day

# ============ Workout Exercise Endpoints ============

@router.post("/days/{day_id}/exercises", response_model=WorkoutExerciseResponse, status_code=status.HTTP_201_CREATED)
def add_workout_exercise(
    day_id: int,
    exercise_data: WorkoutExerciseCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add an exercise to a workout day (trainer only)"""
    if current_user.role != "TRAINER" and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only trainers can add exercises")
    
    # Verify exercise exists
    exercise = db.query(Exercise).filter(Exercise.id == exercise_data.exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    
    workout_exercise = NewWorkoutExercise(
        workout_day_id=day_id,
        exercise_id=exercise_data.exercise_id,
        order_index=exercise_data.order_index,
        target_sets=exercise_data.target_sets,
        target_reps=exercise_data.target_reps,
        target_weight=exercise_data.target_weight,
        rest_seconds=exercise_data.rest_seconds,
        tempo=exercise_data.tempo,
        notes=exercise_data.notes,
        video_url=exercise_data.video_url
    )
    
    db.add(workout_exercise)
    db.commit()
    db.refresh(workout_exercise)
    
    return workout_exercise

@router.put("/exercises/{exercise_id}", response_model=WorkoutExerciseResponse)
def update_workout_exercise(
    exercise_id: int,
    exercise_data: WorkoutExerciseUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a workout exercise (trainer only)"""
    if current_user.role != "TRAINER" and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only trainers can update exercises")
    
    workout_exercise = db.query(NewWorkoutExercise).filter(NewWorkoutExercise.id == exercise_id).first()
    
    if not workout_exercise:
        raise HTTPException(status_code=404, detail="Workout exercise not found")
    
    for field, value in exercise_data.dict(exclude_unset=True).items():
        setattr(workout_exercise, field, value)
    
    db.commit()
    db.refresh(workout_exercise)
    
    return workout_exercise

@router.delete("/exercises/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout_exercise(
    exercise_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a workout exercise (trainer only)"""
    if current_user.role != "TRAINER" and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only trainers can delete exercises")
    
    workout_exercise = db.query(NewWorkoutExercise).filter(NewWorkoutExercise.id == exercise_id).first()
    
    if not workout_exercise:
        raise HTTPException(status_code=404, detail="Workout exercise not found")
    
    db.delete(workout_exercise)
    db.commit()
    
    return None

# ============ Workout Session Endpoints (for client tracking) ============

@router.post("/sessions", response_model=WorkoutSessionResponse, status_code=status.HTTP_201_CREATED)
def start_workout_session(
    session_data: WorkoutSessionCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a new workout session (client only)"""
    if current_user.role != "CLIENT":
        raise HTTPException(status_code=403, detail="Only clients can start workout sessions")
    
    session = NewWorkoutSession(
        client_id=current_user.id,
        workout_day_id=session_data.workout_day_id,
        started_at=session_data.started_at
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return session

@router.put("/sessions/{session_id}", response_model=WorkoutSessionResponse)
def update_workout_session(
    session_id: int,
    session_data: WorkoutSessionUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a workout session (client only)"""
    session = db.query(NewWorkoutSession).filter(NewWorkoutSession.id == session_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Workout session not found")
    
    if current_user.role == "CLIENT" and session.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    for field, value in session_data.dict(exclude_unset=True).items():
        setattr(session, field, value)
    
    db.commit()
    db.refresh(session)
    
    return session

@router.get("/sessions", response_model=List[WorkoutSessionResponse])
def get_workout_sessions(
    client_id: int = None,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get workout sessions (trainers see their clients, clients see their own)"""
    query = db.query(NewWorkoutSession)
    
    if current_user.role == "CLIENT":
        query = query.filter(NewWorkoutSession.client_id == current_user.id)
    elif current_user.role == "TRAINER" and client_id:
        query = query.filter(NewWorkoutSession.client_id == client_id)
    # Admins see all
    
    return query.all()

# ============ Set Completion Endpoints (for client tracking) ============

@router.post("/sessions/{session_id}/sets", response_model=SetCompletionResponse, status_code=status.HTTP_201_CREATED)
def record_set_completion(
    session_id: int,
    set_data: SetCompletionCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record a completed set (client only)"""
    if current_user.role != "CLIENT":
        raise HTTPException(status_code=403, detail="Only clients can record set completions")
    
    set_completion = SetCompletion(
        workout_session_id=session_id,
        workout_exercise_id=set_data.workout_exercise_id,
        client_id=current_user.id,
        set_number=set_data.set_number,
        reps_completed=set_data.reps_completed,
        weight_used=set_data.weight_used,
        rest_taken=set_data.rest_taken,
        rpe=set_data.rpe,
        form_rating=set_data.form_rating,
        notes=set_data.notes
    )
    
    db.add(set_completion)
    db.commit()
    db.refresh(set_completion)
    
    return set_completion

# ============ Personal Record Endpoints ============

@router.post("/set-completions", response_model=SetCompletionResponse, status_code=status.HTTP_201_CREATED)
def create_set_completion_direct(
    set_data: SetCompletionCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a set completion directly (simplified endpoint for clients)"""
    # Create or get today's workout session
    from datetime import datetime
    today = datetime.now().date()
    
    # Get the workout exercise to find the workout day
    workout_exercise = db.query(NewWorkoutExercise).filter(
        NewWorkoutExercise.id == set_data.workout_exercise_id
    ).first()
    
    if not workout_exercise:
        raise HTTPException(status_code=404, detail="Workout exercise not found")
    
    # Find or create workout session for today
    workout_session = db.query(NewWorkoutSession).filter(
        NewWorkoutSession.client_id == current_user.id,
        NewWorkoutSession.workout_day_id == workout_exercise.workout_day_id,
        func.date(NewWorkoutSession.started_at) == today
    ).first()
    
    if not workout_session:
        workout_session = NewWorkoutSession(
            client_id=current_user.id,
            workout_day_id=workout_exercise.workout_day_id,
            started_at=datetime.now(),
            is_completed=False
        )
        db.add(workout_session)
        db.commit()
        db.refresh(workout_session)
    
    # Create set completion
    set_completion = SetCompletion(
        workout_session_id=workout_session.id,
        workout_exercise_id=set_data.workout_exercise_id,
        client_id=current_user.id,
        set_number=set_data.set_number,
        reps_completed=set_data.reps_completed,
        weight_used=set_data.weight_used,
        rest_taken=set_data.rest_taken,
        rpe=set_data.rpe,
        form_rating=set_data.form_rating,
        notes=set_data.notes,
        completed_at=set_data.completed_at or datetime.now()
    )
    
    db.add(set_completion)
    db.commit()
    db.refresh(set_completion)
    
    return set_completion

@router.get("/set-completions", response_model=List[SetCompletionResponse])
def get_set_completions(
    client_id: int = None,
    workout_exercise_id: int = None,
    date: str = None,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get set completions"""
    from datetime import datetime
    
    query = db.query(SetCompletion)
    
    if current_user.role == "CLIENT":
        query = query.filter(SetCompletion.client_id == current_user.id)
    elif client_id:
        query = query.filter(SetCompletion.client_id == client_id)
    
    if workout_exercise_id:
        query = query.filter(SetCompletion.workout_exercise_id == workout_exercise_id)
    
    if date:
        target_date = datetime.fromisoformat(date.replace('Z', '+00:00')).date()
        query = query.filter(func.date(SetCompletion.completed_at) == target_date)
    
    return query.all()

@router.post("/prs", response_model=PersonalRecordResponse, status_code=status.HTTP_201_CREATED)
def record_personal_record(
    pr_data: PersonalRecordCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record a personal record (client or trainer on behalf of client)"""
    pr = ExercisePersonalRecord(
        client_id=current_user.id if current_user.role == "CLIENT" else pr_data.client_id,
        exercise_id=pr_data.exercise_id,
        pr_type=pr_data.pr_type,
        weight=pr_data.weight,
        reps=pr_data.reps,
        date_achieved=pr_data.date_achieved,
        set_completion_id=pr_data.set_completion_id,
        notes=pr_data.notes
    )
    
    db.add(pr)
    db.commit()
    db.refresh(pr)
    
    return pr

@router.get("/prs", response_model=List[PersonalRecordResponse])
def get_personal_records(
    client_id: int = None,
    exercise_id: int = None,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get personal records"""
    query = db.query(ExercisePersonalRecord)
    
    if current_user.role == "CLIENT":
        query = query.filter(ExercisePersonalRecord.client_id == current_user.id)
    elif client_id:
        query = query.filter(ExercisePersonalRecord.client_id == client_id)
    
    if exercise_id:
        query = query.filter(ExercisePersonalRecord.exercise_id == exercise_id)
    
    return query.all()

