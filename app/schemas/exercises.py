from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime

class ExerciseBase(BaseModel):
    name: str
    description: Optional[str] = None
    video_url: Optional[HttpUrl] = None
    muscle_groups: Optional[str] = None
    equipment_needed: Optional[str] = None
    difficulty_level: Optional[str] = None

class ExerciseCreate(ExerciseBase):
    pass

class ExerciseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    video_url: Optional[HttpUrl] = None
    muscle_groups: Optional[str] = None
    equipment_needed: Optional[str] = None
    difficulty_level: Optional[str] = None

class ExerciseResponse(ExerciseBase):
    id: int
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True

class ExerciseListResponse(BaseModel):
    exercises: List[ExerciseResponse]
    total: int
    page: int
    size: int

class ExerciseFilter(BaseModel):
    muscle_groups: Optional[str] = None
    equipment_needed: Optional[str] = None
    difficulty_level: Optional[str] = None
    search: Optional[str] = None
    page: int = 1
    size: int = 20 