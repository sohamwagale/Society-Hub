import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, Date, ForeignKey, Enum as SAEnum, Text, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class BillType(str, enum.Enum):
    MAINTENANCE = "maintenance"
    EXTRA = "extra"


class BillStatus(str, enum.Enum):
    PAID = "paid"
    DUE = "due"
    OVERDUE = "overdue"


class Bill(Base):
    __tablename__ = "bills"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    bill_type = Column(SAEnum(BillType), nullable=False, default=BillType.MAINTENANCE)
    amount = Column(Float, nullable=False)
    due_date = Column(Date, nullable=False)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    creator = relationship("User", foreign_keys=[created_by])
    payments = relationship("BillPayment", back_populates="bill")


class BillPayment(Base):
    __tablename__ = "bill_payments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    bill_id = Column(String, ForeignKey("bills.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_method = Column(String(50), nullable=True)
    transaction_ref = Column(String(100), nullable=True)
    receipt_path = Column(String(500), nullable=True)
    paid_at = Column(DateTime, default=datetime.utcnow)

    bill = relationship("Bill", back_populates="payments")
    user = relationship("User")


class BillFlatAmount(Base):
    __tablename__ = "bill_flat_amounts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    bill_id = Column(String, ForeignKey("bills.id"), nullable=False)
    flat_id = Column(String, ForeignKey("flats.id"), nullable=False)
    amount = Column(Float, nullable=False)

    bill = relationship("Bill")
    flat = relationship("Flat")
