from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.user import User
from app.schemas.auth import UserRole

async def get_users(db: Session) -> List[User]:
    """Get all users"""
    return db.query(User).all()

async def get_user(db: Session, user_id: int) -> Optional[User]:
    """Get user by ID"""
    return db.query(User).filter(User.id == user_id).first()

async def get_trainer_clients(db: Session, trainer_id: int) -> List[User]:
    """Get all clients for a specific trainer"""
    return db.query(User).filter(
        User.role == UserRole.CLIENT,
        User.trainer_id == trainer_id
    ).all()

async def assign_client_to_trainer(db: Session, client_id: int, trainer_id: int) -> bool:
    """Assign a client to a trainer"""
    client = await get_user(db, client_id)
    trainer = await get_user(db, trainer_id)
    
    if not client or not trainer:
        return False
    
    if trainer.role != UserRole.TRAINER or client.role != UserRole.CLIENT:
        return False
    
    client.trainer_id = trainer_id
    db.commit()
    return True

async def remove_client_from_trainer(db: Session, client_id: int) -> bool:
    """Remove a client from their trainer"""
    client = await get_user(db, client_id)
    if not client or client.role != UserRole.CLIENT:
        return False
    
    client.trainer_id = None
    db.commit()
    return True

async def delete_user(db: Session, user_id: int) -> bool:
    """Delete a user"""
    user = await get_user(db, user_id)
    if not user:
        return False
    
    # If it's a trainer, remove trainer_id from all their clients
    if user.role == UserRole.TRAINER:
        for client in user.clients:
            client.trainer_id = None
    
    db.delete(user)
    db.commit()
    return True

async def update_user(db: Session, user_id: int, update_data: dict) -> User:
    """Update user information"""
    user = await get_user(db, user_id)
    if not user:
        return None
    
    # Update allowed fields
    allowed_fields = {"full_name", "email"}
    for field in allowed_fields:
        if field in update_data:
            setattr(user, field, update_data[field])
    
    db.commit()
    db.refresh(user)
    return user 