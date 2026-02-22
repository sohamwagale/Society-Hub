import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class SocietyDocument(Base):
    __tablename__ = "society_documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    file_url = Column(String(500), nullable=False)
    file_type = Column(String(20), nullable=False, default="pdf")  # pdf, image
    is_approved = Column(Boolean, default=False, nullable=False)
    uploaded_by = Column(String, ForeignKey("users.id"), nullable=False)
    approved_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    uploader = relationship("User", foreign_keys=[uploaded_by])
    approver = relationship("User", foreign_keys=[approved_by])
