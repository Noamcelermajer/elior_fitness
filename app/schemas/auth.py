from pydantic import BaseModel, EmailStr, constr
from typing import Optional
from enum import Enum

class UserRole(str, Enum):
    TRAINER = "trainer"
    CLIENT = "client"

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole

class UserCreate(UserBase):
    password: constr(min_length=8)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: int
    role: UserRole

class UserResponse(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True 