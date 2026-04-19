# Import Pydantic's BaseModel for data validation and schema definition
from pydantic import BaseModel
# Import Optional for type hinting nullable fields
from typing import Optional
# Import datetime for handling timestamp fields
from datetime import datetime


# ---------- Society Core Schemas ----------
# Base schema for society data containing common fields
class SocietyBase(BaseModel):
  # The name of the society
  name: str
  # Optional physical address of the society
  address: Optional[str] = None


# Schema for creating a new society record (inherits from SocietyBase)
class SocietyCreate(SocietyBase):
  pass


# Schema for returning society information via the API
class SocietyOut(SocietyBase):
  # Unique identifier for the society
  id: str
  # Timestamp of when the society was recorded
  created_at: datetime

  # Configuration to allow SQLAlchemy object mapping
  class Config:
    from_attributes = True


# ---------- Society Info Schemas (Key-Value settings) ----------
# Schema for returning a specific piece of society information
class SocietyInfoOut(BaseModel):
    # The key or setting name
    key: str
    # The value associated with that key
    value: str

    # Enable from_attributes for SQLAlchemy integration
    class Config:
        from_attributes = True


# Schema for updating or creating a piece of society information
class SocietyInfoUpdate(BaseModel):
    # The key to identify the setting
    key: str
    # The new value to be stored
    value: str


# ---------- Emergency Contact Schemas ----------
# Schema for creating a new emergency contact entry
class EmergencyContactCreate(BaseModel):
    # Name of the contact person or service provider
    name: str
    # Contact phone number
    phone: str
    # The role or service provided (e.g., 'Guard', 'Plumber')
    role: str


# Schema for returning emergency contact information via the API
class EmergencyContactOut(BaseModel):
    # Unique ID of the contact entry
    id: str
    # Name of the contact
    name: str
    # Phone number of the contact
    phone: str
    # Role of the contact
    role: str
    # Timestamp of when the contact was added
    created_at: datetime

    # Enable from_attributes for SQLAlchemy integration
    class Config:
        from_attributes = True

