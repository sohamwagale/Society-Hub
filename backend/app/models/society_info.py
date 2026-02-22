import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime
from app.database import Base


class SocietyInfo(Base):
    """Key-value store for society information (name, address, phone, rules, etc.)"""
    __tablename__ = "society_info"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    role = Column(String(100), nullable=False)  # e.g. Plumber, Electrician, Guard, Doctor
    created_at = Column(DateTime, default=datetime.utcnow)
