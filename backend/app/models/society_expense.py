# Import uuid for generating unique identifier for each society-level expense
import uuid
# Import datetime to track when expenses incurred and recorded
from datetime import datetime
# Import SQLAlchemy types for detailed database schema definition
from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey
# Import relationship to link expenses to the admins who recorded them
from sqlalchemy.orm import relationship
# Import the Base class which all models must inherit from
from app.database import Base


# Model representing an expense incurred at the society level (e.g., repairs, events)
class SocietyExpense(Base):
    # Set the name of the database table
    __tablename__ = "society_expenses"

    # Primary key using a string-based UUID
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Foreign key link to the Society that incurred this expense (indexed for performance)
    society_id = Column(String, ForeignKey("societies.id"), nullable=True, index=True)
    # The title or name of the expense (e.g., "Elevator Maintenance")
    title = Column(String(200), nullable=False)
    # Optional detailed description of what the expense was for
    description = Column(Text, nullable=True)
    # The total amount of money spent
    amount = Column(Float, nullable=False)
    # The specific date when the expense occurred
    expense_date = Column(DateTime, nullable=False)
    # Optional URL to a digital copy of the bill or receipt
    document_url = Column(String(500), nullable=True)
    # Foreign key link to the admin/committee member who recorded this expense
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    # Record creation timestamp
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship to access the user details of the record creator
    creator = relationship("User")

