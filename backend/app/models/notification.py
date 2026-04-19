# Import uuid for generating unique notification identifiers
import uuid
# Import datetime for timestamping when notifications are sent
from datetime import datetime
# Import SQLAlchemy types for detailed database schema definition
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Enum as SAEnum
# Import relationship to link notifications to specific users
from sqlalchemy.orm import relationship
# Import the Base class which all models must inherit from
from app.database import Base
# Import enum for structured constant sets (notification categories)
import enum


# Define the various types of notifications supported by the system
class NotificationType(str, enum.Enum):
    BILL = "bill"                               # New bill issued
    PAYMENT_REMINDER = "payment_reminder"       # Reminder for due bills
    COMPLAINT = "complaint"                     # Update on a complaint
    POLL = "poll"                               # New community poll
    REIMBURSEMENT = "reimbursement"             # Update on expense claim
    GENERAL = "general"                         # Generic announcement or alert


# Model representing a notification sent to a specific user
class Notification(Base):
    # Set the name of the database table
    __tablename__ = "notifications"

    # Primary key using a string-based UUID
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Foreign key link to the user who is the recipient of this notification
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    # The short attention-grabbing title of the notification
    title = Column(String(200), nullable=False)
    # The main message content of the notification
    body = Column(String(500), nullable=False)
    # The classification of the notification, defaults to 'general'
    notification_type = Column(SAEnum(NotificationType), default=NotificationType.GENERAL, nullable=False)
    # Optional ID of the related record (e.g., the specific bill or complaint ID)
    reference_id = Column(String, nullable=True)
    # Flag to track if the user has seen/read the notification
    is_read = Column(Boolean, default=False)
    # Timestamp of when the notification record was generated
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship to access the recipient user's details
    user = relationship("User", back_populates="notifications")

