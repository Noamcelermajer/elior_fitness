from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.user import User
from app.schemas.auth import UserRole, UserResponse, UserUpdate

async def get_users(db: Session) -> List[User]:
    """Get all users"""
    return db.query(User).all()

async def get_user(db: Session, user_id: int) -> Optional[User]:
    """Get user by ID"""
    return db.query(User).filter(User.id == user_id).first()

async def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Get user by ID."""
    return db.query(User).filter(User.id == user_id).first()

async def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get user by email."""
    return db.query(User).filter(User.email == email).first()

async def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """Get user by username."""
    return db.query(User).filter(User.username == username).first()

async def get_all_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
    """Get all users with pagination."""
    return db.query(User).offset(skip).limit(limit).all()

async def update_user(db: Session, user_id: int, user_update: UserUpdate) -> Optional[User]:
    """Update user information."""
    db_user = await get_user_by_id(db, user_id)
    if not db_user:
        return None
    
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

async def delete_user(db: Session, user_id: int) -> bool:
    """Delete a user."""
    db_user = await get_user_by_id(db, user_id)
    if not db_user:
        return False
    
    db.delete(db_user)
    db.commit()
    return True

async def get_trainer_clients(db: Session, trainer_id: int) -> List[User]:
    """Get all clients assigned to a trainer."""
    trainer = await get_user_by_id(db, trainer_id)
    if not trainer or trainer.role != UserRole.TRAINER:
        return []
    
    # Query clients that have this trainer_id
    clients = db.query(User).filter(
        User.role == UserRole.CLIENT,
        User.trainer_id == trainer_id
    ).all()
    
    return clients

async def assign_client_to_trainer(db: Session, trainer_id: int, client_id: int) -> bool:
    """Assign a client to a trainer."""
    trainer = await get_user_by_id(db, trainer_id)
    client = await get_user_by_id(db, client_id)
    
    if not trainer or not client:
        return False
    
    if trainer.role != UserRole.TRAINER or client.role != UserRole.CLIENT:
        return False
    
    # Update the client's trainer_id
    client.trainer_id = trainer_id
    db.commit()
    db.refresh(client)
    return True

async def remove_client_from_trainer(db: Session, trainer_id: int, client_id: int) -> bool:
    """Remove a client from a trainer."""
    trainer = await get_user_by_id(db, trainer_id)
    client = await get_user_by_id(db, client_id)
    
    if not trainer or not client:
        return False
    
    if trainer.role != UserRole.TRAINER or client.role != UserRole.CLIENT:
        return False
    
    # Remove the trainer_id from the client
    client.trainer_id = None
    db.commit()
    db.refresh(client)
    return True 