from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date

from app.database import get_db
from app.auth.utils import get_current_user
from app.schemas.auth import UserResponse
from app.models.progress import ProgressEntry
from app.services.file_service import FileService

router = APIRouter(tags=["progress"])

@router.post("/weight", status_code=status.HTTP_201_CREATED)
async def add_weight_entry(
    weight: float = Form(..., description="Weight in kg"),
    notes: Optional[str] = Form(None, description="Optional notes"),
    photo: Optional[UploadFile] = File(None, description="Optional progress photo"),
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new weight entry with optional photo"""
    
    # Save photo if provided
    photo_path = None
    if photo:
        file_service = FileService()
        file_result = await file_service.save_file(photo, "progress_photo", current_user.id)
        photo_path = file_result["original_path"]
    
    # Create progress entry
    progress_entry = ProgressEntry(
        client_id=current_user.id,
        date=date.today(),
        weight=weight,
        photo_path=photo_path,
        notes=notes
    )
    
    db.add(progress_entry)
    db.commit()
    db.refresh(progress_entry)
    
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