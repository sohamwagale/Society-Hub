from pydantic import BaseModel
from typing import Optional, List


class JoinSocietyRequest(BaseModel):
    society_id: str
    flat_id: str
    resident_type: str
    aadhar_number: Optional[str] = None
    pan_number: Optional[str] = None


class CreateSocietyFlat(BaseModel):
    flat_number: str
    block: str = "A"
    floor: str = "1"


class CreateSocietyRequest(BaseModel):
    society_name: str
    society_address: Optional[str] = None
    flats: List[CreateSocietyFlat] = []


class ApprovalRequest(BaseModel):
    user_id: str
    approve: bool = True


class RevokeRenterRequest(BaseModel):
    user_id: str
