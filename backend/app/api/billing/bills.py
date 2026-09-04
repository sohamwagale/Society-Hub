import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.billing import Bill, BillType, BillFlatAmount
from app.schemas.billing import BillCreate, BillOut
from app.core.deps import get_current_user, require_role
from app.services.billing_service import get_payment_status, get_resident_bill_amount
from app.services.notification_service import notify_all_residents
from app.models.notification import NotificationType
from app.services.activity_log_service import log_activity

router = APIRouter()


@router.post("/", response_model=BillOut, status_code=201)
def create_bill(
    data: BillCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    bill = Bill(
        id=str(uuid.uuid4()),
        society_id=admin.society_id,
        title=data.title,
        description=data.description,
        bill_type=BillType(data.bill_type),
        amount=data.amount,
        due_date=data.due_date,
        created_by=admin.id,
    )
    db.add(bill)
    db.commit()
    db.refresh(bill)

    if data.flat_overrides:
        for override in data.flat_overrides:
            flat_amount = BillFlatAmount(
                bill_id=bill.id,
                flat_id=override.flat_id,
                amount=override.amount
            )
            db.add(flat_amount)
        db.commit()

    notify_all_residents(
        db, f"New Bill: {bill.title}",
        f"Amount: Rs.{bill.amount} | Due: {bill.due_date}",
        NotificationType.BILL, bill.id,
        society_id=admin.society_id,
    )

    log_activity(
        db,
        user_id=admin.id,
        society_id=admin.society_id,
        action="Created Bill Cycle",
        entity_type="billing",
        entity_id=bill.id,
        details=f"Created bill '{bill.title}' of Rs.{bill.amount:,.2f} due on {bill.due_date}",
    )

    result = BillOut.model_validate(bill)
    result.payment_status = "due"
    return result


@router.get("/", response_model=list[BillOut])
def list_bills(
    bill_type: Optional[str] = Query(None),
    active_only: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Bill).filter(Bill.society_id == current_user.society_id)
    if bill_type:
        query = query.filter(Bill.bill_type == BillType(bill_type))
    if active_only is not None:
        query = query.filter(Bill.is_active == active_only)

    bills = query.order_by(Bill.due_date.desc()).all()
    results = []
    for b in bills:
        if current_user.role == "resident":
            resident_amount = get_resident_bill_amount(b, current_user, db)
            if resident_amount == 0:
                continue
            out = BillOut.model_validate(b)
            out.amount = resident_amount
        else:
            out = BillOut.model_validate(b)
        out.payment_status = get_payment_status(b, current_user, db)
        results.append(out)
    return results


@router.get("/{bill_id}", response_model=BillOut)
def get_bill(bill_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    if current_user.role == "resident":
        actual_amount = get_resident_bill_amount(bill, current_user, db)
        if actual_amount == 0:
            raise HTTPException(status_code=404, detail="Bill record not applicable to your unit")
        out = BillOut.model_validate(bill)
        out.amount = actual_amount
    else:
        out = BillOut.model_validate(bill)

    out.payment_status = get_payment_status(bill, current_user, db)
    return out
