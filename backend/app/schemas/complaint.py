# Import Pydantic's BaseModel for data validation and field_validator for custom logic
from pydantic import BaseModel, field_validator
# Import Optional and List for type hinting nullable fields and collections
from typing import Optional, List
# Import datetime for handling timestamp fields
from datetime import datetime


# Schema for creating a new resident complaint
class ComplaintCreate(BaseModel):
    # The category of the complaint, defaults to 'other'
    category: str = "other"
    # Short subject line or title of the complaint
    title: str
    # Detailed description of the issue
    description: str


# Schema for updating an existing complaint's status or notes (Admin only)
class ComplaintUpdate(BaseModel):
    # Optional updated status string (e.g., 'resolved', 'in_progress')
    status: Optional[str] = None
    # Optional notes added by the administrator
    admin_notes: Optional[str] = None


# Schema for returning complaint information via the API
class ComplaintOut(BaseModel):
    # Unique ID of the complaint record
    id: str
    # ID of the user who filed the complaint
    user_id: str
    # The string representation of the complaint category
    category: str
    # Title of the complaint
    title: str
    # Full description of the problem
    description: str
    # Current status of the complaint
    status: str
    # Optional list of image URLs/paths associated with the complaint
    images: Optional[List[str]] = None
    # Optional internal notes from the administrator
    admin_notes: Optional[str] = None
    # Timestamp of when the complaint was created
    created_at: datetime
    # Timestamp of when the complaint was last updated
    updated_at: datetime

    # Enable SQLAlchemy to Pydantic conversion
    class Config:
        from_attributes = True

    # Validator to ensure enum values for 'status' and 'category' are converted to strings
    @field_validator('status', 'category', mode='before')
    @classmethod
    def enum_to_str(cls, v):
        # If the value is an enum, return its string value
        if hasattr(v, 'value'):
            return v.value
        return v


