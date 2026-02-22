from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import date, datetime


class ReimbursementCreate(BaseModel):
    title: str
    description: str
    amount: float
    expense_date: date
    category: str = "other"


class ReimbursementUpdate(BaseModel):
    status: Optional[str] = None
    approved_amount: Optional[float] = None
    admin_notes: Optional[str] = None


class ReimbursementOut(BaseModel):
    id: str
    user_id: str
    title: str
    description: str
    amount: float
    approved_amount: Optional[float] = None
    expense_date: date
    category: str
    receipt_path: Optional[str] = None
    payment_proof_path: Optional[str] = None
    status: str
    admin_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
    payment_address: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @field_validator('status', 'category', mode='before')
    @classmethod
    def enum_to_str(cls, v):
        if hasattr(v, 'value'):
            return v.value
        return v
class ReimbursementPaymentCreate(BaseModel):
    request_id: str
    amount: float
    payment_method: str
    transaction_ref: Optional[str] = None
    payment_date: date


class ReimbursementPaymentOut(BaseModel):
    id: str
    request_id: str
    amount: float
    payment_method: str
    transaction_ref: Optional[str] = None
    payment_date: date
    paid_by: str
    created_at: datetime

    class Config:
        from_attributes = True
