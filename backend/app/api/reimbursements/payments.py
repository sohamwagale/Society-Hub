import uuid
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.reimbursement import ReimbursementRequest, ReimbursementPayment, ReimbursementStatus
from app.models.society_expense import SocietyExpense
from app.schemas.reimbursement import ReimbursementPaymentCreate, ReimbursementPaymentOut
from app.core.deps import require_role
from app.services.notification_service import create_notification
from app.models.notification import NotificationType

router = APIRouter()


@router.post("/{request_id}/pay", response_model=ReimbursementPaymentOut, status_code=201)
def mark_paid(
    request_id: str,
    data: ReimbursementPaymentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    req = db.query(ReimbursementRequest).filter(ReimbursementRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Original request missing")

    if req.status != ReimbursementStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Logical Error: Request must be in APPROVED state before settlement")

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
    db.commit()
    db.refresh(payment)

    create_notification(
        db, req.user_id,
        f"Reimbursement Settled: {req.title}",
        f"Rs.{data.amount} disbursed via {data.payment_method}",
        NotificationType.REIMBURSEMENT, req.id,
    )

    return payment
