# Import uuid for generating unique identifier for each society document
import uuid
# Import datetime to track when documents are uploaded
from datetime import datetime
# Import SQLAlchemy types for defining database columns
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Boolean
# Import relationship to link documents to users who uploaded or approved them
from sqlalchemy.orm import relationship
# Import the Base class which all models must inherit from
from app.database import Base


# Model representing an official document uploaded for a society (e.g., rules, bye-laws)
class SocietyDocument(Base):
    # Set the name of the database table
    __tablename__ = "society_documents"

    # Primary key using a string-based UUID
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Foreign key link to the Society this document belongs to
    society_id = Column(String, ForeignKey("societies.id"), nullable=True, index=True)
    # The title or name of the document
    title = Column(String(200), nullable=False)
    # Optional detailed description of the document's content
    description = Column(Text, nullable=True)
    # URL pointing to the stored file in Supabase Storage
    file_url = Column(String(500), nullable=False)
    # The type/extension of the file (e.g., "pdf" or "image")
    file_type = Column(String(20), nullable=False, default="pdf")
    # Flag to track if the document has been approved by a committee member/admin
    is_approved = Column(Boolean, default=False, nullable=False)
    # Foreign key link to the user who uploaded the document
    uploaded_by = Column(String, ForeignKey("users.id"), nullable=False)
    # Foreign key link to the admin/committee member who approved the document
    approved_by = Column(String, ForeignKey("users.id"), nullable=True)
    # Timestamp of when the document record was created
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship to access the uploader's user details
    uploader = relationship("User", foreign_keys=[uploaded_by])
    # Relationship to access the approver's user details
    approver = relationship("User", foreign_keys=[approved_by])

