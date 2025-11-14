from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ChatMessageBase(BaseModel):
    message: str
    progress_entry_id: Optional[int] = None

class ChatMessageCreate(ChatMessageBase):
    client_id: int

class ChatMessageResponse(ChatMessageBase):
    id: int
    trainer_id: int
    client_id: int
    sender_id: int
    created_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    client_id: int
    client_name: str
    last_message: Optional[ChatMessageResponse] = None
    unread_count: int = 0

