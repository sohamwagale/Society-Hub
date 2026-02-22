from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import date, datetime


class FlatAmountOverride(BaseModel):
    flat_id: str
    amount: float


# ---------- Bill ----------
class BillCreate(BaseModel):
    title: str
    description: Optional[str] = None
    bill_type: str = "maintenance"  # maintenance | extra
    amount: float
    due_date: date
    # Overrides and exclusions (amount=0 for exclusions)
    flat_overrides: Optional[List[FlatAmountOverride]] = None


class BillOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    bill_type: str
    amount: float
    due_date: date
    created_by: str
    created_at: datetime
    is_active: bool
    payment_status: Optional[str] = None  # computed per-user

    class Config:
        from_attributes = True

    @field_validator('bill_type', mode='before')
    @classmethod
    def enum_to_str(cls, v):
        if hasattr(v, 'value'):
            return v.value
        return v



class BillUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    bill_type: Optional[str] = None
    amount: Optional[float] = None
    due_date: Optional[date] = None
    is_active: Optional[bool] = None


class BillPaymentCreate(BaseModel):
    bill_id: str
    amount: float
    payment_method: Optional[str] = None
    transaction_ref: Optional[str] = None


class BillPaymentOut(BaseModel):
    id: str
    bill_id: str
    user_id: str
    amount: float
    payment_method: Optional[str] = None
    transaction_ref: Optional[str] = None
    receipt_path: Optional[str] = None
    paid_at: datetime

    class Config:
        from_attributes = True
