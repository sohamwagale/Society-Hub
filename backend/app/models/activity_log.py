"""Activity log model — tracks admin/system actions for audit trail."""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)  # e.g. "bill_created", "complaint_resolved"
    entity_type = Column(String(50), nullable=True)  # e.g. "bill", "complaint"
    entity_id = Column(String, nullable=True)
    details = Column(Text, nullable=True)  # JSON or free-text
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", lazy="joined")
