import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.reimbursement import (
    ReimbursementRequest, ReimbursementStatus, ReimbursementCategory,
)
from app.schemas.reimbursement import (
    ReimbursementCreate, ReimbursementUpdate, ReimbursementOut,
)
from app.core.deps import get_current_user, require_role
from app.services.notification_service import create_notification
from app.models.notification import NotificationType

router = APIRouter()


@router.post("/", response_model=ReimbursementOut, status_code=201)
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

    req = ReimbursementRequest(
        id=str(uuid.uuid4()),
        society_id=current_user.society_id,
        user_id=current_user.id,
        title=data.title,
        description=data.description,
        amount=data.amount,
        expense_date=data.expense_date,
        category=ReimbursementCategory(data.category),
        payment_address=data.payment_address or current_user.payment_address,
        status=ReimbursementStatus.SUBMITTED,
    )
    if data.payment_address:
        current_user.payment_address = data.payment_address

    db.add(req)
    db.commit()
    db.refresh(req)

    out = ReimbursementOut.model_validate(req)
    out.payment_address = req.payment_address or (current_user.payment_address if current_user else None)
    return out


@router.get("/", response_model=list[ReimbursementOut])
def list_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role.value == "admin":
        items = (
            db.query(ReimbursementRequest)
            .filter(ReimbursementRequest.society_id == current_user.society_id)
            .order_by(ReimbursementRequest.created_at.desc())
            .all()
        )
    else:
        items = (
            db.query(ReimbursementRequest)
            .filter(ReimbursementRequest.user_id == current_user.id)
            .order_by(ReimbursementRequest.created_at.desc())
            .all()
        )

    out_items = []
    for req in items:
        out = ReimbursementOut.model_validate(req)
        out.payment_address = req.payment_address or (req.user.payment_address if req.user else "Not Provided")
        out_items.append(out)

    return out_items


@router.get("/{request_id}", response_model=ReimbursementOut)
def get_request(request_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    req = db.query(ReimbursementRequest).filter(ReimbursementRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Reimbursement request not found")

    out = ReimbursementOut.model_validate(req)
    out.payment_address = req.payment_address or (req.user.payment_address if req.user else None)
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

    out = ReimbursementOut.model_validate(req)
    out.payment_address = req.payment_address or (req.user.payment_address if req.user else None)
    return out
