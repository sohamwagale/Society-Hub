# Import Pydantic's BaseModel for data validation and schema definition
from pydantic import BaseModel
# Import Optional for type hinting nullable fields
from typing import Optional
# Import datetime for handling timestamp fields
from datetime import datetime


# Schema for creating a new society-wide announcement
class AnnouncementCreate(BaseModel):
    # The title or subject line of the announcement
    title: str
    # The main text content of the announcement
    body: str
    # The priority level, defaults to 'normal' (possible: normal, important, urgent)
    priority: str = "normal"
    # Flag to indicate if the announcement should be pinned to the top of the feed
    pinned: bool = False


# Schema for updating an existing announcement's details
class AnnouncementUpdate(BaseModel):
    # Optional updated title
    title: Optional[str] = None
    # Optional updated body content
    body: Optional[str] = None
    # Optional updated priority level
    priority: Optional[str] = None


# Schema for returning announcement information via the API
class AnnouncementOut(BaseModel):
    # Unique ID of the announcement record
    id: str
    # Title of the announcement
    title: str
    # Body content of the announcement
    body: str
    # Priority level string
    priority: str
    # Pin status flag
    pinned: bool
    # Optional URL to an attached file (hosted on storage)
    attachment_url: Optional[str] = None
    # Optional file type description (e.g., 'image' or 'pdf')
    attachment_type: Optional[str] = None
    # ID of the user who created the announcement
    created_by: str
    # Optional display name of the announcement creator
    creator_name: Optional[str] = None
    # Timestamp of when the announcement was created
    created_at: datetime

    # Configuration to allow SQLAlchemy object mapping
    class Config:
        from_attributes = True

