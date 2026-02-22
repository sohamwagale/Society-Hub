import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class ComplaintComment(Base):
    __tablename__ = "complaint_comments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    complaint_id = Column(String, ForeignKey("complaints.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
    complaint = relationship("Complaint", foreign_keys=[complaint_id])
