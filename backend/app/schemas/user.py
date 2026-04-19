# Import Pydantic's BaseModel for data validation and field_validator for custom logic
from pydantic import BaseModel, field_validator
# Import Optional for type hinting nullable fields
from typing import Optional
# Import datetime for handling timestamp fields
from datetime import datetime


# ---------- Authentication Schemas ----------
# Schema for handling user login requests
class LoginRequest(BaseModel):
    # The email address of the user attempting to log in
    email: str
    # The plain-text password provided by the user
    password: str


# Schema for handling new user registration requests
class RegisterRequest(BaseModel):
    # Full name of the user
    name: str
    # Email address to be used for the account
    email: str
    # Optional phone number
    phone: Optional[str] = None
    # Plain-text password to be hashed before storage
    password: str


# Schema for the response containing the authentication token
class TokenResponse(BaseModel):
    # The actual JWT access token string
    access_token: str
    # The type of token, defaults to 'bearer'
    token_type: str = "bearer"


# Schema for updating existing user profile information
class UserUpdate(BaseModel):
    # Optional updated name
    name: Optional[str] = None
    # Optional updated phone number
    phone: Optional[str] = None
    # Optional updated UPI or payment address
    payment_address: Optional[str] = None


# ---------- User Output Schemas ----------
# Detailed schema for returning user information via the API
class UserOut(BaseModel):
    # Unique identifier for the user
    id: str
    # Full name of the user
    name: str
    # Email address of the user
    email: str
    # Optional contact phone number
    phone: Optional[str] = None
    # The role string assigned to the user (e.g., 'admin', 'resident')
    role: str
    # Optional ID of the flat the user is associated with
    flat_id: Optional[str] = None
    # Optional ID of the society the user belongs to
    society_id: Optional[str] = None
    # Optional categorization of the resident (e.g., 'owner', 'renter')
    resident_type: Optional[str] = None
    # General approval status flag
    is_approved: bool
    # Official admin approval status flag
    is_approved_by_admin: bool
    # Computed flag indicating if the user has full access, defaults to False
    is_fully_approved: bool = False
    # Optional ID number for Aadhar
    aadhar_number: Optional[str] = None
    # Optional ID number for PAN
    pan_number: Optional[str] = None
    # Optional UPI or payment address
    payment_address: Optional[str] = None
    # Timestamp of when the user account was created
    created_at: datetime

    # Pydantic configuration to allow creating schemas from SQLAlchemy models
    class Config:
        from_attributes = True

    # Validator to convert enum 'role' value to a plain string for JSON serialization
    @field_validator('role', mode='before')
    @classmethod
    def enum_to_str(cls, v):
        # If the value is an enum, return its string value
        if hasattr(v, 'value'):
            return v.value
        return v

    # Validator to convert enum 'resident_type' value to a plain string
    @field_validator('resident_type', mode='before')
    @classmethod
    def resident_type_to_str(cls, v):
        # If the value is an enum, return its string value
        if hasattr(v, 'value'):
            return v.value
        return v


# ---------- Pending User Schemas ----------
# Schema for returning basic info of users awaiting approval
class PendingUserOut(BaseModel):
    # ID of the pending user
    id: str
    # Full name of the pending user
    name: str
    # Contact email
    email: str
    # Optional contact phone
    phone: Optional[str] = None
    # Categorization of their residency
    resident_type: Optional[str] = None
    # Optional flat number identifier
    flat_number: Optional[str] = None
    # Block identifier for the flat
    block: Optional[str] = None
    # Floor level of the flat
    floor: Optional[str] = None
    # Timestamp of registration request
    created_at: datetime

    # Validator to ensure resident_type is returned as a string
    @field_validator('resident_type', mode='before')
    @classmethod
    def resident_type_to_str(cls, v):
        # If the value is an enum, return its string value
        if hasattr(v, 'value'):
            return v.value
        return v


# ---------- Flat Schemas ----------
# Schema for returning flat information
class FlatOut(BaseModel):
    # Unique ID of the flat
    id: str
    # Specific number assigned to the flat
    flat_number: str
    # Block or wing of the building
    block: str
    # Floor level of the building
    floor: str

    # Enable from_attributes for SQLAlchemy model integration
    class Config:
        from_attributes = True


# Schema for creating a new flat entry
class FlatCreate(BaseModel):
    # Required number for the flat
    flat_number: str
    # Optional block, defaults to 'A'
    block: str = "A"
    # Optional floor, defaults to '1'
    floor: str = "1"

