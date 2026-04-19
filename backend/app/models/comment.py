# Import uuid for unique identifier generation for each comment
import uuid
# Import datetime to track when comments are posted
from datetime import datetime
# Import SQLAlchemy types for detailed database schema definition
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
# Import relationship to link comments to users and complaints
from sqlalchemy.orm import relationship
# Import the Base class which all models must inherit from
from app.database import Base


# Model representing a comment or discussion entry on a specific complaint
class ComplaintComment(Base):
    # Set the name of the database table
    __tablename__ = "complaint_comments"

    # Primary key using a string-based UUID
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Foreign key linking the comment to the specific Complaint it belongs to
    complaint_id = Column(String, ForeignKey("complaints.id"), nullable=False)
    # Foreign key linking the comment to the user who posted it
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    # The actual text content of the comment
    message = Column(Text, nullable=False)
    # Timestamp of when the comment was created
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship to access the user details of the comment author
    user = relationship("User", foreign_keys=[user_id])
    # Relationship to link back to the parent Complaint record
    complaint = relationship("Complaint", foreign_keys=[complaint_id])

