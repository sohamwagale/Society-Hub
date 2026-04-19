# Import Pydantic's BaseModel for data validation and schema definition
from pydantic import BaseModel
# Import Optional for type hinting nullable fields
from typing import Optional
# Import datetime for handling timestamp fields
from datetime import datetime


# Schema for creating a new comment on a complaint
class CommentCreate(BaseModel):
    # The actual text content of the comment
    message: str


# Schema for returning comment information via the API
class CommentOut(BaseModel):
    # Unique ID of the comment record
    id: str
    # ID of the complaint the comment is associated with
    complaint_id: str
    # ID of the user who posted the comment
    user_id: str
    # Optional display name of the user who posted the comment
    user_name: Optional[str] = None
    # Optional role of the user (e.g., 'admin', 'resident')
    user_role: Optional[str] = None
    # The message content of the comment
    message: str
    # Timestamp of when the comment was created
    created_at: datetime

    # Configuration to allow SQLAlchemy object mapping
    class Config:
        from_attributes = True

