import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, Date, ForeignKey, Enum as SAEnum, Text
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class ReimbursementStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    PAID = "paid"


class ReimbursementCategory(str, enum.Enum):
    PLUMBING = "plumbing"
    ELECTRICAL = "electrical"
    CLEANING = "cleaning"
    MAINTENANCE = "maintenance"
    EVENT = "event"
    OTHER = "other"


class ReimbursementRequest(Base):
    __tablename__ = "reimbursement_requests"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    amount = Column(Float, nullable=False)
    approved_amount = Column(Float, nullable=True)
    expense_date = Column(Date, nullable=False)
    category = Column(SAEnum(ReimbursementCategory), nullable=False, default=ReimbursementCategory.OTHER)
    receipt_path = Column(String(500), nullable=True)
    payment_proof_path = Column(String(500), nullable=True)
    status = Column(SAEnum(ReimbursementStatus), default=ReimbursementStatus.SUBMITTED, nullable=False)
    admin_notes = Column(Text, nullable=True)
    reviewed_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id], back_populates="reimbursement_requests")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    payment = relationship("ReimbursementPayment", back_populates="request", uselist=False)


class ReimbursementPayment(Base):
    __tablename__ = "reimbursement_payments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    request_id = Column(String, ForeignKey("reimbursement_requests.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_method = Column(String(50), nullable=False)
    transaction_ref = Column(String(100), nullable=True)
    payment_date = Column(Date, nullable=False)
    paid_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    request = relationship("ReimbursementRequest", back_populates="payment")
    payer = relationship("User", foreign_keys=[paid_by])
