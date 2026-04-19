# Import uuid for generating unique identifiers for requests and payments
import uuid
# Import datetime for timestamping record creation and updates
from datetime import datetime
# Import SQLAlchemy types for detailed database schema definition
from sqlalchemy import Column, String, Float, DateTime, Date, ForeignKey, Enum as SAEnum, Text
# Import relationship to link reimbursement records to users and payments
from sqlalchemy.orm import relationship
# Import the Base class which all models must inherit from
from app.database import Base
# Import enum for structured constant sets (status and category)
import enum


# Define the various stages of a reimbursement request
class ReimbursementStatus(str, enum.Enum):
    SUBMITTED = "submitted"         # Request just filed by resident
    UNDER_REVIEW = "under_review"   # Being checked by society admin
    APPROVED = "approved"           # Amount confirmed for payout
    REJECTED = "rejected"           # Request denied
    PAID = "paid"                   # Funds have been disbursed


# Define the categorization for reimbursement claims
class ReimbursementCategory(str, enum.Enum):
    PLUMBING = "plumbing"
    ELECTRICAL = "electrical"
    CLEANING = "cleaning"
    MAINTENANCE = "maintenance"
    EVENT = "event"                 # Society events or festivals
    OTHER = "other"


# Main model representing a resident's claim for a specific expense
class ReimbursementRequest(Base):
    # Set the name of the database table
    __tablename__ = "reimbursement_requests"

    # Primary key using a string-based UUID
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Foreign key link to the Society this request belongs to (indexed for performance)
    society_id = Column(String, ForeignKey("societies.id"), nullable=True, index=True)
    # Foreign key link to the user who is claiming the reimbursement
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    # Short summary of the expense
    title = Column(String(200), nullable=False)
    # Detailed justification or explanation of the spend
    description = Column(Text, nullable=False)
    # The original amount spent as claimed by the user
    amount = Column(Float, nullable=False)
    # The final amount approved by the admin (may differ from claimed)
    approved_amount = Column(Float, nullable=True)
    # The date when the actual expense was incurred
    expense_date = Column(Date, nullable=False)
    # The category of the spend, defaults to 'other'
    category = Column(SAEnum(ReimbursementCategory), nullable=False, default=ReimbursementCategory.OTHER)
    # URL or path to the stored digital receipt image/PDF
    receipt_path = Column(String(500), nullable=True)
    # URL or path to the stored proof of payment from the admin to the user
    payment_proof_path = Column(String(500), nullable=True)
    # The current status of the request, defaults to 'submitted'
    status = Column(SAEnum(ReimbursementStatus), default=ReimbursementStatus.SUBMITTED, nullable=False)
    # Notes added by the reviewing administrator
    admin_notes = Column(Text, nullable=True)
    # Foreign key link to the admin user who reviewed/actioned the request
    reviewed_by = Column(String, ForeignKey("users.id"), nullable=True)
    # Record creation timestamp
    created_at = Column(DateTime, default=datetime.utcnow)
    # Last update timestamp (updated automatically)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to access the complainant's user details
    user = relationship("User", foreign_keys=[user_id], back_populates="reimbursement_requests")
    # Relationship to access the administrator's user details who performed the review
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    # One-to-one relationship with the final payment record
    payment = relationship("ReimbursementPayment", back_populates="request", uselist=False)


# Model representing the final payout transaction for an approved reimbursement
class ReimbursementPayment(Base):
    # Set the name of the database table
    __tablename__ = "reimbursement_payments"

    # Primary key using a string-based UUID
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Foreign key linking the payment back to the approved Request
    request_id = Column(String, ForeignKey("reimbursement_requests.id"), nullable=False)
    # The final amount disbursed
    amount = Column(Float, nullable=False)
    # The method used for payout (e.g., "Cash", "NEFT", "UPI")
    payment_method = Column(String(50), nullable=False)
    # External reference number for the bank/wallet transaction
    transaction_ref = Column(String(100), nullable=True)
    # The date when the payment was actually sent
    payment_date = Column(Date, nullable=False)
    # Foreign key link to the admin user who initiated the payment
    paid_by = Column(String, ForeignKey("users.id"), nullable=False)
    # Record creation timestamp
    created_at = Column(DateTime, default=datetime.utcnow)

    # Bidirectional relationship back to the Request model
    request = relationship("ReimbursementRequest", back_populates="payment")
    # Relationship to access the details of the admin user who made the payment
    payer = relationship("User", foreign_keys=[paid_by])

