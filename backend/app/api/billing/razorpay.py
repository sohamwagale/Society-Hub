import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.billing import Bill, BillPayment
from app.schemas.billing import RazorpayOrderResponse, RazorpayVerifyRequest, BillPaymentOut
from app.core.deps import get_current_user
from app.services.billing_service import get_resident_bill_amount, is_all_residents_paid
from app.services.razorpay_service import create_order, verify_payment_signature
from app.services.notification_service import create_notification
from app.models.notification import NotificationType

router = APIRouter()


@router.post("/{bill_id}/create-razorpay-order", response_model=RazorpayOrderResponse)
def create_razorpay_order(
    bill_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bill = db.query(Bill).filter(Bill.id == bill_id, Bill.is_active == True).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    if current_user.role == "resident":
        existing = db.query(BillPayment).filter(
            BillPayment.bill_id == bill_id,
            BillPayment.user_id == current_user.id,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="You have already paid this bill")

    amount = get_resident_bill_amount(bill, current_user, db) if current_user.role == "resident" else bill.amount
    receipt = f"BILL-{bill_id[:20]}"
    order = create_order(
        amount_rupees=amount,
        receipt=receipt,
        notes={"bill_id": bill_id, "user_id": current_user.id},
    )

    return RazorpayOrderResponse(
        razorpay_order_id=order["id"],
        amount=amount,
        amount_paise=order["amount"],
        currency=order["currency"],
        key_id=(os.getenv("RAZORPAY_KEY_ID") or "").strip(),
    )


@router.post("/{bill_id}/verify-razorpay-payment", response_model=BillPaymentOut)
def verify_razorpay_payment(
    bill_id: str,
    body: RazorpayVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    verify_payment_signature(
        razorpay_order_id=body.razorpay_order_id,
        razorpay_payment_id=body.razorpay_payment_id,
        razorpay_signature=body.razorpay_signature,
    )

    amount = get_resident_bill_amount(bill, current_user, db) if current_user.role == "resident" else bill.amount
    payment = BillPayment(
        bill_id=bill_id,
        user_id=current_user.id,
        amount=amount,
        payment_method="razorpay",
        transaction_ref=body.razorpay_payment_id,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    if is_all_residents_paid(bill, db):
        bill.is_active = False
        db.commit()

    try:
        create_notification(
            db=db,
            user_id=bill.created_by,
            title="Bill Payment Received 💰",
            body=f"{current_user.name} paid ₹{amount:,.0f} for '{bill.title}' via Razorpay.",
            notification_type=NotificationType.BILL,
            reference_id=bill_id,
        )
    except Exception:
        pass

    return BillPaymentOut.model_validate(payment)
