import os
import uuid
from datetime import date, datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.billing import Bill, BillPayment, BillType, BillStatus, BillFlatAmount
from app.schemas.billing import BillCreate, BillOut, BillUpdate, BillPaymentCreate, BillPaymentOut
from app.utils.auth import get_current_user, require_role
from app.utils.storage import upload_file
from app.services.notification_service import notify_all_residents, create_notification
from app.models.notification import NotificationType

router = APIRouter(prefix="/api/bills", tags=["Billing"])


def _get_payment_status(bill: Bill, user: User, db: Session) -> str:
    # Admin: compute aggregate status across all residents of the same society
    if user.role == "admin":
        residents_query = db.query(User).filter(User.role == "resident")
        if bill.society_id:
            residents_query = residents_query.filter(User.society_id == bill.society_id)
        all_residents = [u for u in residents_query.all() if u.is_fully_approved]
        payments = db.query(BillPayment).filter(BillPayment.bill_id == bill.id).all()
        paid_user_ids = {p.user_id for p in payments}

        # Build set of paid flat IDs
        paid_flat_ids = set()
        for u in db.query(User).filter(User.id.in_(paid_user_ids)).all():
            if u.flat_id:
                paid_flat_ids.add(u.flat_id)

        # Count unique flats that owe this bill (amount != 0)
        seen_flats = set()
        total_owing = 0
        total_paid = 0
        for u in all_residents:
            flat_key = u.flat_id or u.id  # fallback for users without flat
            if flat_key in seen_flats:
                continue
            seen_flats.add(flat_key)
            actual_amount = _get_resident_bill_amount(bill, u, db)
            if actual_amount == 0:
                continue  # excluded from this bill
            total_owing += 1
            if (u.id in paid_user_ids) or (u.flat_id and u.flat_id in paid_flat_ids):
                total_paid += 1

        if total_owing > 0 and total_paid >= total_owing:
            return "paid"
        if bill.due_date < date.today():
            return "overdue"
        return "due"

    # Resident: check if ANY user from the same flat has paid
    if not user.flat_id:
        # Fallback for edge cases without flat_id
        payment = db.query(BillPayment).filter(
            BillPayment.bill_id == bill.id, BillPayment.user_id == user.id
        ).first()
    else:
        # Find all users in the same flat
        flat_users = db.query(User).filter(User.flat_id == user.flat_id).all()
        flat_user_ids = [u.id for u in flat_users]
        payment = db.query(BillPayment).filter(
            BillPayment.bill_id == bill.id, BillPayment.user_id.in_(flat_user_ids)
        ).first()

    if payment:
        return "paid"
    if bill.due_date < date.today():
        return "overdue"
    return "due"


def _get_resident_bill_amount(bill: Bill, user: User, db: Session) -> float:
    if not user.flat_id:
        return bill.amount
    override = db.query(BillFlatAmount).filter(
        BillFlatAmount.bill_id == bill.id,
        BillFlatAmount.flat_id == user.flat_id
    ).first()
    if override:
        return override.amount
    return bill.amount


def _is_all_residents_paid(bill: Bill, db: Session) -> bool:
    """
    Returns True ONLY when every non-excluded resident (unique per flat) in the
    same society has paid.  Excluded residents (amount == 0) are skipped.
    """
    residents_query = db.query(User).filter(User.role == "resident")
    if bill.society_id:
        residents_query = residents_query.filter(User.society_id == bill.society_id)
    all_residents = [u for u in residents_query.all() if u.is_fully_approved]
    payments = db.query(BillPayment).filter(BillPayment.bill_id == bill.id).all()
    paid_user_ids = {p.user_id for p in payments}

    # Collect flat IDs that have made a payment
    paid_flat_ids: set = set()
    for u in db.query(User).filter(User.id.in_(paid_user_ids)).all():
        if u.flat_id:
            paid_flat_ids.add(u.flat_id)

    seen_flats: set = set()
    total_owing = 0
    total_paid = 0
    for u in all_residents:
        flat_key = u.flat_id or u.id
        if flat_key in seen_flats:
            continue
        seen_flats.add(flat_key)
        if _get_resident_bill_amount(bill, u, db) == 0:
            continue  # excluded from this bill
        total_owing += 1
        if (u.id in paid_user_ids) or (u.flat_id and u.flat_id in paid_flat_ids):
            total_paid += 1

    return total_owing > 0 and total_paid >= total_owing


