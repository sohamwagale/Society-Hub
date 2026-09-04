from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.billing import Bill, BillType, BillPayment, BillFlatAmount
from app.schemas.billing import BillUpdate
from app.core.deps import require_role

router = APIRouter()


@router.put("/{bill_id}")
async def update_bill(
    bill_id: str,
    payload: BillUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill record not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "flat_overrides" in update_data:
        overrides_data = update_data.pop("flat_overrides")
        db.query(BillFlatAmount).filter(BillFlatAmount.bill_id == bill_id).delete()
        if overrides_data:
            for item in overrides_data:
                db.add(BillFlatAmount(
                    bill_id=bill_id,
                    flat_id=item["flat_id"],
                    amount=item["amount"]
                ))

    for field, value in update_data.items():
        if value is None:
            continue
        if field == "bill_type":
            setattr(bill, field, BillType(value))
        else:
            setattr(bill, field, value)

    db.commit()
    db.refresh(bill)
    return bill


@router.delete("/{bill_id}")
async def delete_bill(
    bill_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill record not found")

    payments = db.query(BillPayment).filter(BillPayment.bill_id == bill_id).count()
    if payments > 0:
        raise HTTPException(status_code=400, detail="Audit restriction: Cannot delete a bill that has associated payment records")

    db.delete(bill)
    db.commit()
    return {"detail": "Bill successfully removed from the system"}
