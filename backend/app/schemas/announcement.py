from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AnnouncementCreate(BaseModel):
    title: str
    body: str
    priority: str = "normal"  # normal | important | urgent
    pinned: bool = False


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    priority: Optional[str] = None


class AnnouncementOut(BaseModel):
    id: str
    title: str
    body: str
    priority: str
    pinned: bool
    attachment_url: Optional[str] = None
    attachment_type: Optional[str] = None
    created_by: str
    creator_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
