# Import uuid for generating unique identifiers for each flat
import uuid
# Import datetime to track when flat records are created
from datetime import datetime
# Import SQLAlchemy types for defining database columns
from sqlalchemy import Column, String, DateTime, ForeignKey
# Import relationship to link flats to other models like Users
from sqlalchemy.orm import relationship
# Import the Base class which all models must inherit from
from app.database import Base


# Model representing a physical unit (flat) within an apartment society
class Flat(Base):
    # Specify the database table name
    __tablename__ = "flats"

    # Unique identifier for the flat, generated via UUID
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # The display number/identifier of the flat (e.g., '101')
    flat_number = Column(String(10), nullable=False)
    # The block or building wing name (e.g., 'Block A')
    block = Column(String(10), nullable=False, default="A")
    # The floor number on which the flat is located
    floor = Column(String(5), nullable=False, default="1")
    # Record creation timestamp
    created_at = Column(DateTime, default=datetime.utcnow)

    # Foreign key relationship linking the flat to a specific Society
    society_id = Column(String, ForeignKey("societies.id"), nullable=True)
    # Foreign key relationship linking the flat to its primary owner's user account
    owner_user_id = Column(String, ForeignKey("users.id"), nullable=True)

    # One-to-many relationship with users residing in this flat (owners, family, tenants)
    residents = relationship("User", back_populates="flat", foreign_keys="[User.flat_id]")

