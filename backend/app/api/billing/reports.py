from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.flat import Flat
from app.models.society import Society
from app.models.billing import Bill, BillPayment
from app.core.deps import get_current_user, require_role
from app.services.export_service import generate_dues_csv, generate_payments_csv
from app.services.pdf import generate_receipt_pdf, generate_bill_report_pdf

router = APIRouter()


@router.get("/export-dues-csv")
def export_unpaid_dues_csv(
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    active_bills = db.query(Bill).filter(Bill.society_id == admin.society_id).order_by(Bill.due_date.desc()).all()
    flats = db.query(Flat).filter(Flat.society_id == admin.society_id).order_by(Flat.block, Flat.flat_number).all()

    buffer = generate_dues_csv(flats, active_bills, db)
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="unpaid_dues_ledger_{date.today().isoformat()}.csv"'},
    )


@router.get("/payments/export-csv")
def export_payment_receipts_csv(
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
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
def export_bills_report(
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
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
def download_receipt(
    payment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payment = db.query(BillPayment).filter(BillPayment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    # Allow if the user made the payment or is an admin of the same society
    if payment.user_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to access this receipt")

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
