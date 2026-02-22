from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class SocietyExpenseBase(BaseModel):
    title: str
    description: Optional[str] = None
    amount: float
    expense_date: datetime


class SocietyExpenseCreate(SocietyExpenseBase):
    pass


class SocietyExpenseOut(SocietyExpenseBase):
    id: str
    document_url: Optional[str] = None
    created_by: str
    created_at: datetime

    class Config:
        from_attributes = True
