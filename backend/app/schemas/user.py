from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


# ---------- Auth ----------
class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    payment_address: Optional[str] = None


# ---------- User ----------
class UserOut(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    role: str
    flat_id: Optional[str] = None
    society_id: Optional[str] = None
    resident_type: Optional[str] = None
    is_approved: bool
    is_approved_by_admin: bool
    is_fully_approved: bool = False
    aadhar_number: Optional[str] = None
    pan_number: Optional[str] = None
    payment_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

    @field_validator('role', mode='before')
    @classmethod
    def enum_to_str(cls, v):
        if hasattr(v, 'value'):
            return v.value
        return v

    @field_validator('resident_type', mode='before')
    @classmethod
    def resident_type_to_str(cls, v):
        if hasattr(v, 'value'):
            return v.value
        return v


# ---------- Pending User (for approval screens) ----------
class PendingUserOut(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    resident_type: Optional[str] = None
    flat_number: Optional[str] = None
    block: Optional[str] = None
    floor: Optional[str] = None
    created_at: datetime

    @field_validator('resident_type', mode='before')
    @classmethod
    def resident_type_to_str(cls, v):
        if hasattr(v, 'value'):
            return v.value
        return v


# ---------- Flat ----------
class FlatOut(BaseModel):
    id: str
    flat_number: str
    block: str
    floor: str

    class Config:
        from_attributes = True


class FlatCreate(BaseModel):
    flat_number: str
    block: str = "A"
    floor: str = "1"
