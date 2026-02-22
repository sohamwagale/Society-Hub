import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SAEnum, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class ComplaintStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


class ComplaintCategory(str, enum.Enum):
    PLUMBING = "plumbing"
    ELECTRICAL = "electrical"
    CLEANING = "cleaning"
    SECURITY = "security"
    NOISE = "noise"
    PARKING = "parking"
    OTHER = "other"


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    category = Column(SAEnum(ComplaintCategory), nullable=False, default=ComplaintCategory.OTHER)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(SAEnum(ComplaintStatus), default=ComplaintStatus.OPEN, nullable=False)
    images = Column(JSON, nullable=True, default=list)  # list of file paths
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="complaints")
