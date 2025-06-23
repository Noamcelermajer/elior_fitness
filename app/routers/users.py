from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas.auth import UserResponse, UserRole, UserUpdate
from app.services import user_service
from app.auth.utils import get_current_user

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Get current user information.
    """
    return current_user

@router.get("/", response_model=List[UserResponse])
async def get_users(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all users. Only trainers can access this endpoint.
    """
    if current_user.role != UserRole.TRAINER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can view all users"
        )
    return await user_service.get_users(db)

@router.get("/clients", response_model=List[UserResponse])
async def get_trainer_clients(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all clients for the current trainer.
    """
    if current_user.role != UserRole.TRAINER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can view their clients"
        )
    return await user_service.get_trainer_clients(db, current_user.id)

@router.post("/clients/{client_id}/assign", status_code=status.HTTP_200_OK)
async def assign_client(
    client_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Assign a client to the current trainer.
    """
    if current_user.role != UserRole.TRAINER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can assign clients"
        )
    
    success = await user_service.assign_client_to_trainer(db, current_user.id, client_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not assign client to trainer"
        )
    return {"message": "Client assigned successfully"}

@router.post("/clients/{client_id}/remove", status_code=status.HTTP_200_OK)
async def remove_client(
    client_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove a client from the current trainer.
    """
    if current_user.role != UserRole.TRAINER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can remove clients"
        )
    
    # Verify the client belongs to this trainer
    client = await user_service.get_user_by_id(db, client_id)
    if not client or client.trainer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found or not assigned to you"
        )
    
    success = await user_service.remove_client_from_trainer(db, current_user.id, client_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not remove client from trainer"
        )
    return {"message": "Client removed successfully"}

# Add missing endpoints that tests expect
@router.post("/trainer/{trainer_id}/clients/{client_id}", status_code=status.HTTP_200_OK)
async def assign_client_to_trainer(
    trainer_id: int,
    client_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Assign a client to a specific trainer.
    """
    if current_user.role != UserRole.TRAINER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can assign clients"
        )
    
    # Verify the trainer exists and current user is the trainer
    trainer = await user_service.get_user_by_id(db, trainer_id)
    if not trainer or trainer.id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trainer not found"
        )
    
    success = await user_service.assign_client_to_trainer(db, trainer_id, client_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not assign client to trainer"
        )
    
    # Return the updated client
    client = await user_service.get_user_by_id(db, client_id)
    return client

@router.delete("/trainer/{trainer_id}/clients/{client_id}", status_code=status.HTTP_200_OK)
async def remove_client_from_trainer(
    trainer_id: int,
    client_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove a client from a specific trainer.
    """
    if current_user.role != UserRole.TRAINER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can remove clients"
        )
    
    # Verify the trainer exists and current user is the trainer
    trainer = await user_service.get_user_by_id(db, trainer_id)
    if not trainer or trainer.id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trainer not found"
        )
    
    # Verify the client belongs to this trainer
    client = await user_service.get_user_by_id(db, client_id)
    if not client or client.trainer_id != trainer_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found or not assigned to you"
        )
    
    success = await user_service.remove_client_from_trainer(db, trainer_id, client_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not remove client from trainer"
        )
    
    # Return the updated client
    updated_client = await user_service.get_user_by_id(db, client_id)
    return updated_client

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user by ID. Trainers can view any user, clients can only view themselves.
    """
    if current_user.role != UserRole.TRAINER and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    user = await user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user by ID. Users can only update themselves.
    """
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own profile"
        )
    
    updated_user = await user_service.update_user(db, user_id, user_update)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return updated_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a user. Users can delete themselves, trainers can delete their clients.
    """
    # Check if user has permission to delete
    if current_user.id != user_id and current_user.role != UserRole.TRAINER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this user"
        )
    
    # If trainer is deleting a client, verify the client belongs to them
    if current_user.role == UserRole.TRAINER and current_user.id != user_id:
        client = await user_service.get_user_by_id(db, user_id)
        if not client or client.trainer_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found or not assigned to you"
            )
    
    deleted = await user_service.delete_user(db, user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

@router.put("/me", response_model=UserResponse)
async def update_user_me(
    user_update: UserUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's information.
    """
    updated_user = await user_service.update_user(db, current_user.id, user_update)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return updated_user 