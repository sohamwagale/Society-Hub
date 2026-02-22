from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


class NotificationOut(BaseModel):
    id: str
    user_id: str
    title: str
    body: str
    notification_type: str
    reference_id: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

    @field_validator('notification_type', mode='before')
    @classmethod
    def enum_to_str(cls, v):
        if hasattr(v, 'value'):
            return v.value
        return v
