from sqlalchemy import Boolean, Column, Integer, String, Enum, DateTime
from sqlalchemy.sql import func
from app.database import Base
import enum

class UserRole(str, enum.Enum):
    TRAINER = "trainer"
    CLIENT = "client"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(Enum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

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