import os
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.reimbursement import (
    ReimbursementRequest, ReimbursementPayment,
    ReimbursementStatus, ReimbursementCategory,
)
from app.schemas.reimbursement import (
    ReimbursementCreate, ReimbursementUpdate, ReimbursementOut,
    ReimbursementPaymentCreate, ReimbursementPaymentOut,
)
from app.utils.auth import get_current_user, require_role
from app.utils.storage import upload_file
from app.services.notification_service import create_notification
from app.models.notification import NotificationType

router = APIRouter(prefix="/api/reimbursements", tags=["Reimbursements"])


@router.post("", response_model=ReimbursementOut, status_code=201)
def create_request(
    data: ReimbursementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = ReimbursementRequest(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        title=data.title,
        description=data.description,
        amount=data.amount,
        expense_date=data.expense_date,
        category=ReimbursementCategory(data.category),
        status=ReimbursementStatus.SUBMITTED,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@router.get("", response_model=list[ReimbursementOut])
def list_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role.value == "admin":
        items = db.query(ReimbursementRequest).order_by(ReimbursementRequest.created_at.desc()).all()
    else:
        items = (
            db.query(ReimbursementRequest)
            .filter(ReimbursementRequest.user_id == current_user.id)
            .order_by(ReimbursementRequest.created_at.desc())
            .all()
        )
    
    # Attach payment address manually since it's on the User model
    out_items = []
    for req in items:
        out = ReimbursementOut.model_validate(req)
        out.payment_address = req.user.payment_address if req.user else None
        out_items.append(out)
        
    return out_items


@router.get("/{request_id}", response_model=ReimbursementOut)
def get_request(request_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    req = db.query(ReimbursementRequest).filter(ReimbursementRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    out = ReimbursementOut.model_validate(req)
    out.payment_address = req.user.payment_address if req.user else None
    return out


@router.patch("/{request_id}", response_model=ReimbursementOut)
def review_request(
    request_id: str,
    data: ReimbursementUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    req = db.query(ReimbursementRequest).filter(ReimbursementRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if data.status:
        req.status = ReimbursementStatus(data.status)
    if data.approved_amount is not None:
        req.approved_amount = data.approved_amount
    if data.admin_notes is not None:
        req.admin_notes = data.admin_notes
    req.reviewed_by = admin.id
    req.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(req)

    create_notification(
        db, req.user_id,
        f"Reimbursement {req.status.value.replace('_', ' ').title()}: {req.title}",
        f"Amount: Rs.{req.approved_amount or req.amount}",
        NotificationType.REIMBURSEMENT, req.id,
    )

    return req


@router.post("/{request_id}/pay", response_model=ReimbursementPaymentOut, status_code=201)
def mark_paid(
    request_id: str,
    data: ReimbursementPaymentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    req = db.query(ReimbursementRequest).filter(ReimbursementRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.status != ReimbursementStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Request must be approved before payment")

    payment = ReimbursementPayment(
        id=str(uuid.uuid4()),
        request_id=request_id,
        amount=data.amount,
        payment_method=data.payment_method,
        transaction_ref=data.transaction_ref,
        payment_date=data.payment_date,
        paid_by=admin.id,
    )
    db.add(payment)
    req.status = ReimbursementStatus.PAID
    req.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(payment)

    create_notification(
        db, req.user_id,
        f"Reimbursement Paid: {req.title}",
        f"Rs.{data.amount} paid via {data.payment_method}",
        NotificationType.REIMBURSEMENT, req.id,
    )

    return payment


@router.post("/{request_id}/upload-receipt")
async def upload_receipt(
    request_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = db.query(ReimbursementRequest).filter(ReimbursementRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.user_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    ext = os.path.splitext(file.filename)[1]
    filename = f"{request_id}_receipt{ext}"
    content_type = file.content_type or "application/octet-stream"
    data = await file.read()
    req.receipt_path = upload_file("reimbursements", filename, data, content_type)
    db.commit()
    return {"receipt_path": req.receipt_path}
