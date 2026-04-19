# Import uuid for unique record identifiers
import uuid
# Import datetime for timestamping record creation and updates
from datetime import datetime
# Import SQLAlchemy types for detailed database schema definition
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SAEnum, Text, JSON
# Import relationship to link complaints to users and other entities
from sqlalchemy.orm import relationship
# Import the Base class which all models must inherit from
from app.database import Base
# Import enum for structured constant sets (complaint status and category)
import enum


# Define the possible statuses for a resident's complaint
class ComplaintStatus(str, enum.Enum):
    OPEN = "open"               # Complaint received but not yet addressed
    IN_PROGRESS = "in_progress" # Being worked on by society management
    RESOLVED = "resolved"       # Issue has been fixed or addressed


# Define the categorization for complaints to help with delegation
class ComplaintCategory(str, enum.Enum):
    PLUMBING = "plumbing"       # Leaks, taps, etc.
    ELECTRICAL = "electrical"   # Power issues, wiring, etc.
    CLEANING = "cleaning"       # Garbage, sweeping, etc.
    SECURITY = "security"       # Guards, gates, entry issues
    NOISE = "noise"             # Loud music, construction, etc.
    PARKING = "parking"         # Vehicle placement, unauthorized entry
    OTHER = "other"             # Miscellaneous issues


# Main model representing a grievance filed by a resident
class Complaint(Base):
    # Set the name of the database table
    __tablename__ = "complaints"

    # Primary key using a string-based UUID
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Foreign key link to the Society this complaint belongs to (indexed for performance)
    society_id = Column(String, ForeignKey("societies.id"), nullable=True, index=True)
    # Foreign key link to the user who filed the complaint
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    # The category of the complaint, defaults to 'other'
    category = Column(SAEnum(ComplaintCategory), nullable=False, default=ComplaintCategory.OTHER)
    # Short subject line or title of the complaint
    title = Column(String(200), nullable=False)
    # Detailed description of the problem
    description = Column(Text, nullable=False)
    # The current status of the complaint, defaults to 'open'
    status = Column(SAEnum(ComplaintStatus), default=ComplaintStatus.OPEN, nullable=False)
    # JSON field to store a list of image file paths/URLs related to the complaint
    images = Column(JSON, nullable=True, default=list)
    # Internal notes added by society administrators or committee members
    admin_notes = Column(Text, nullable=True)
    # Timestamp of when the complaint was first created
    created_at = Column(DateTime, default=datetime.utcnow)
    # Timestamp of when the complaint was last modified (updated automatically)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to access the user details of the complainant
    user = relationship("User", back_populates="complaints")

