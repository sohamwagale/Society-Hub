from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CommentCreate(BaseModel):
    message: str


class CommentOut(BaseModel):
    id: str
    complaint_id: str
    user_id: str
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    message: str
    created_at: datetime

    class Config:
        from_attributes = True
