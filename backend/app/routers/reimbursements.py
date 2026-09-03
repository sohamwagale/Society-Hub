# Import standard OS module for file extension handling
import os
# Import uuid for generating unique request and payment IDs
import uuid
# Import datetime for timestamping transactions and expense dates
from datetime import datetime, date
# Import FastAPI components for routing, dependencies, errors, and file uploads
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
# Import SQLAlchemy Session for database transactions
from sqlalchemy.orm import Session
# Import the database session utility
from app.database import get_db
# Import User model for context and relationship mapping
from app.models.user import User, UserRole
# Import reimbursement-related models and enums
from app.models.reimbursement import (
    ReimbursementRequest, ReimbursementPayment,
    ReimbursementStatus, ReimbursementCategory,
)
from app.models.society_expense import SocietyExpense

# Import Pydantic schemas for validation and output formatting
from app.schemas.reimbursement import (
    ReimbursementCreate, ReimbursementUpdate, ReimbursementOut,
    ReimbursementPaymentCreate, ReimbursementPaymentOut,
)
# Import authentication utilities for role and session verification
from app.utils.auth import get_current_user, require_role
# Import cloud storage utility for handling digital receipt uploads
from app.utils.storage import upload_file
# Import notification service for real-time alerting on request status
from app.services.notification_service import create_notification
# Import notification type enum
from app.models.notification import NotificationType

# Initialize router with relevant prefix and grouping tags
router = APIRouter(prefix="/api/reimbursements", tags=["Reimbursements"])


# ── Reimbursement Lifecycle Endpoints ──

# POST endpoint for residents to submit a new reimbursement claim
@router.post("", response_model=ReimbursementOut, status_code=201)
def create_request(
    data: ReimbursementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Society administrators cannot submit reimbursement claims. Admins are only authorized to review, approve, and settle claims submitted by residents."
        )
    # Initialize a new claim record
    req = ReimbursementRequest(
        # Unique tracking ID
        id=str(uuid.uuid4()),
        # Scope to user's society
        society_id=current_user.society_id,
        # Link to the user who incurred the expense
        user_id=current_user.id,
        # Claim details
        title=data.title,
        description=data.description,
        amount=data.amount,
        expense_date=data.expense_date,
        # Cast input string to category enum
        category=ReimbursementCategory(data.category),
        # Payment address / UPI ID / phone provided by claimant
        payment_address=data.payment_address or current_user.payment_address,
        # Initial status indicating submission
        status=ReimbursementStatus.SUBMITTED,
    )
    if data.payment_address:
        current_user.payment_address = data.payment_address
    # Stage and commit
    db.add(req)
    db.commit()
    # Reload fresh state
    db.refresh(req)
    out = ReimbursementOut.model_validate(req)
    out.payment_address = req.payment_address or (current_user.payment_address if current_user else None)
    return out


# GET endpoint to list reimbursement claims (context-aware)
@router.get("", response_model=list[ReimbursementOut])
def list_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # ── Role-Based Filtering ──
    if current_user.role.value == "admin":
        # Admins view all society-wide reimbursement traffic
        items = (
            db.query(ReimbursementRequest)
            .filter(ReimbursementRequest.society_id == current_user.society_id)
            .order_by(ReimbursementRequest.created_at.desc())
            .all()
        )
    else:
        # Residents only see their own claim history
        items = (
            db.query(ReimbursementRequest)
            .filter(ReimbursementRequest.user_id == current_user.id)
            .order_by(ReimbursementRequest.created_at.desc())
            .all()
        )
    
    # Process output to include user-specific payment info (like UPI/Bank detail)
    out_items = []
    for req in items:
        out = ReimbursementOut.model_validate(req)
        # Pull payment coordinate from claim record or User record
        out.payment_address = req.payment_address or (req.user.payment_address if req.user else "Not Provided")
        out_items.append(out)
        
    return out_items


