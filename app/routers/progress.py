from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date

from app.database import get_db
from app.auth.utils import get_current_user
from app.schemas.auth import UserResponse, UserRole
from app.models.progress import ProgressEntry
from app.services.file_service import FileService
from app.services.notification_triggers import check_client_goals

router = APIRouter(tags=["progress"])

@router.post("/weight", status_code=status.HTTP_201_CREATED)
async def add_weight_entry(
    weight: float = Form(..., description="Weight in kg"),
    notes: Optional[str] = Form(None, description="Optional notes"),
    photo: Optional[UploadFile] = File(None, description="Optional progress photo"),
    client_id: Optional[int] = Form(None, description="Client ID (for trainers)"),
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new weight entry with optional photo"""
    from app.models.user import User
    
    # Determine the target client ID
    target_client_id = current_user.id  # Default to current user
    if client_id and current_user.role == UserRole.TRAINER:
        # Verify that the client belongs to this trainer
        client = db.query(User).filter(User.id == client_id).first()
        if not client or client.trainer_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only add entries for your clients")
        target_client_id = client_id
    
    # Save photo if provided
    photo_path = None
    if photo:
        file_service = FileService()
        file_result = await file_service.save_file(photo, "progress_photo", target_client_id)
        photo_path = file_result["original_path"]
    
    # Create progress entry
    progress_entry = ProgressEntry(
        client_id=target_client_id,
        date=date.today(),
        weight=weight,
        photo_path=photo_path,
        notes=notes
    )
    
    db.add(progress_entry)
    db.commit()
    db.refresh(progress_entry)
    
    # Check for goal achievements
    check_client_goals(db, current_user.id)
    
    return {
        "id": progress_entry.id,
        "date": progress_entry.date.isoformat(),
        "weight": progress_entry.weight,
        "photo_path": progress_entry.photo_path,
        "notes": progress_entry.notes,
        "created_at": progress_entry.created_at.isoformat()
    }

@router.get("/weight", response_model=List[dict])
async def get_weight_history(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get weight history for the current user"""
    
    entries = db.query(ProgressEntry).filter(
        ProgressEntry.client_id == current_user.id
    ).order_by(ProgressEntry.date.desc()).all()
    
    return [
        {
            "id": entry.id,
            "date": entry.date.isoformat(),
            "weight": entry.weight,
            "photo_path": entry.photo_path,
            "notes": entry.notes,
            "created_at": entry.created_at.isoformat()
        }
        for entry in entries
    ]

@router.get("/", response_model=List[dict])
async def get_progress_entries(
    client_id: Optional[int] = None,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get progress entries (trainers can get their clients' entries)"""
    from app.models.user import User
    
    # If trainer, they can query their clients' progress
    if current_user.role == UserRole.TRAINER and client_id:
        # Check if the client belongs to this trainer
        client = db.query(User).filter(User.id == client_id).first()
        if not client or client.trainer_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only view your clients' progress")
        query_client_id = client_id
    else:
        # Clients can only see their own progress
        query_client_id = current_user.id
    
    entries = db.query(ProgressEntry).filter(
        ProgressEntry.client_id == query_client_id
    ).order_by(ProgressEntry.date.desc()).all()
    
    return [
        {
            "id": entry.id,
            "client_id": entry.client_id,
            "date": entry.date.isoformat(),
            "weight": entry.weight,
            "photo_path": entry.photo_path,
            "notes": entry.notes,
            "created_at": entry.created_at.isoformat()
        }
        for entry in entries
    ]

@router.get("/{entry_id}", response_model=dict)
async def get_progress_entry(
    entry_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single progress entry by ID (trainers can get their clients' entries)"""
    from app.models.user import User
    
    entry = db.query(ProgressEntry).filter(ProgressEntry.id == entry_id).first()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Progress entry not found")
    
    # Check permissions
    if current_user.role == UserRole.TRAINER:
        # Check if the client belongs to this trainer
        client = db.query(User).filter(User.id == entry.client_id).first()
        if not client or client.trainer_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only view your clients' progress")
    elif current_user.id != entry.client_id:
        raise HTTPException(status_code=403, detail="You can only view your own progress")
    
    return {
        "id": entry.id,
        "client_id": entry.client_id,
        "date": entry.date.isoformat(),
        "weight": entry.weight,
        "photo_path": entry.photo_path,
        "notes": entry.notes,
        "created_at": entry.created_at.isoformat()
    }

@router.get("/weight/current")
async def get_current_weight(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the most recent weight entry"""
    
    latest_entry = db.query(ProgressEntry).filter(
        ProgressEntry.client_id == current_user.id
    ).order_by(ProgressEntry.date.desc()).first()
    
    if not latest_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No weight entries found"
        )
    
    return {
        "weight": latest_entry.weight,
        "date": latest_entry.date.isoformat(),
        "notes": latest_entry.notes
    }

@router.delete("/weight/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_weight_entry(
    entry_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a weight entry"""
    
    entry = db.query(ProgressEntry).filter(
        ProgressEntry.id == entry_id,
        ProgressEntry.client_id == current_user.id
    ).first()
    
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Weight entry not found"
        )
    
    db.delete(entry)
    db.commit()

@router.put("/entries/{entry_id}")
async def update_progress_entry(
    entry_id: int,
    weight: Optional[float] = Form(None),
    notes: Optional[str] = Form(None),
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a progress entry (trainers can update their clients' entries)"""
    from app.models.user import User
    
    # Get the entry
    entry = db.query(ProgressEntry).filter(ProgressEntry.id == entry_id).first()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Progress entry not found")
    
    # Check permissions
    if current_user.role == UserRole.TRAINER:
        # Check if the client belongs to this trainer
        client = db.query(User).filter(User.id == entry.client_id).first()
        if not client or client.trainer_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only update your clients' progress")
    elif current_user.id != entry.client_id:
        raise HTTPException(status_code=403, detail="You can only update your own progress")
    
    # Update fields
    if weight is not None:
        entry.weight = weight
    if notes is not None:
        entry.notes = notes
    
    db.commit()
    db.refresh(entry)
    
    # Return updated entry
    return {
        "id": entry.id,
        "client_id": entry.client_id,
        "date": entry.date.isoformat(),
        "weight": entry.weight,
        "photo_path": entry.photo_path,
        "notes": entry.notes,
        "created_at": entry.created_at.isoformat()
    } 