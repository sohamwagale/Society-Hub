from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime


class ComplaintCreate(BaseModel):
    category: str = "other"
    title: str
    description: str


class ComplaintUpdate(BaseModel):
    status: Optional[str] = None
    admin_notes: Optional[str] = None


class ComplaintOut(BaseModel):
    id: str
    user_id: str
    category: str
    title: str
    description: str
    status: str
    images: Optional[List[str]] = None
    admin_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @field_validator('status', 'category', mode='before')
    @classmethod
    def enum_to_str(cls, v):
        if hasattr(v, 'value'):
            return v.value
        return v

