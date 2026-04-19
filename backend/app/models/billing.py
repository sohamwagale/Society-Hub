# Import uuid for unique identifier generation
import uuid
# Import datetime for timestamping payments and bill creation
from datetime import datetime
# Import SQLAlchemy types for detailed database schema definition
from sqlalchemy import Column, String, Float, DateTime, Date, ForeignKey, Enum as SAEnum, Text, Boolean
# Import relationship to link bills to users, societies, and payments
from sqlalchemy.orm import relationship
# Import the Base class which all models must inherit from
from app.database import Base
# Import enum for structured constant sets (bill types and statuses)
import enum


# Define the categories of bills supported by the system
class BillType(str, enum.Enum):
    MAINTENANCE = "maintenance" # Recurring society maintenance fees
    EXTRA = "extra"             # One-off or special purpose charges


# Define the possible payment statuses for a bill
class BillStatus(str, enum.Enum):
    PAID = "paid"       # Payment successfully completed
    DUE = "due"         # Payment pending but not yet late
    OVERDUE = "overdue" # Payment pending and past the due date


# Main model representing a bill issued to residents
class Bill(Base):
    # Set the name of the database table
    __tablename__ = "bills"

    # Primary key using a string-based UUID
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Foreign key linking the bill to a specific Society
    society_id = Column(String, ForeignKey("societies.id"), nullable=True, index=True)
    # The title or name of the bill (e.g., "Monthly Maintenance Jan 2024")
    title = Column(String(200), nullable=False)
    # Optional detailed description of what the bill covers
    description = Column(Text, nullable=True)
    # The classification of the bill (Maintenance vs. Extra)
    bill_type = Column(SAEnum(BillType), nullable=False, default=BillType.MAINTENANCE)
    # The total amount charged in this bill
    amount = Column(Float, nullable=False)
    # The deadline date for making the payment
    due_date = Column(Date, nullable=False)
    # Foreign key link to the admin user who created/issued the bill
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    # Timestamp of when the bill record was created
    created_at = Column(DateTime, default=datetime.utcnow)
    # Flag to indicate if the bill is currently active and visible to residents
    is_active = Column(Boolean, default=True)

    # Relationship to access the user details of the bill creator
    creator = relationship("User", foreign_keys=[created_by])
    # Relationship to link to all payment records associated with this bill
    payments = relationship("BillPayment", back_populates="bill")


# Model representing a specific payment transaction made towards a bill
class BillPayment(Base):
    # Set the name of the database table
    __tablename__ = "bill_payments"

    # Primary key using a string-based UUID
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Foreign key linking the payment back to the original Bill
    bill_id = Column(String, ForeignKey("bills.id"), nullable=False)
    # Foreign key linking the payment to the user who made the payment
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    # The specific amount paid in this transaction
    amount = Column(Float, nullable=False)
    # The method of payment (e.g., "UPI", "Razorpay")
    payment_method = Column(String(50), nullable=True)
    # External transaction reference ID (from payment gateway)
    transaction_ref = Column(String(100), nullable=True)
    # URL or path to the stored payment receipt file
    receipt_path = Column(String(500), nullable=True)
    # Timestamp of when the payment was recorded
    paid_at = Column(DateTime, default=datetime.utcnow)

    # Bidirectional relationship back to the Bill model
    bill = relationship("Bill", back_populates="payments")
    # Relationship to access the user details who made the payment
    user = relationship("User")


# Helper model to store flat-specific override amounts for a particular bill
class BillFlatAmount(Base):
    # Set the name of the database table
    __tablename__ = "bill_flat_amounts"

    # Primary key using a string-based UUID
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Foreign key linking to the specific Bill
    bill_id = Column(String, ForeignKey("bills.id"), nullable=False)
    # Foreign key linking to the specific Flat
    flat_id = Column(String, ForeignKey("flats.id"), nullable=False)
    # The specific amount calculated or assigned for this particular flat
    amount = Column(Float, nullable=False)

    # Relationship back to the Bill model
    bill = relationship("Bill")
    # Relationship to access the Flat details
    flat = relationship("Flat")

