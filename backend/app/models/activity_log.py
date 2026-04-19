# Activity log model — tracks admin/system actions for audit trail.
# Import uuid for unique identifier generation
import uuid
# Import datetime to track the timing of activities
from datetime import datetime
# Import SQLAlchemy types for defining database columns
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
# Import relationship to link logs to the users who performed them
from sqlalchemy.orm import relationship
# Import the Base class which all models must inherit from
from app.database import Base


# Model representing an entry in the system activity log
class ActivityLog(Base):
    # Specify the name of the database table
    __tablename__ = "activity_logs"

    # Primary key using a string-based UUID
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Foreign key link to the user who performed the action
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    # Short string describing the action performed (e.g. "bill_created", "complaint_resolved")
    action = Column(String(100), nullable=False)
    # The type of record affected by this action (e.g. "bill", "complaint")
    entity_type = Column(String(50), nullable=True)
    # The specific ID of the affected record
    entity_id = Column(String, nullable=True)
    # Detailed information about the action, potentially in JSON format
    details = Column(Text, nullable=True)
    # Timestamp of when the activity took place
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship to the User model, configured to be loaded immediately via 'joined' lazy loading
    user = relationship("User", lazy="joined")

