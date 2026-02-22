from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SocietyDocumentOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    file_url: str
    file_type: str
    is_approved: bool
    uploaded_by: str
    uploader_name: Optional[str] = None
    approved_by: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
