from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
import os

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
        # Store just the filename, not the full path, for easier retrieval
        # The full path is: /app/uploads/progress_photos/filename.jpg
        # We'll store just: filename.jpg
        photo_path = file_result.get("filename") or file_result["original_path"]
    
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
    
    # Normalize photo_path to just filename
    photo_path = progress_entry.photo_path
    if photo_path and ('/' in photo_path or '\\' in photo_path):
        photo_path = os.path.basename(photo_path)
    
    return {
        "id": progress_entry.id,
        "date": progress_entry.date.isoformat(),
        "weight": progress_entry.weight,
        "photo_path": photo_path,  # Normalized to just filename
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
    
    # Normalize photo_path to just filename for all entries
    normalized_entries = []
    for entry in entries:
        photo_path = entry.photo_path
        # If photo_path contains a path separator, extract just the filename
        if photo_path and ('/' in photo_path or '\\' in photo_path):
            photo_path = os.path.basename(photo_path)
        
        normalized_entries.append({
            "id": entry.id,
            "date": entry.date.isoformat(),
            "weight": entry.weight,
            "photo_path": photo_path,  # Normalized to just filename
            "notes": entry.notes,
            "created_at": entry.created_at.isoformat()
        })
    
    return normalized_entries

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
    
    # Normalize photo_path to just filename for all entries
    # This handles both old entries (with full paths) and new entries (just filename)
    normalized_entries = []
    for entry in entries:
        photo_path = entry.photo_path
        # If photo_path contains a path separator, extract just the filename
        if photo_path and ('/' in photo_path or '\\' in photo_path):
            photo_path = os.path.basename(photo_path)
        
        normalized_entries.append({
            "id": entry.id,
            "client_id": entry.client_id,
            "date": entry.date.isoformat(),
            "weight": entry.weight,
            "photo_path": photo_path,  # Normalized to just filename
            "notes": entry.notes,
            "created_at": entry.created_at.isoformat()
        })
    
    return normalized_entries

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
    
    # Normalize photo_path to just filename
    photo_path = entry.photo_path
    if photo_path and ('/' in photo_path or '\\' in photo_path):
        photo_path = os.path.basename(photo_path)
    
    return {
        "id": entry.id,
        "client_id": entry.client_id,
        "date": entry.date.isoformat(),
        "weight": entry.weight,
        "photo_path": photo_path,  # Normalized to just filename
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
    """Delete a weight entry (trainers can delete their clients' entries)"""
    from app.models.user import User
    
    entry = db.query(ProgressEntry).filter(ProgressEntry.id == entry_id).first()
    
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Weight entry not found"
        )
    
    # Check permissions
    if current_user.role == UserRole.TRAINER:
        # Check if the client belongs to this trainer
        client = db.query(User).filter(User.id == entry.client_id).first()
        if not client or client.trainer_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only delete your clients' progress entries")
    elif current_user.id != entry.client_id:
        raise HTTPException(status_code=403, detail="You can only delete your own progress entries")
    
    # Delete associated photo if exists
    if entry.photo_path:
        try:
            # Extract just the filename
            filename = os.path.basename(entry.photo_path) if '/' in entry.photo_path or '\\' in entry.photo_path else entry.photo_path
            # Use the files router endpoint to delete the file
            from app.routers.files import delete_media_file
            # We'll delete it directly using os.remove since we have the path
            persistent_base = os.getenv("PERSISTENT_PATH", "/app/persistent")
            upload_dir = os.getenv("UPLOAD_DIR", os.path.join(persistent_base, "uploads"))
            photo_path = os.path.join(upload_dir, "progress_photos", filename)
            
            # Try multiple possible locations
            possible_paths = [
                photo_path,
                os.path.join(persistent_base, "uploads", "progress_photos", filename),
                f"uploads/progress_photos/{filename}",
                f"/app/uploads/progress_photos/{filename}",
            ]
            
            for path in possible_paths:
                if os.path.exists(path):
                    os.remove(path)
                    break
        except Exception as e:
            # Log error but don't fail the deletion
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to delete photo for entry {entry_id}: {e}")
    
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
    # Normalize photo_path to just filename
    photo_path = entry.photo_path
    if photo_path and ('/' in photo_path or '\\' in photo_path):
        photo_path = os.path.basename(photo_path)
    
    return {
        "id": entry.id,
        "client_id": entry.client_id,
        "date": entry.date.isoformat(),
        "weight": entry.weight,
        "photo_path": photo_path,  # Normalized to just filename
        "notes": entry.notes,
        "created_at": entry.created_at.isoformat()
    } 