@router.post("", response_model=BillOut, status_code=201)
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

    # Notify all residents of this society
    notify_all_residents(
        db, f"New Bill: {bill.title}",
        f"Amount: Rs.{bill.amount} | Due: {bill.due_date}",
        NotificationType.BILL, bill.id,
        society_id=admin.society_id,
    )

    result = BillOut.model_validate(bill)
    result.payment_status = "due"
    return result

@router.get("", response_model=list[BillOut])
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
    
    bills = query.order_by(Bill.created_at.desc()).all()

    results = []
    for bill in bills:
        actual_amount = bill.amount
        if current_user.role == "resident":
            actual_amount = _get_resident_bill_amount(bill, current_user, db)
            if actual_amount == 0:
                continue
                
        out = BillOut.model_validate(bill)
        out.amount = actual_amount
        out.payment_status = _get_payment_status(bill, current_user, db)
        results.append(out)
    return results


@router.get("/export-report")
def export_bills_report(
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Generate a PDF report of all active bills with flat-wise payment status."""
    from app.models.flat import Flat
    from app.models.society import Society
    from jose import jwt, JWTError
    from app.utils.auth import SECRET_KEY, ALGORITHM
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.colors import HexColor
    from reportlab.pdfgen import canvas as pdf_canvas
    from reportlab.lib.units import mm
    from io import BytesIO
    from fastapi.responses import StreamingResponse

    # Auth via token query param
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
    if not current_user or current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    # Get data (scoped to admin's society)
    active_bills = (
        db.query(Bill)
        .filter(Bill.is_active == True, Bill.society_id == current_user.society_id)
        .order_by(Bill.due_date.desc())
        .all()
    )
    if not active_bills:
        raise HTTPException(status_code=404, detail="No active bills found")

    from app.models.flat import Flat as FlatModel
    flats = (
        db.query(Flat)
        .join(FlatModel.residents)
        .filter(User.society_id == current_user.society_id)
        .distinct()
        .order_by(Flat.block, Flat.flat_number)
        .all()
    )
    society = db.query(Society).filter(Society.id == current_user.society_id).first()
    society_name = society.name if society else "Society"

    # Build flat data: for each flat, determine payment status per bill
    flat_rows = []
    for flat in flats:
        flat_label = f"{flat.block}-{flat.flat_number}"
        flat_resident_ids = [u.id for u in flat.residents if u.is_fully_approved]
        if not flat_resident_ids:
            continue

        # Find owner name
        owner = next((u for u in flat.residents if u.resident_type == 'owner' and u.is_fully_approved), None)
        owner_name = owner.name if owner else (flat.residents[0].name if flat.residents else "")

        row = {"flat": flat_label, "owner": owner_name, "bills": {}, "total_due": 0.0}
        for bill in active_bills:
            # Get custom amount for this flat
            override = db.query(BillFlatAmount).filter(
                BillFlatAmount.bill_id == bill.id,
                BillFlatAmount.flat_id == flat.id
            ).first()
            if override and override.amount == 0:
                row["bills"][bill.id] = {"status": "excluded", "amount": 0}
                continue
            bill_amount = override.amount if override else bill.amount

            # Check if any resident in this flat has paid
            payment = db.query(BillPayment).filter(
                BillPayment.bill_id == bill.id,
                BillPayment.user_id.in_(flat_resident_ids)
            ).first()

            if payment:
                row["bills"][bill.id] = {"status": "paid", "amount": bill_amount}
            else:
                row["bills"][bill.id] = {"status": "due", "amount": bill_amount}
                row["total_due"] += bill_amount

        flat_rows.append(row)

    # Filter out bills that are fully paid
    incomplete_bills = []
    for bill in active_bills:
        paid_count = sum(1 for fr in flat_rows if bill.id in fr["bills"] and fr["bills"][bill.id]["status"] == "paid")
        total_count = sum(1 for fr in flat_rows if bill.id in fr["bills"] and fr["bills"][bill.id]["status"] != "excluded")
        if total_count > 0 and paid_count < total_count:
            incomplete_bills.append(bill)

    if not incomplete_bills:
        raise HTTPException(status_code=404, detail="No active, unpaid bills found.")
        
    active_bills = incomplete_bills

    # ── Generate PDF ──
    buffer = BytesIO()
    page_size = landscape(A4)
    c = pdf_canvas.Canvas(buffer, pagesize=page_size)
    W, H = page_size

    primary = HexColor("#311B92")
    white = HexColor("#FFFFFF")
    text_dark = HexColor("#1A1A2E")
    text_light = HexColor("#555555")
    green = HexColor("#2E7D32")
    red = HexColor("#C62828")
    grey_bg = HexColor("#F5F5F5")
    border = HexColor("#CCCCCC")

    def draw_header(canvas, page_num=1):
        canvas.setFillColor(primary)
        canvas.rect(0, H - 70, W, 70, fill=True, stroke=False)
        canvas.setFillColor(white)
        canvas.setFont("Helvetica-Bold", 18)
        canvas.drawString(30, H - 40, f"{society_name} — Bills Report")
        canvas.setFont("Helvetica", 10)
        canvas.drawString(30, H - 56, f"Generated: {datetime.utcnow().strftime('%d %b %Y, %I:%M %p UTC')}")
        canvas.drawRightString(W - 30, H - 40, f"Active Bills: {len(active_bills)}")
        canvas.drawRightString(W - 30, H - 56, f"Page {page_num}")

    def draw_footer(canvas):
        canvas.setFillColor(text_light)
        canvas.setFont("Helvetica", 7)
        canvas.drawCentredString(W / 2, 15, "Computer-generated report. Data as of generation time.")

    # ── Page 1: Bills Summary ──
    draw_header(c, 1)
    y = H - 100

    c.setFillColor(text_dark)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(30, y, "Bills Summary")
    y -= 25

    # Table header
    col_x = [30, 230, 370, 480, 600]
    headers = ["Bill Title", "Type", "Amount (Rs.)", "Due Date", "Paid / Total"]
    c.setFillColor(primary)
    c.rect(25, y - 5, W - 50, 20, fill=True, stroke=False)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 9)
    for i, h in enumerate(headers):
        c.drawString(col_x[i], y, h)
    y -= 22

    for idx, bill in enumerate(active_bills):
        if y < 50:
            draw_footer(c)
            c.showPage()
            draw_header(c, 2)
            y = H - 100

        # Alternating row background
        if idx % 2 == 0:
            c.setFillColor(grey_bg)
            c.rect(25, y - 5, W - 50, 18, fill=True, stroke=False)

        paid_count = sum(1 for fr in flat_rows if bill.id in fr["bills"] and fr["bills"][bill.id]["status"] == "paid")
        total_count = sum(1 for fr in flat_rows if bill.id in fr["bills"] and fr["bills"][bill.id]["status"] != "excluded")

        c.setFillColor(text_dark)
        c.setFont("Helvetica", 9)
        title_display = bill.title[:30] + "..." if len(bill.title) > 30 else bill.title
        c.drawString(col_x[0], y, title_display)
        c.drawString(col_x[1], y, (bill.bill_type.value if bill.bill_type else "-").title())
        c.drawString(col_x[2], y, f"{bill.amount:,.0f}")
        c.drawString(col_x[3], y, bill.due_date.strftime("%d %b %Y") if bill.due_date else "-")

        # Color-coded paid ratio
        if paid_count == total_count and total_count > 0:
            c.setFillColor(green)
        elif paid_count == 0:
            c.setFillColor(red)
        else:
            c.setFillColor(HexColor("#E65100"))
        c.setFont("Helvetica-Bold", 9)
        c.drawString(col_x[4], y, f"{paid_count} / {total_count}")

        y -= 20

    # ── Page 2+: Flat-wise Breakdown ──
    draw_footer(c)
    c.showPage()
    page_num = 2
    draw_header(c, page_num)
    y = H - 100

    c.setFillColor(text_dark)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(30, y, "Flat-wise Payment Status")
    y -= 25

    # Determine columns: Flat | Bill1 | Bill2 | ... | Total Due
    max_bills_per_page = 6  # Fit bills across landscape page
    bill_chunks = [active_bills[i:i + max_bills_per_page] for i in range(0, len(active_bills), max_bills_per_page)]

    for chunk_idx, bill_chunk in enumerate(bill_chunks):
        if chunk_idx > 0:
            draw_footer(c)
            c.showPage()
            page_num += 1
            draw_header(c, page_num)
            y = H - 100

        num_cols = len(bill_chunk) + 2  # Flat + bills + Total Due
        # Give "Flat" column double width to fit owner names
        flat_col_width = (W - 60) * 2 / (num_cols + 1)
        other_col_width = (W - 60 - flat_col_width) / (num_cols - 1)
        col_starts = [30]  # Flat column starts at 30
        for i in range(1, num_cols):
            col_starts.append(30 + flat_col_width + (i - 1) * other_col_width)

        # Table header
        c.setFillColor(primary)
        c.rect(25, y - 5, W - 50, 20, fill=True, stroke=False)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(col_starts[0], y, "Flat")
        for bi, bill in enumerate(bill_chunk):
            label = bill.title[:12] + ".." if len(bill.title) > 12 else bill.title
            c.drawString(col_starts[bi + 1], y, label)
        c.drawString(col_starts[-1], y, "Total Due (Rs.)")
        y -= 20

        for ridx, fr in enumerate(flat_rows):
            if y < 50:
                draw_footer(c)
                c.showPage()
                page_num += 1
                draw_header(c, page_num)
                y = H - 100

            # Alternating row
            if ridx % 2 == 0:
                c.setFillColor(grey_bg)
                c.rect(25, y - 5, W - 50, 18, fill=True, stroke=False)

            c.setFont("Helvetica-Bold", 9)
            c.setFillColor(text_dark)
            flat_display = fr["flat"]
            if fr["owner"]:
                flat_display += f" ({fr['owner'][:15]})"
            c.drawString(col_starts[0], y, flat_display)

            c.setFont("Helvetica", 8)
            for bi, bill in enumerate(bill_chunk):
                bill_info = fr["bills"].get(bill.id)
                if not bill_info or bill_info["status"] == "excluded":
                    c.setFillColor(text_light)
                    c.drawString(col_starts[bi + 1], y, "—")
                elif bill_info["status"] == "paid":
                    c.setFillColor(green)
                    c.drawString(col_starts[bi + 1], y, f"✓ {bill_info['amount']:,.0f}")
                else:
                    c.setFillColor(red)
                    c.drawString(col_starts[bi + 1], y, f"✗ {bill_info['amount']:,.0f}")

            # Total due
            c.setFont("Helvetica-Bold", 9)
            if fr["total_due"] > 0:
                c.setFillColor(red)
            else:
                c.setFillColor(green)
            c.drawString(col_starts[-1], y, f"{fr['total_due']:,.0f}")

            y -= 18

    # Grand total
    y -= 10
    if y < 60:
        draw_footer(c)
        c.showPage()
        page_num += 1
        draw_header(c, page_num)
        y = H - 100

    grand_due = sum(fr["total_due"] for fr in flat_rows)
    grand_paid = sum(
        info["amount"]
        for fr in flat_rows
        for info in fr["bills"].values()
        if info["status"] == "paid"
    )

    c.setStrokeColor(border)
    c.setLineWidth(1)
    c.line(30, y + 5, W - 30, y + 5)
    y -= 10

    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(text_dark)
    c.drawString(30, y, f"Total Collected: ")
    c.setFillColor(green)
    c.drawString(160, y, f"Rs.{grand_paid:,.0f}")

    c.setFillColor(text_dark)
    c.drawString(320, y, f"Total Outstanding: ")
    c.setFillColor(red)
    c.drawString(470, y, f"Rs.{grand_due:,.0f}")

    draw_footer(c)
    c.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="bills_report_{date.today().isoformat()}.pdf"'},
    )


@router.get("/{bill_id}", response_model=BillOut)
def get_bill(bill_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    if current_user.role == "resident":
        actual_amount = _get_resident_bill_amount(bill, current_user, db)
        if actual_amount == 0:
            raise HTTPException(status_code=404, detail="Bill not found")
        out = BillOut.model_validate(bill)
        out.amount = actual_amount
    else:
        out = BillOut.model_validate(bill)
        
    out.payment_status = _get_payment_status(bill, current_user, db)
    return out


@router.get("/{bill_id}/residents")
def get_bill_residents(
    bill_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Get list of all residents and their payment status for a bill."""
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    # Get all potential payers (residents) from the same society as the bill
    residents_query = db.query(User).filter(User.role == "resident")
    if bill.society_id:
        residents_query = residents_query.filter(User.society_id == bill.society_id)
    users = [u for u in residents_query.all() if u.is_fully_approved]
    
    # Get all payments for this bill
    payments = db.query(BillPayment).filter(BillPayment.bill_id == bill_id).all()
    paid_user_ids = {p.user_id for p in payments}

    # Group payments by flat
    paid_flat_ids = set()
    for user in db.query(User).filter(User.id.in_(paid_user_ids)).all():
        if user.flat_id:
            paid_flat_ids.add(user.flat_id)

    results = []
    for user in users:
        actual_amount = _get_resident_bill_amount(bill, user, db)
        if actual_amount == 0:
            continue
            
        is_paid = (user.id in paid_user_ids) or (user.flat_id in paid_flat_ids)
        
        # Find the actual payment date for this flat
        paid_at = None
        if is_paid:
            flat_users = [u.id for u in db.query(User).filter(User.flat_id == user.flat_id).all()] if user.flat_id else [user.id]
            flat_payment = db.query(BillPayment).filter(BillPayment.bill_id == bill_id, BillPayment.user_id.in_(flat_users)).first()
            if flat_payment:
                paid_at = flat_payment.paid_at

        results.append({
            "user_id": user.id,
            "name": user.name,
            "flat": f"{user.flat.block}-{user.flat.flat_number}" if user.flat else "N/A",
            "status": "paid" if is_paid else "due",
            "paid_at": paid_at,
            "amount": actual_amount
        })
    
    return results


@router.post("/pay", response_model=BillPaymentOut, status_code=201)
def pay_bill(
    data: BillPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bill = db.query(Bill).filter(Bill.id == data.bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

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
        raise HTTPException(status_code=400, detail="Bill already paid")

    expected_amount = _get_resident_bill_amount(bill, current_user, db)
    if expected_amount == 0:
        raise HTTPException(status_code=400, detail="This flat is excluded from this bill.")

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

    # Auto-archive only when ALL non-excluded residents have paid
    if _is_all_residents_paid(bill, db):
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
        raise HTTPException(status_code=404, detail="Payment not found")

    ext = os.path.splitext(file.filename)[1]
    filename = f"{payment_id}{ext}"
    content_type = file.content_type or "application/octet-stream"
    data = await file.read()
    payment.receipt_path = upload_file("bill-receipts", filename, data, content_type)
    db.commit()
    return {"receipt_path": payment.receipt_path}


@router.put("/{bill_id}")
async def update_bill(
    bill_id: str,
    payload: BillUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    for field, value in payload.model_dump(exclude_none=True).items():
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
        raise HTTPException(status_code=404, detail="Bill not found")

    payments = db.query(BillPayment).filter(BillPayment.bill_id == bill_id).count()
    if payments > 0:
        raise HTTPException(status_code=400, detail="Cannot delete a bill that has payments")

    db.delete(bill)
    db.commit()
    return {"detail": "Bill deleted"}


@router.get("/{payment_id}/receipt")
def download_receipt(
    payment_id: str,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Generate and return a PDF receipt for a payment.
    Accepts auth via either Authorization header or ?token= query param
    so the URL can be opened directly in a browser.
    """
    from app.models.society import Society
    from jose import jwt, JWTError
    from app.utils.auth import SECRET_KEY, ALGORITHM
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.colors import HexColor
    from reportlab.pdfgen import canvas as pdf_canvas
    from io import BytesIO
    from fastapi.responses import StreamingResponse

    # Resolve the current user from token query param or raise 401
    if token:
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
    else:
        raise HTTPException(status_code=401, detail="Authentication required. Provide ?token= query parameter.")

    payment = db.query(BillPayment).filter(
        BillPayment.id == payment_id, BillPayment.user_id == current_user.id
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    bill = db.query(Bill).filter(Bill.id == payment.bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    society = db.query(Society).filter(Society.id == current_user.society_id).first()
    society_name = society.name if society else "Society"
    society_address = society.address if society and society.address else ""

    # Generate PDF in memory
    buffer = BytesIO()
    c = pdf_canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # Colors
    primary = HexColor("#311B92")
    accent = HexColor("#7C4DFF")
    dark_bg = HexColor("#0F0F1A")
    text_dark = HexColor("#1A1A2E")
    text_light = HexColor("#555555")
    border = HexColor("#E0E0E0")

    # Header background
    c.setFillColor(primary)
    c.rect(0, height - 100, width, 100, fill=True, stroke=False)

    # Header text
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 22)
    c.drawString(30, height - 45, society_name)
    if society_address:
        c.setFont("Helvetica", 10)
        c.drawString(30, height - 62, society_address)
    c.setFont("Helvetica-Bold", 14)
    c.drawRightString(width - 30, height - 45, "PAYMENT RECEIPT")

    # Receipt number & date
    receipt_no = f"RCT-{payment.id[:8].upper()}"
    c.setFont("Helvetica", 9)
    c.drawRightString(width - 30, height - 62, f"Receipt #: {receipt_no}")
    c.drawRightString(width - 30, height - 75, f"Date: {payment.paid_at.strftime('%d %b %Y, %I:%M %p')}")

    y = height - 140

    # Bill Details section
    c.setFillColor(text_dark)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(30, y, "Bill Details")
    y -= 5
    c.setStrokeColor(border)
    c.setLineWidth(0.5)
    c.line(30, y, width - 30, y)
    y -= 22

    details = [
        ("Bill Title", bill.title),
        ("Bill Type", bill.bill_type.value.replace("_", " ").title() if bill.bill_type else "-"),
        ("Description", bill.description or "—"),
        ("Due Date", bill.due_date.strftime("%d %b %Y") if bill.due_date else "-"),
    ]

    for label, value in details:
        c.setFont("Helvetica", 10)
        c.setFillColor(text_light)
        c.drawString(30, y, label)
        c.setFillColor(text_dark)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(180, y, str(value))
        y -= 20

    y -= 15

    # Payment Details section
    c.setFillColor(text_dark)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(30, y, "Payment Details")
    y -= 5
    c.line(30, y, width - 30, y)
    y -= 22

    payment_details = [
        ("Paid By", current_user.name),
        ("Email", current_user.email),
        ("Amount Paid", f"Rs.{payment.amount:,.2f}"),
        ("Payment Method", (payment.payment_method or "—").replace("_", " ").title()),
        ("Transaction Ref", payment.transaction_ref or "—"),
        ("Payment Date", payment.paid_at.strftime("%d %b %Y, %I:%M %p")),
    ]

    for label, value in payment_details:
        c.setFont("Helvetica", 10)
        c.setFillColor(text_light)
        c.drawString(30, y, label)
        c.setFillColor(text_dark)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(180, y, str(value))
        y -= 20

    # Amount box
    y -= 15
    c.setFillColor(HexColor("#F3E5F5"))
    c.roundRect(30, y - 30, width - 60, 45, 8, fill=True, stroke=False)
    c.setFillColor(primary)
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(width / 2, y - 15, f"Total Paid: Rs.{payment.amount:,.2f}")

    # Footer
    c.setFillColor(text_light)
    c.setFont("Helvetica", 8)
    c.drawCentredString(width / 2, 40, f"This is a computer-generated receipt. Receipt ID: {receipt_no}")
    c.drawCentredString(width / 2, 28, f"Generated on {datetime.utcnow().strftime('%d %b %Y at %I:%M %p UTC')}")

    c.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="receipt_{receipt_no}.pdf"'},
    )

# ---------------------------------------------------------------------------
# Razorpay Payment Endpoints
# ---------------------------------------------------------------------------

from pydantic import BaseModel as _BaseModel

class _RazorpayOrderResponse(_BaseModel):
    razorpay_order_id: str
    amount: float          # in rupees (for display)
    amount_paise: int      # in paise (for SDK)
    currency: str
    key_id: str            # public key – safe to send to mobile


class _RazorpayVerifyRequest(_BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@router.post("/{bill_id}/create-razorpay-order", response_model=_RazorpayOrderResponse)
def create_razorpay_order(
    bill_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Step 1 of Razorpay checkout flow.
    Creates a Razorpay Order for the given bill and returns the order details
    required by the Razorpay mobile SDK to present the payment sheet.
    """
    from app.services.razorpay_service import create_order
    import os

    bill = db.query(Bill).filter(Bill.id == bill_id, Bill.is_active == True).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    # Check the resident hasn't already paid
    if current_user.role == "resident":
        existing = db.query(BillPayment).filter(
            BillPayment.bill_id == bill_id,
            BillPayment.user_id == current_user.id,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="You have already paid this bill")

    amount = _get_resident_bill_amount(bill, current_user, db) if current_user.role == "resident" else bill.amount

    receipt = f"BILL-{bill_id[:20]}"
    order = create_order(
        amount_rupees=amount,
        receipt=receipt,
        notes={"bill_id": bill_id, "user_id": current_user.id},
    )

    return _RazorpayOrderResponse(
        razorpay_order_id=order["id"],
        amount=amount,
        amount_paise=order["amount"],
        currency=order["currency"],
        key_id=(os.getenv("RAZORPAY_KEY_ID") or "").strip(),
    )


@router.post("/{bill_id}/verify-razorpay-payment", response_model=BillPaymentOut)
def verify_razorpay_payment(
    bill_id: str,
    body: _RazorpayVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Step 2 of Razorpay checkout flow.
    Called by the mobile app after the Razorpay SDK returns a success callback.
    Verifies the HMAC-SHA256 signature to prevent tampered/faked payments,
    then records the payment in the database exactly like the existing pay endpoint.
    """
    from app.services.razorpay_service import verify_payment_signature

    # Do NOT filter on is_active — the bill may have just been auto-archived
    # by a prior request, but the payment signature is still valid and should be recorded.
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    # Security gate – raises 400 if signature is invalid
    verify_payment_signature(
        razorpay_order_id=body.razorpay_order_id,
        razorpay_payment_id=body.razorpay_payment_id,
        razorpay_signature=body.razorpay_signature,
    )

    # Compute the correct amount for this resident
    amount = _get_resident_bill_amount(bill, current_user, db) if current_user.role == "resident" else bill.amount

    # Record the payment (same as existing manual payment flow)
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

    # Auto-archive only when ALL non-excluded residents have paid
    if _is_all_residents_paid(bill, db):
        bill.is_active = False
        db.commit()

    # Push notification to admin
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
        pass  # Don't fail the payment if notification fails

    return BillPaymentOut.model_validate(payment)
