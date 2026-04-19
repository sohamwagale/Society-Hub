# Import uuid for generating unique identifier for emergency contacts
import uuid
# Import datetime to track when information was recorded or updated
from datetime import datetime
# Import SQLAlchemy types for Defining database columns
from sqlalchemy import Column, String, Text, DateTime
# Import the Base class which all models must inherit from
from app.database import Base


# Model serving as a flexible key-value store for various society-wide settings and information
class SocietyInfo(Base):
    # Specify the name of the database table
    __tablename__ = "society_info"

    # Unique key for the information piece (e.g., 'society_rules', 'contact_email')
    key = Column(String(100), primary_key=True)
    # The actual content or value associated with the key
    value = Column(Text, nullable=False)
    # Timestamp of last update (updated automatically on every change)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Model representing helpful emergency contact details for society residents
class EmergencyContact(Base):
    # Specify the name of the database table
    __tablename__ = "emergency_contacts"

    # Primary key using a string-based UUID
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Name of the contact person or service provider
    name = Column(String(100), nullable=False)
    # Contact phone number
    phone = Column(String(20), nullable=False)
    # The service or role of the contact (e.g., 'Plumber', 'Electrician', 'Security')
    role = Column(String(100), nullable=False)
    # Timestamp of when the contact was added to the system
    created_at = Column(DateTime, default=datetime.utcnow)

