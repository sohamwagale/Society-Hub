import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class SocietyExpense(Base):
    __tablename__ = "society_expenses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    amount = Column(Float, nullable=False)
    expense_date = Column(DateTime, nullable=False)
    document_url = Column(String(500), nullable=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship to the admin user who created it
    creator = relationship("User")
