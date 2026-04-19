# Import datetime for handling timestamp and date fields
from datetime import datetime
# Import Optional for type hinting nullable fields
from typing import Optional
# Import Pydantic's BaseModel for data validation and schema definition
from pydantic import BaseModel


# Base schema for society-level expense data containing common fields
class SocietyExpenseBase(BaseModel):
    # The title or name of the expense
    title: str
    # Optional detailed description of the expenditure
    description: Optional[str] = None
    # Total amount of money spent
    amount: float
    # The date when the expense actually occurred
    expense_date: datetime


# Schema for creating a new society expense entry (inherits from SocietyExpenseBase)
class SocietyExpenseCreate(SocietyExpenseBase):
    pass


# Schema for returning society expense information via the API
class SocietyExpenseOut(SocietyExpenseBase):
    # Unique ID of the expense record
    id: str
    # Optional URL to a digital copy of the bill or receipt
    document_url: Optional[str] = None
    # ID of the user who recorded the expense
    created_by: str
    # Timestamp of when the record was created
    created_at: datetime

    # Configuration to allow SQLAlchemy object mapping
    class Config:
        from_attributes = True

