from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.database import get_db
from app.models.user import User
from app.models.flat import Flat
from app.models.society import Society
from app.models.billing import Bill, BillPayment
from app.core.config import SECRET_KEY, ALGORITHM
from app.services.export_service import generate_dues_csv, generate_payments_csv
from app.services.pdf import generate_receipt_pdf, generate_bill_report_pdf

router = APIRouter()


def _authenticate_token_admin(token: Optional[str], db: Session) -> User:
    if not token:
        raise HTTPException(status_code=401, detail="Authentication token required (?token=)")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    admin = db.query(User).filter(User.id == user_id).first()
    if not admin or admin.role.value != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return admin


@router.get("/export-dues-csv")
def export_unpaid_dues_csv(token: Optional[str] = Query(None), db: Session = Depends(get_db)):
    admin = _authenticate_token_admin(token, db)
    active_bills = db.query(Bill).filter(Bill.society_id == admin.society_id).order_by(Bill.due_date.desc()).all()
    flats = db.query(Flat).filter(Flat.society_id == admin.society_id).order_by(Flat.block, Flat.flat_number).all()

    buffer = generate_dues_csv(flats, active_bills, db)
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="unpaid_dues_ledger_{date.today().isoformat()}.csv"'},
    )


@router.get("/payments/export-csv")
def export_payment_receipts_csv(token: Optional[str] = Query(None), db: Session = Depends(get_db)):
    admin = _authenticate_token_admin(token, db)
    payments = (
        db.query(BillPayment)
        .join(Bill, BillPayment.bill_id == Bill.id)
        .filter(Bill.society_id == admin.society_id)
        .order_by(BillPayment.paid_at.desc())
        .all()
    )
    buffer = generate_payments_csv(payments)
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="payment_receipts_{date.today().isoformat()}.csv"'},
    )


@router.get("/export-report")
def export_bills_report(token: Optional[str] = Query(None), db: Session = Depends(get_db)):
    admin = _authenticate_token_admin(token, db)
    active_bills = db.query(Bill).filter(Bill.is_active == True, Bill.society_id == admin.society_id).order_by(Bill.due_date.desc()).all()
    flats = db.query(Flat).filter(Flat.society_id == admin.society_id).order_by(Flat.block, Flat.flat_number).all()
    society = db.query(Society).filter(Society.id == admin.society_id).first()
    society_name = society.name if society else "The Society"

    buffer = generate_bill_report_pdf(active_bills, flats, society_name, db)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="society_billing_report_{date.today().isoformat()}.pdf"'},
    )


@router.get("/{payment_id}/receipt")
def download_receipt(payment_id: str, token: Optional[str] = Query(None), db: Session = Depends(get_db)):
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required. Provide ?token= query parameter.")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    current_user = db.query(User).filter(User.id == user_id).first()
    if not current_user:
        raise HTTPException(status_code=401, detail="User not found")

    payment = db.query(BillPayment).filter(BillPayment.id == payment_id, BillPayment.user_id == current_user.id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    bill = db.query(Bill).filter(Bill.id == payment.bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Parent bill missing")

    society = db.query(Society).filter(Society.id == current_user.society_id).first()
    buffer = generate_receipt_pdf(payment, bill, current_user, society)

    receipt_no = f"SH-{payment.id[:8].upper()}"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Receipt_{receipt_no}.pdf"'},
    )
