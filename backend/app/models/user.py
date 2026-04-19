# Import uuid to generate unique identifiers for users
import uuid
# Import datetime to handle record creation timestamps
from datetime import datetime
# Import SQLAlchemy types for defining table columns
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SAEnum, Boolean
# Import relationship to define associations between different database tables
from sqlalchemy.orm import relationship
# Import the Base class which all models must inherit from
from app.database import Base
# Import the enum module to create structured constant sets
import enum


# Define the possible roles for a user in the system
class UserRole(str, enum.Enum):
    RESIDENT = "resident" # Standard resident user
    ADMIN = "admin"       # System administrator for the society


# Define the specific categorization of a resident within a society
class ResidentType(str, enum.Enum):
    OWNER = "owner"                   # The legal owner of the flat
    OWNER_FAMILY = "owner_family"     # Family member of the flat owner
    RENTER = "renter"                 # Primary tenant renting the flat
    RENTER_FAMILY = "renter_family"   # Family member of the tenant


# The main User model representing individuals in the system
class User(Base):
    # Set the name of the database table
    __tablename__ = "users"

    # Primary key using a string-based UUID for globally unique identification
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Full name of the user (max 100 characters)
    name = Column(String(100), nullable=False)
    # Unique email address used for login and notifications
    email = Column(String(150), unique=True, nullable=False, index=True)
    # Optional phone number for contact
    phone = Column(String(15), nullable=True)
    # Hashed version of the user's password for security
    password_hash = Column(String(255), nullable=False)
    # The role of the user, defaults to 'resident'
    role = Column(SAEnum(UserRole), default=UserRole.RESIDENT, nullable=False)

    # Foreign key link to the Society this resident belongs to
    society_id = Column(String, ForeignKey("societies.id"), nullable=True)
    # Foreign key link to the specific Flat the resident occupies
    flat_id = Column(String, ForeignKey("flats.id"), nullable=True)

    # Categorization of the resident
    resident_type = Column(SAEnum(ResidentType), nullable=True)
    # Flag for general approval (often by the flat owner for family/renters)
    is_approved = Column(Boolean, default=False, nullable=False)
    # Flag for official admin approval (required for owners to access functionality)
    is_approved_by_admin = Column(Boolean, default=False, nullable=False)

    # Identification details (usually required for verification)
    aadhar_number = Column(String(20), nullable=True)
    pan_number = Column(String(20), nullable=True)

    # UPI or other payment address for receiving reimbursements
    payment_address = Column(String(100), nullable=True)

    # Flag indicating if the user is a member of the society committee
    is_committee = Column(Boolean, default=False, nullable=False)
    # Specific designation within the committee (e.g., Secretary, Treasurer)
    committee_role = Column(String(100), nullable=True)

    # Token used for sending push notifications via Expo/FCM
    push_token = Column(String(200), nullable=True)

    # Timestamp of when the user account was created
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship to the Flat model
    flat = relationship("Flat", back_populates="residents", foreign_keys=[flat_id])
    # Relationship to complaints filed by this user
    complaints = relationship("Complaint", back_populates="user")
    # Relationship to notifications sent to this user
    notifications = relationship("Notification", back_populates="user")
    # Relationship to reimbursement requests initiated by this user
    reimbursement_requests = relationship(
        "ReimbursementRequest", back_populates="user",
        foreign_keys="[ReimbursementRequest.user_id]",
    )

    # Helper property to check if user is an owner
    @property
    def is_flat_owner(self) -> bool:
        """Backward compatibility property."""
        return self.resident_type == ResidentType.OWNER

    # Complex logic to check if a user should have full access to society features
    @property
    def is_fully_approved(self) -> bool:
        """Check if user is fully approved based on their resident type."""
        # Admins are always considered approved
        if self.role == UserRole.ADMIN:
            return True
        # If no resident type is assigned, they cannot be approved
        if not self.resident_type:
            return False
        # Owners specifically need admin approval
        if self.resident_type == ResidentType.OWNER:
            return self.is_approved_by_admin
        # Other types (family, renters) rely on the 'is_approved' flag (set by owners)
        return self.is_approved

