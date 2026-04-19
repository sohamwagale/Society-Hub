# Import uuid to generate unique society IDs
import uuid
# Import datetime to handle created_at timestamps
from datetime import datetime
# Import SQLAlchemy types for table columns
from sqlalchemy import Column, String, DateTime
# Import Base class for model inheritance
from app.database import Base


# Model representing an entire Apartment Society
class Society(Base):
    # Set the database table name
    __tablename__ = "societies"

    # Primary key using UUID for global uniqueness
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Official name of the society (unique and indexed for fast lookup)
    name = Column(String(150), nullable=False, unique=True, index=True)
    # Physical address of the society premises
    address = Column(String(255), nullable=True)
    # Timestamp of when the society was registered in the system
    created_at = Column(DateTime, default=datetime.utcnow)


