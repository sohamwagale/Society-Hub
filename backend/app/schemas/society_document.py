# Import Pydantic's BaseModel for data validation and schema definition
from pydantic import BaseModel
# Import datetime for handling timestamp fields
from datetime import datetime
# Import Optional for type hinting nullable fields
from typing import Optional


# Schema for returning information about a society document via the API
class SocietyDocumentOut(BaseModel):
    # Unique identifier for the document record
    id: str
    # Title or name of the document
    title: str
    # Optional detailed description of the document
    description: Optional[str] = None
    # URL pointing to the file stored in cloud storage
    file_url: str
    # File format type (e.g., 'pdf', 'image')
    file_type: str
    # Flag indicating if the document has been officially approved
    is_approved: bool
    # ID of the user who uploaded the document
    uploaded_by: str
    # Optional display name of the uploader
    uploader_name: Optional[str] = None
    # Optional ID of the administrator who approved the document
    approved_by: Optional[str] = None
    # Timestamp of when the document was uploaded
    created_at: datetime

    # Modern Pydantic configuration to allow SQLAlchemy object mapping
    model_config = {"from_attributes": True}

