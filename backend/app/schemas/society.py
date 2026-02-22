from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ---------- Society Core ----------
class SocietyBase(BaseModel):
  name: str
  address: Optional[str] = None


class SocietyCreate(SocietyBase):
  pass


class SocietyOut(SocietyBase):
  id: str
  created_at: datetime

  class Config:
    from_attributes = True


# ---------- Society Info (key-value, per society or global) ----------
class SocietyInfoOut(BaseModel):
    key: str
    value: str

    class Config:
        from_attributes = True


class SocietyInfoUpdate(BaseModel):
    key: str
    value: str


# ---------- Emergency Contacts ----------
class EmergencyContactCreate(BaseModel):
    name: str
    phone: str
    role: str


class EmergencyContactOut(BaseModel):
    id: str
    name: str
    phone: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True
