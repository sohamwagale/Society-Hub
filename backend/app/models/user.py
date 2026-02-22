import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SAEnum, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    RESIDENT = "resident"
    ADMIN = "admin"


class ResidentType(str, enum.Enum):
    OWNER = "owner"
    OWNER_FAMILY = "owner_family"
    RENTER = "renter"
    RENTER_FAMILY = "renter_family"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    phone = Column(String(15), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.RESIDENT, nullable=False)

    # Society & flat linkage
    society_id = Column(String, ForeignKey("societies.id"), nullable=True)
    flat_id = Column(String, ForeignKey("flats.id"), nullable=True)

    # Resident type & approvals
    resident_type = Column(SAEnum(ResidentType), nullable=True)
    is_approved = Column(Boolean, default=False, nullable=False)
    is_approved_by_admin = Column(Boolean, default=False, nullable=False)

    # KYC details (required for owners, optional for others)
    aadhar_number = Column(String(20), nullable=True)
    pan_number = Column(String(20), nullable=True)

    # Payment details (UPI ID / Mobile)
    payment_address = Column(String(100), nullable=True)

    # Committee
    is_committee = Column(Boolean, default=False, nullable=False)
    committee_role = Column(String(100), nullable=True)

    # Push notifications
    push_token = Column(String(200), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    flat = relationship("Flat", back_populates="residents", foreign_keys=[flat_id])
    complaints = relationship("Complaint", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    reimbursement_requests = relationship(
        "ReimbursementRequest", back_populates="user",
        foreign_keys="[ReimbursementRequest.user_id]",
    )

    @property
    def is_flat_owner(self) -> bool:
        """Backward compatibility property."""
        return self.resident_type == ResidentType.OWNER

    @property
    def is_fully_approved(self) -> bool:
        """Check if user is fully approved based on their resident type."""
        if self.role == UserRole.ADMIN:
            return True
        if not self.resident_type:
            return False
        if self.resident_type == ResidentType.OWNER:
            return self.is_approved_by_admin
        # owner_family, renter, renter_family all need is_approved
        return self.is_approved