# GET endpoint for details on a specific claim
@router.get("/{request_id}", response_model=ReimbursementOut)
def get_request(request_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    # lookup by ID
    req = db.query(ReimbursementRequest).filter(ReimbursementRequest.id == request_id).first()
    # error if missing
    if not req:
        raise HTTPException(status_code=404, detail="Reimbursement request not found")
    
    # Validate and inject meta info
    out = ReimbursementOut.model_validate(req)
    out.payment_address = req.payment_address or (req.user.payment_address if req.user else None)
    return out


# PATCH endpoint for admins to approve/reject or comment on claims
@router.patch("/{request_id}", response_model=ReimbursementOut)
def review_request(
    request_id: str,
    data: ReimbursementUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    # locate the claim
    req = db.query(ReimbursementRequest).filter(ReimbursementRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    # update status based on admin decision (Approved/Rejected/Under Review)
    if data.status:
        req.status = ReimbursementStatus(data.status)
    # apply specific approved amount (may differ from requested)
    if data.approved_amount is not None:
        req.approved_amount = data.approved_amount
    # include feedback for the resident
    if data.admin_notes is not None:
        req.admin_notes = data.admin_notes
    # audit info
    req.reviewed_by = admin.id
    req.updated_at = datetime.utcnow()

    # save changes
    db.commit()
    db.refresh(req)

    # Notify the user about the management's decision
    create_notification(
        db, req.user_id,
        f"Reimbursement {req.status.value.replace('_', ' ').title()}: {req.title}",
        f"Amount: Rs.{req.approved_amount or req.amount}",
        NotificationType.REIMBURSEMENT, req.id,
    )

    out = ReimbursementOut.model_validate(req)
    out.payment_address = req.payment_address or (req.user.payment_address if req.user else None)
    return out


# ── Payment Processing ──

# POST endpoint for admins to record a payment for an approved claim
@router.post("/{request_id}/pay", response_model=ReimbursementPaymentOut, status_code=201)
def mark_paid(
    request_id: str,
    data: ReimbursementPaymentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    # locate the target claim
    req = db.query(ReimbursementRequest).filter(ReimbursementRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Original request missing")
    
    # Business Logic: Payment can only be recorded for approved claims
    if req.status != ReimbursementStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Logical Error: Request must be in APPROVED state before settlement")

    # Initialize the payment record
    payment = ReimbursementPayment(
        id=str(uuid.uuid4()),
        request_id=request_id,
        amount=data.amount,
        payment_method=data.payment_method,
        transaction_ref=data.transaction_ref,
        payment_date=data.payment_date,
        paid_by=admin.id,
    )
    # Log payment
    db.add(payment)
    # Advance claim state to PAID
    req.status = ReimbursementStatus.PAID
    req.updated_at = datetime.utcnow()

    # Automatically generate a corresponding SocietyExpense entry
    if isinstance(data.payment_date, datetime):
        expense_date_val = data.payment_date
    elif isinstance(data.payment_date, date):
        expense_date_val = datetime.combine(data.payment_date, datetime.min.time())
    else:
        expense_date_val = datetime.utcnow()

    resident_name = req.user.name if (req.user and req.user.name) else "Resident"
    expense_desc = f"Reimbursement payout to {resident_name}. Method: {data.payment_method}. {req.description or ''}".strip()

    society_expense = SocietyExpense(
        id=str(uuid.uuid4()),
        society_id=req.society_id or (admin.society_id if admin else None),
        title=f"Reimbursement: {req.title}",
        description=expense_desc,
        amount=data.amount,
        expense_date=expense_date_val,
        document_url=req.receipt_path,
        created_by=admin.id,
    )
    db.add(society_expense)
    
    # Finalize settlement
    db.commit()
    db.refresh(payment)

    # notify the user that their money has been transferred
    create_notification(
        db, req.user_id,
        f"Reimbursement Settled: {req.title}",
        f"Rs.{data.amount} disbursed via {data.payment_method}",
        NotificationType.REIMBURSEMENT, req.id,
    )

    return payment


# ── Evidence Handling ──

# POST endpoint to upload a receipt photo for a claim
@router.post("/{request_id}/upload-receipt")
async def upload_receipt(
    request_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # locate claim record
    req = db.query(ReimbursementRequest).filter(ReimbursementRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Authority check: user must own the request or be an admin
    if req.user_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Permission Denied")

    # isolate file type
    ext = os.path.splitext(file.filename)[1]
    # generate cloud unique filename
    filename = f"reimb_{request_id}_{uuid.uuid4().hex[:6]}{ext}"
    content_type = file.content_type or "application/octet-stream"
    # read binary payload
    data = await file.read()
    # execute cloud write
    req.receipt_path = upload_file("reimbursements", filename, data, content_type)
    # patch record
    db.commit()
    return {"receipt_path": req.receipt_path}
