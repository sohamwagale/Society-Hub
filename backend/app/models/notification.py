import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class NotificationType(str, enum.Enum):
    BILL = "bill"
    PAYMENT_REMINDER = "payment_reminder"
    COMPLAINT = "complaint"
    POLL = "poll"
    REIMBURSEMENT = "reimbursement"
    GENERAL = "general"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    body = Column(String(500), nullable=False)
    notification_type = Column(SAEnum(NotificationType), default=NotificationType.GENERAL, nullable=False)
    reference_id = Column(String, nullable=True)  # ID of related entity
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")
