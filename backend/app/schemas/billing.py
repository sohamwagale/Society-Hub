# Import Pydantic's BaseModel for data validation and field_validator for custom logic
from pydantic import BaseModel, field_validator
# Import Optional and List for type hinting nullable fields and collections
from typing import Optional, List
# Import date and datetime for handling temporal fields
from datetime import date, datetime


# Schema representing an amount override for a specific flat in a bill
class FlatAmountOverride(BaseModel):
    # ID of the flat applying the override to
    flat_id: str
    # The custom amount for this specific flat
    amount: float


class FlatAmountOverrideOut(BaseModel):
    flat_id: str
    flat_number: Optional[str] = None
    block: Optional[str] = None
    floor: Optional[str] = None
    amount: float

    class Config:
        from_attributes = True



# ---------- Bill Schemas ----------
# Schema for creating a new bill entry
class BillCreate(BaseModel):
    # The title or name of the bill
    title: str
    # Optional detailed description of the charges
    description: Optional[str] = None
    # The classification of the bill, defaults to 'maintenance' (possible: maintenance, extra)
    bill_type: str = "maintenance"
    # The base amount for the bill
    amount: float
    # The deadline date for making the payment
    due_date: date
    # Optional list of flat-specific overrides (allows setting specific amounts or exclusions)
    flat_overrides: Optional[List[FlatAmountOverride]] = None


# Schema for returning bill information via the API
class BillOut(BaseModel):
    # Unique ID of the bill record
    id: str
    # Title of the bill
    title: str
    # Optional description of the bill
    description: Optional[str] = None
    # Category string of the bill
    bill_type: str
    # Total amount of the bill
    amount: float
    # Deadline date for payment
    due_date: date
    # ID of the user who issued the bill
    created_by: str
    # Timestamp of when the bill record was created
    created_at: datetime
    # Visibility flag for the bill
    is_active: bool
    # Computed payment status string specific to the requesting user (e.g., 'paid', 'due')
    payment_status: Optional[str] = None

    # Configuration to allow SQLAlchemy object mapping
    class Config:
        from_attributes = True

    # Validator to convert enum 'bill_type' value to a plain string for JSON serialization
    @field_validator('bill_type', mode='before')
    @classmethod
    def enum_to_str(cls, v):
        # If the value is an enum, return its string value
        if hasattr(v, 'value'):
            return v.value
        return v


# Schema for updating an existing bill's details
class BillUpdate(BaseModel):
    # Optional updated title
    title: Optional[str] = None
    # Optional updated description
    description: Optional[str] = None
    # Optional updated category
    bill_type: Optional[str] = None
    # Optional updated amount
    amount: Optional[float] = None
    # Optional updated deadline date
    due_date: Optional[date] = None
    # Optional visibility toggle
    is_active: Optional[bool] = None
    # Optional list of flat-specific price overrides
    flat_overrides: Optional[List[FlatAmountOverride]] = None


# ---------- Bill Payment Schemas ----------
# Schema for recording a new payment transaction for a bill
class BillPaymentCreate(BaseModel):
    # ID of the bill being paid
    bill_id: str
    # Total amount being paid in this transaction
    amount: float
    # Optional method used for payment (e.g., 'UPI', 'Razorpay')
    payment_method: Optional[str] = None
    # Optional external reference ID from the payment provider
    transaction_ref: Optional[str] = None


# Schema for returning payment record information via the API
class BillPaymentOut(BaseModel):
    # Unique ID of the payment record
    id: str
    # ID of the associated bill
    bill_id: str
    # ID of the user who made the payment
    user_id: str
    # Amount paid in this transaction
    amount: float
    # Optional string describing the payment method
    payment_method: Optional[str] = None
    # Optional external transaction reference ID
    transaction_ref: Optional[str] = None
    # Optional URL or path to the stored receipt file
    receipt_path: Optional[str] = None
    # Timestamp of when the payment was finalized
    paid_at: datetime

    # Enable SQLAlchemy to Pydantic conversion
    class Config:
        from_attributes = True


class RazorpayOrderResponse(BaseModel):
    razorpay_order_id: str
    amount: float          # in rupees (for display)
    amount_paise: int      # in paise (for SDK)
    currency: str
    key_id: str            # public key – safe to send to mobile


class RazorpayVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


