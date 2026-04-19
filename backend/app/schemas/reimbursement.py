# Import Pydantic's BaseModel for data validation and field_validator for custom logic
from pydantic import BaseModel, field_validator
# Import Optional for type hinting nullable fields
from typing import Optional
# Import date and datetime for handling temporal fields
from datetime import date, datetime


# Schema for creating a new reimbursement claim
class ReimbursementCreate(BaseModel):
    # Short summary or title of the expense
    title: str
    # Detailed justification or description of the spend
    description: str
    # Total amount being claimed for reimbursement
    amount: float
    # The actual date when the expenditure occurred
    expense_date: date
    # Classification category of the expense, defaults to 'other'
    category: str = "other"


# Schema for updating an existing reimbursement request status or approved amount (Admin only)
class ReimbursementUpdate(BaseModel):
    # Optional updated status string (e.g., 'approved', 'rejected')
    status: Optional[str] = None
    # Optional finalized amount approved for payout
    approved_amount: Optional[float] = None
    # Optional administrative notes regarding the review
    admin_notes: Optional[str] = None


# Schema for returning detailed reimbursement request information via the API
class ReimbursementOut(BaseModel):
    # Unique ID of the reimbursement request record
    id: str
    # ID of the user who filed the request
    user_id: str
    # Title of the request
    title: str
    # Description of the request
    description: str
    # Amount claimed by the user
    amount: float
    # Amount approved for payout by the administrator
    approved_amount: Optional[float] = None
    # Date of the expense
    expense_date: date
    # Category of the expense as a string
    category: str
    # Optional URL/path to the digital receipt stored in cloud storage
    receipt_path: Optional[str] = None
    # Optional URL/path to the proof of payment provided by the admin
    payment_proof_path: Optional[str] = None
    # Current status of the request
    status: str
    # Optional notes from the administrator
    admin_notes: Optional[str] = None
    # Optional ID of the administrator who performed the review
    reviewed_by: Optional[str] = None
    # Optional payment address (UPI/Bank) of the claimant
    payment_address: Optional[str] = None
    # Timestamp of when the request was filed
    created_at: datetime
    # Timestamp of the last status or detail update
    updated_at: datetime

    # Enable SQLAlchemy to Pydantic mapping
    class Config:
        from_attributes = True

    # Validator to ensure enum values for 'status' and 'category' are converted to strings
    @field_validator('status', 'category', mode='before')
    @classmethod
    def enum_to_str(cls, v):
        # If the value is an enum, return its string value
        if hasattr(v, 'value'):
            return v.value
        return v


# Schema for recording a new payment transaction for an approved reimbursement
class ReimbursementPaymentCreate(BaseModel):
    # ID of the approved reimbursement request
    request_id: str
    # Total amount being disbursed
    amount: float
    # Method used for payout (e.g., 'Bank Transfer', 'Cash')
    payment_method: str
    # Optional external transaction reference ID
    transaction_ref: Optional[str] = None
    # Date when the payment was processed
    payment_date: date


# Schema for returning payout transaction information via the API
class ReimbursementPaymentOut(BaseModel):
    # Unique ID of the payment record
    id: str
    # ID of the associated reimbursement request
    request_id: str
    # Final amount disbursed
    amount: float
    # String describing the payment method used
    payment_method: str
    # Optional external reference ID
    transaction_ref: Optional[str] = None
    # Date of the payment
    payment_date: date
    # ID of the admin user who processed the payment
    paid_by: str
    # Timestamp of when the record was created
    created_at: datetime

    # Enable SQLAlchemy to Pydantic mapping
    class Config:
        from_attributes = True

