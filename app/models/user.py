from sqlalchemy import Boolean, Column, Integer, String, Enum, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum
from app.schemas.auth import UserRole

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(String)  # 'TRAINER' or 'CLIENT'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Trainer-Client relationship
    trainer_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    clients = relationship("User", backref="trainer", remote_side=[id])

    # Relationships with other tables will be added here when models are implemented
    # workouts = relationship("Workout", back_populates="user")
    # nutrition_plans = relationship("NutritionPlan", back_populates="user")
    # progress_records = relationship("ProgressRecord", back_populates="user")

class TrainerProfile(Base):
    __tablename__ = "trainer_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, unique=True, nullable=False)
    specialization = Column(String)
    bio = Column(String)
    years_of_experience = Column(Integer)
    certification = Column(String)

class ClientProfile(Base):
    __tablename__ = "client_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, unique=True, nullable=False)
    trainer_id = Column(Integer, nullable=False)
    height = Column(Integer)  # in cm
    target_weight = Column(Integer)  # in grams
    fitness_goals = Column(String)
    medical_conditions = Column(String)
    dietary_restrictions = Column(String) 