from sqlalchemy import Boolean, Column, Integer, String, ForeignKey, DateTime, Float, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class ProgressEntry(Base):
    __tablename__ = "progress_entries"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    weight = Column(Float, nullable=False)  # in kg
    photo_path = Column(String)  # optional progress photo
    notes = Column(String)  # optional notes
    created_at = Column(DateTime, default=func.now())

    # Relationships
    client = relationship("User", back_populates="progress_entries") 