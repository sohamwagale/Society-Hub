from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, ResidentType
from app.models.flat import Flat
from app.models.billing import Bill, BillPayment, BillFlatAmount
from app.core.deps import require_role
from app.services.billing_service import get_resident_bill_amount

router = APIRouter()


@router.get("/{bill_id}/residents")
def get_bill_residents(
    bill_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill record not found")

    flats = (
        db.query(Flat)
        .filter(Flat.society_id == bill.society_id)
        .order_by(Flat.block, Flat.flat_number)
        .all()
    )
    payments = db.query(BillPayment).filter(BillPayment.bill_id == bill_id).all()
    paid_user_ids = {p.user_id for p in payments}

    paid_flat_ids = set()
    for user in db.query(User).filter(User.id.in_(paid_user_ids)).all():
        if user.flat_id:
            paid_flat_ids.add(user.flat_id)

    results = []
    for flat in flats:
        is_paid = flat.id in paid_flat_ids
        if not is_paid:
            continue

        owner = next(
            (u for u in flat.residents if u.resident_type == ResidentType.OWNER and u.is_fully_approved),
            None,
        )
        if not owner:
            owner = next((u for u in flat.residents if u.is_fully_approved), None)

        actual_amount = get_resident_bill_amount(bill, owner, db) if owner else bill.amount
        if owner and actual_amount == 0:
            continue

        flat_user_ids = [u.id for u in flat.residents]
        flat_payment = (
            db.query(BillPayment)
            .filter(BillPayment.bill_id == bill_id, BillPayment.user_id.in_(flat_user_ids))
            .first()
        )
        paid_at = flat_payment.paid_at if flat_payment else None
        paid_by_user = flat_payment.user if (flat_payment and flat_payment.user) else owner
        occupant_name = paid_by_user.name if paid_by_user else "Vacant / Unassigned"

        results.append({
            "user_id": flat.id,
            "name": occupant_name,
            "flat": f"{flat.block}-{flat.flat_number}",
            "status": "paid",
            "paid_at": paid_at,
            "amount": actual_amount,
        })
    return results


@router.get("/{bill_id}/overrides")
def get_bill_overrides(
    bill_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill record not found")

    overrides = db.query(BillFlatAmount).filter(BillFlatAmount.bill_id == bill_id).all()
    results = []
    for o in overrides:
        flat = db.query(Flat).filter(Flat.id == o.flat_id).first()
        results.append({
            "flat_id": o.flat_id,
            "flat_number": flat.flat_number if flat else None,
            "block": flat.block if flat else None,
            "floor": flat.floor if flat else None,
            "amount": o.amount,
        })
    return results
