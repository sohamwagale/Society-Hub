import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.database import Base


class AnnouncementPriority(str, enum.Enum):
    NORMAL = "normal"
    IMPORTANT = "important"
    URGENT = "urgent"


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    priority = Column(SAEnum(AnnouncementPriority), default=AnnouncementPriority.NORMAL, nullable=False)
    pinned = Column(Boolean, default=False)
    attachment_url = Column(String(500), nullable=True)
    attachment_type = Column(String(20), nullable=True)  # "pdf" | "image"
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    creator = relationship("User", foreign_keys=[created_by])
