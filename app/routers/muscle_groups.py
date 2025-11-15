"""
API endpoints for managing muscle groups
Trainers can create and manage custom muscle groups
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.database import get_db
from app.auth.utils import get_current_user
from app.schemas.auth import UserResponse, UserRole
from app.models.muscle_group import MuscleGroup

router = APIRouter()

class MuscleGroupCreate(BaseModel):
    name: str

class MuscleGroupResponse(BaseModel):
    id: int
    name: str
    created_by: int
    created_at: str
    
    class Config:
        from_attributes = True

@router.post("/", response_model=MuscleGroupResponse, status_code=status.HTTP_201_CREATED)
def create_muscle_group(
    muscle_group_data: MuscleGroupCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new muscle group (trainer/admin only)"""
    if current_user.role not in [UserRole.TRAINER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can create muscle groups"
        )
    
    # Check if muscle group already exists
    existing = db.query(MuscleGroup).filter(
        MuscleGroup.name.ilike(muscle_group_data.name.strip())
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Muscle group '{muscle_group_data.name}' already exists"
        )
    
    muscle_group = MuscleGroup(
        name=muscle_group_data.name.strip(),
        created_by=current_user.id
    )
    
    db.add(muscle_group)
    db.commit()
    db.refresh(muscle_group)
    
    return muscle_group

@router.get("/", response_model=List[MuscleGroupResponse])
def get_muscle_groups(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all muscle groups"""
    muscle_groups = db.query(MuscleGroup).order_by(MuscleGroup.name).all()
    return muscle_groups

@router.delete("/{muscle_group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_muscle_group(
    muscle_group_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a muscle group (trainer/admin only)"""
    if current_user.role not in [UserRole.TRAINER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can delete muscle groups"
        )
    
    muscle_group = db.query(MuscleGroup).filter(MuscleGroup.id == muscle_group_id).first()
    
    if not muscle_group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Muscle group not found"
        )
    
    # Check if any exercises use this muscle group
    from app.models.workout import Exercise
    exercises_using = db.query(Exercise).filter(
        Exercise.muscle_group_id == muscle_group_id
    ).count()
    
    if exercises_using > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete muscle group: {exercises_using} exercise(s) are using it"
        )
    
    db.delete(muscle_group)
    db.commit()
    
    return None





