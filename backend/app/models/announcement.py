# Import uuid for generating unique record IDs
import uuid
# Import enum for structured constant sets (priority levels)
import enum
# Import datetime for timestamping record creation
from datetime import datetime
# Import SQLAlchemy types for detailed database schema definition
from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey, Enum as SAEnum
# Import relationship to link announcements to societies and users
from sqlalchemy.orm import relationship
# Import the Base class which all models must inherit from
from app.database import Base


# Define the priority levels for an announcement
class AnnouncementPriority(str, enum.Enum):
    NORMAL = "normal"       # Standard announcement
    IMPORTANT = "important"  # Higher visibility announcement
    URGENT = "urgent"       # Immediate attention announcement


# Model representing a society-wide announcement
class Announcement(Base):
    # Specify the database table name
    __tablename__ = "announcements"

    # Primary key using a string-based UUID
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Foreign key link to the Society this announcement belongs to (indexed for performance)
    society_id = Column(String, ForeignKey("societies.id"), nullable=True, index=True)
    # The subject line or title of the announcement
    title = Column(String(200), nullable=False)
    # The main text content of the announcement
    body = Column(Text, nullable=False)
    # The priority level of the announcement, defaults to 'normal'
    priority = Column(SAEnum(AnnouncementPriority), default=AnnouncementPriority.NORMAL, nullable=False)
    # Flag to indicate if the announcement should be pinned to the top of the feed
    pinned = Column(Boolean, default=False)
    # Optional URL to an attached file (hosted on Supabase Storage)
    attachment_url = Column(String(500), nullable=True)
    # The type of the attached file (e.g., "pdf" or "image")
    attachment_type = Column(String(20), nullable=True)
    # Foreign key link to the user who created the announcement
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    # Record creation timestamp
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship to the User model to access creator details
    creator = relationship("User", foreign_keys=[created_by])

