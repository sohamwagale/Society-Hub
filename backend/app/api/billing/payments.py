import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.billing import Bill, BillPayment
from app.schemas.billing import BillPaymentCreate, BillPaymentOut
from app.core.deps import get_current_user
from app.services.billing_service import get_resident_bill_amount, is_all_residents_paid
from app.services.storage_service import upload_file

router = APIRouter()


@router.post("/pay", response_model=BillPaymentOut, status_code=201)
def pay_bill(
    data: BillPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bill = db.query(Bill).filter(Bill.id == data.bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="The specified bill does not exist")

    if current_user.flat_id:
        flat_users = db.query(User).filter(User.flat_id == current_user.flat_id).all()
        flat_user_ids = [u.id for u in flat_users]
        existing = db.query(BillPayment).filter(
            BillPayment.bill_id == data.bill_id, BillPayment.user_id.in_(flat_user_ids)
        ).first()
    else:
        existing = db.query(BillPayment).filter(
            BillPayment.bill_id == data.bill_id, BillPayment.user_id == current_user.id
        ).first()

    if existing:
        raise HTTPException(status_code=400, detail="This bill has already been settled by your unit")

    expected_amount = get_resident_bill_amount(bill, current_user, db)
    if expected_amount == 0:
        raise HTTPException(status_code=400, detail="Your unit is not assigned to this billing cycle")

    payment = BillPayment(
        id=str(uuid.uuid4()),
        bill_id=data.bill_id,
        user_id=current_user.id,
        amount=expected_amount,
        payment_method=data.payment_method,
        transaction_ref=data.transaction_ref,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    if is_all_residents_paid(bill, db):
        bill.is_active = False
        db.commit()

    return payment


@router.get("/payments/history", response_model=list[BillPaymentOut])
def payment_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(BillPayment)
        .filter(BillPayment.user_id == current_user.id)
        .order_by(BillPayment.paid_at.desc())
        .all()
    )


@router.post("/{payment_id}/upload-receipt")
async def upload_receipt(
    payment_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment = db.query(BillPayment).filter(
        BillPayment.id == payment_id, BillPayment.user_id == current_user.id
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found or access denied")

    ext = os.path.splitext(file.filename)[1]
    filename = f"{payment_id}{ext}"
    content_type = file.content_type or "application/octet-stream"
    data = await file.read()
    payment.receipt_path = upload_file("bill-receipts", filename, data, content_type)
    db.commit()
    return {"receipt_path": payment.receipt_path}
