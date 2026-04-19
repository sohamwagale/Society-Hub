# Import Pydantic's BaseModel for data validation and field_validator for custom logic
from pydantic import BaseModel, field_validator
# Import Optional for type hinting nullable fields
from typing import Optional
# Import datetime for handling timestamp fields
from datetime import datetime


# Schema for returning notification information via the API
class NotificationOut(BaseModel):
    # Unique ID of the notification record
    id: str
    # ID of the user who received the notification
    user_id: str
    # Short subject line or title of the notification
    title: str
    # The main message content of the notification
    body: str
    # The classification string of the notification (e.g., 'bill', 'poll')
    notification_type: str
    # Optional ID of the related entity (e.g., specific bill_id or complaint_id)
    reference_id: Optional[str] = None
    # Flag indicating if the notification has been marked as read
    is_read: bool
    # Timestamp of when the notification was generated
    created_at: datetime

    # Enable SQLAlchemy to Pydantic conversion
    class Config:
        from_attributes = True

    # Validator to ensure enum values for 'notification_type' are converted to strings
    @field_validator('notification_type', mode='before')
    @classmethod
    def enum_to_str(cls, v):
        # If the value is an enum, return its string value
        if hasattr(v, 'value'):
            return v.value
        return v

