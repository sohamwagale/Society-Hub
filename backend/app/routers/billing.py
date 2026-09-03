# Import standard OS module for file path manipulations
import os
# Import uuid for unique record IDs
import uuid
# Import date/datetime for handling bill due dates and payment timestamps
from datetime import date, datetime
# Import Optional for type hinting nullable fields
from typing import Optional
# Import FastAPI components for routing, dependencies, errors, and file uploads
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
# Import SQLAlchemy Session for DB operations
from sqlalchemy.orm import Session
# Import the database session utility
from app.database import get_db
# Import core models for billing, payments, and associations
from app.models.user import User, ResidentType
from app.models.flat import Flat
from app.models.billing import Bill, BillPayment, BillType, BillStatus, BillFlatAmount
# Import Pydantic schemas for data validation
from app.schemas.billing import BillCreate, BillOut, BillUpdate, BillPaymentCreate, BillPaymentOut
# Import authentication utilities for role and session management
from app.utils.auth import get_current_user, require_role
# Import file storage utility for uploading receipts
from app.utils.storage import upload_file
# Import notification service to broadcast bill alerts
from app.services.notification_service import notify_all_residents, create_notification
# Import notification type enum
from app.models.notification import NotificationType

# Initialize the router with prefix and tags
router = APIRouter(prefix="/api/bills", tags=["Billing"])


# ── Internal Helper: Payment Status Computation ──
def _get_payment_status(bill: Bill, user: User, db: Session) -> str:
    """
    Computes the status of a bill (paid/due/overdue) relative to a specific user or context.
    """
    # ── Admin Context: Compute aggregate status across the society ──
    if user.role == "admin":
        # Start by finding all residents in the system
        residents_query = db.query(User).filter(User.role == "resident")
        # Filter by society if specified
        if bill.society_id:
            residents_query = residents_query.filter(User.society_id == bill.society_id)
        # Select only those residents who have passed onboarding
        all_residents = [u for u in residents_query.all() if u.is_fully_approved]
        # Retrieve all payment records for this specific bill
        payments = db.query(BillPayment).filter(BillPayment.bill_id == bill.id).all()
        # Create a set of user IDs who have paid
        paid_user_ids = {p.user_id for p in payments}

        # Identify which flats have been "cleared" by any resident paying
        paid_flat_ids = set()
        for u in db.query(User).filter(User.id.in_(paid_user_ids)).all():
            if u.flat_id:
                paid_flat_ids.add(u.flat_id)

        # Track state across the society's flats
        seen_flats = set()
        total_owing = 0
        total_paid = 0
        for u in all_residents:
            # Use flat ID as primary key, or user ID for unassigned residents
            flat_key = u.flat_id or u.id
            if flat_key in seen_flats:
                continue
            seen_flats.add(flat_key)
            # Check the actual amount assigned to this specific resident/flat
            actual_amount = _get_resident_bill_amount(bill, u, db)
            if actual_amount == 0:
                continue  # Resident is excluded from this billing cycle
            total_owing += 1
            # Check if this user or their flatmate has paid
            if (u.id in paid_user_ids) or (u.flat_id and u.flat_id in paid_flat_ids):
                total_paid += 1

        # Determine aggregate status
        if total_owing > 0 and total_paid >= total_owing:
            return "paid"
        if bill.due_date < date.today():
            return "overdue"
        return "due"

    # ── Resident Context: Check status for their own household ──
    if not user.flat_id:
        # If user isn't in a flat, check their individual payment
        payment = db.query(BillPayment).filter(
            BillPayment.bill_id == bill.id, BillPayment.user_id == user.id
        ).first()
    else:
        # Find all users currently living in the same flat
        flat_users = db.query(User).filter(User.flat_id == user.flat_id).all()
        flat_user_ids = [u.id for u in flat_users]
        # Check if ANY of them made the payment for this bill
        payment = db.query(BillPayment).filter(
            BillPayment.bill_id == bill.id, BillPayment.user_id.in_(flat_user_ids)
        ).first()

    # Determine individual/flat status
    if payment:
        return "paid"
    if bill.due_date < date.today():
        return "overdue"
    return "due"


# ── Internal Helper: Resident-Specific Amount Calculation ──
def _get_resident_bill_amount(bill: Bill, user: User, db: Session) -> float:
    """
    Returns the final numeric amount a resident owes for a bill, accounting for overrides.
    """
    if not user.flat_id:
        # Return default bill amount if no flat link exists
        return bill.amount
    # Search for an explicit override for this specific bill-flat combination
    override = db.query(BillFlatAmount).filter(
        BillFlatAmount.bill_id == bill.id,
        BillFlatAmount.flat_id == user.flat_id
    ).first()
    # Return override if found, otherwise the base amount
    if override:
        return override.amount
    return bill.amount


# ── Internal Helper: Global Payment Completion Check ──
def _is_all_residents_paid(bill: Bill, db: Session) -> bool:
    """
    Returns True ONLY when every non-excluded resident (unique per flat) has cleared the bill.
    Used for automatic archiving.
    """
    # Fetch all potentially owing residents
    residents_query = db.query(User).filter(User.role == "resident")
    if bill.society_id:
        residents_query = residents_query.filter(User.society_id == bill.society_id)
    all_residents = [u for u in residents_query.all() if u.is_fully_approved]
    # Fetch all payments made so far
    payments = db.query(BillPayment).filter(BillPayment.bill_id == bill.id).all()
    paid_user_ids = {p.user_id for p in payments}

    # Map payments to flats
    paid_flat_ids: set = set()
    for u in db.query(User).filter(User.id.in_(paid_user_ids)).all():
        if u.flat_id:
            paid_flat_ids.add(u.flat_id)

    # Track completion count
    seen_flats: set = set()
    total_owing = 0
    total_paid = 0
    for u in all_residents:
        flat_key = u.flat_id or u.id
        if flat_key in seen_flats:
            continue
        seen_flats.add(flat_key)
        # Skip residents who owe 0 for this bill
        if _get_resident_bill_amount(bill, u, db) == 0:
            continue
        total_owing += 1
        # Check if paid by self or flatmate
        if (u.id in paid_user_ids) or (u.flat_id and u.flat_id in paid_flat_ids):
            total_paid += 1

    # Return true if the "Paid" cohort matches the "Owing" cohort
    return total_owing > 0 and total_paid >= total_owing


# ── Bill Management Endpoints ──

# POST endpoint to generate a new society-wide bill (Admin only)
@router.post("", response_model=BillOut, status_code=201)
def create_bill(
    data: BillCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    # Initialize the base Bill record
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
    # add to session context
    db.add(bill)
    # Commit to get ID reference
    db.commit()
    # reload
    db.refresh(bill)

    # If the admin provided specific overrides for individual flats
    if data.flat_overrides:
        for override in data.flat_overrides:
            # Create a BillFlatAmount record for each override
            flat_amount = BillFlatAmount(
                bill_id=bill.id,
                flat_id=override.flat_id,
                amount=override.amount
            )
            db.add(flat_amount)
        # Commit the override batch
        db.commit()

    # ── Notification Broadcast ──
    # Alert all active residents of the society about the new bill
    notify_all_residents(
        db, f"New Bill: {bill.title}",
        f"Amount: Rs.{bill.amount} | Due: {bill.due_date}",
        NotificationType.BILL, bill.id,
        society_id=admin.society_id,
    )

    # Validate model and inject initial status for response
    result = BillOut.model_validate(bill)
    result.payment_status = "due"
    return result

# GET endpoint to list all bills for the user's society
@router.get("", response_model=list[BillOut])
def list_bills(
    bill_type: Optional[str] = Query(None),
    active_only: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Base query filtered by the current user's society
    query = db.query(Bill).filter(Bill.society_id == current_user.society_id)
    # Optional filter by category (Maintenance, Electricity, etc.)
    if bill_type:
        query = query.filter(Bill.bill_type == BillType(bill_type))
    # Optional filter by active status (archived vs non-archived)
    if active_only is not None:
        query = query.filter(Bill.is_active == active_only)
    
    # Retrieve sorted results
    bills = query.order_by(Bill.created_at.desc()).all()

    results = []
    for bill in bills:
        actual_amount = bill.amount
        # Logic for residents: determine specific amount and exclude if they owe 0
        if current_user.role == "resident":
            actual_amount = _get_resident_bill_amount(bill, current_user, db)
            if actual_amount == 0:
                continue
                
        # Validate output schema
        out = BillOut.model_validate(bill)
        # Override displayed amount with flat-specific amount
        out.amount = actual_amount
        # Dynamically compute the payment status label
        out.payment_status = _get_payment_status(bill, current_user, db)
        results.append(out)
    return results


# ── Advanced Report Exporting ──

# GET endpoint to generate a PDF summary of billed and unpaid amounts
@router.get("/export-report")
def export_bills_report(
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Generate a high-premium PDF report of active bills with flat-wise payment statuses."""
    # Import necessary PDF and auth libs inside the handler for performance/cold-start optimization
    from app.models.flat import Flat
    from app.models.society import Society
    from jose import jwt, JWTError
    from app.utils.auth import SECRET_KEY, ALGORITHM
    # ReportLab imports for sophisticated PDF generation
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.colors import HexColor
    from reportlab.pdfgen import canvas as pdf_canvas
    from reportlab.lib.units import mm
    from io import BytesIO
    from fastapi.responses import StreamingResponse

    # ── Security Check (via Query String for Browser Links) ──
    if not token:
        # Reject if no auth token provided
        raise HTTPException(status_code=401, detail="Authentication required. Provide ?token= query parameter.")
    try:
        # Decode JWT to identify the requester
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        # Handle expired or corrupted tokens
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token")

    # Fetch user from DB and verify ADMIN privileges
    current_user = db.query(User).filter(User.id == user_id).first()
    if not current_user or current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Administrative access is required for report generation")

    # ── Data Collection ──
    # Retrieve all bills currently in active status for the society
    active_bills = (
        db.query(Bill)
        .filter(Bill.is_active == True, Bill.society_id == current_user.society_id)
        .order_by(Bill.due_date.desc())
        .all()
    )
    # check for empty set
    if not active_bills:
        raise HTTPException(status_code=404, detail="No active billing cycles found for this society")

    # Identify all flats that have at least one approved resident
    from app.models.flat import Flat as FlatModel
    flats = (
        db.query(Flat)
        .join(FlatModel.residents)
        .filter(User.society_id == current_user.society_id)
        .distinct()
        .order_by(Flat.block, Flat.flat_number)
        .all()
    )
    # load society name for the header
    society = db.query(Society).filter(Society.id == current_user.society_id).first()
    society_name = society.name if society else "The Society"

    # Iterate through all flats to build a detailed spreadsheet-like structure
    flat_rows = []
    for flat in flats:
        # Format display label (e.g. A-101)
        flat_label = f"{flat.block}-{flat.flat_number}"
        # Filter for fully onboarded residents only
        flat_resident_ids = [u.id for u in flat.residents if u.is_fully_approved]
        if not flat_resident_ids:
            continue

        # Identify a primary name to show for the flat (Owner or any resident)
        owner = next((u for u in flat.residents if u.resident_type == 'owner' and u.is_fully_approved), None)
        owner_name = owner.name if owner else (flat.residents[0].name if flat.residents else "Occupant")

        # row init
        row = {"flat": flat_label, "owner": owner_name, "bills": {}, "total_due": 0.0}
        for bill in active_bills:
            # check for flat-specific overrides or exclusions
            override = db.query(BillFlatAmount).filter(
                BillFlatAmount.bill_id == bill.id,
                BillFlatAmount.flat_id == flat.id
            ).first()
            # If set to zero, the flat is explicitly excluded from this bill
            if override and override.amount == 0:
                row["bills"][bill.id] = {"status": "excluded", "amount": 0}
                continue
            # final amount for this flat
            bill_amount = override.amount if override else bill.amount

            # Check if anyone in the household has recorded a payment for this bill
            payment = db.query(BillPayment).filter(
                BillPayment.bill_id == bill.id,
                BillPayment.user_id.in_(flat_resident_ids)
            ).first()

            # Record status and amount paid/unpaid
            if payment:
                row["bills"][bill.id] = {"status": "paid", "amount": bill_amount}
            else:
                row["bills"][bill.id] = {"status": "due", "amount": bill_amount}
                # tally up non-paid items
                row["total_due"] += bill_amount

        flat_rows.append(row)


    # ── PDF Content Prep ──
    # Filter out bills that have already been fully paid by all residents
    incomplete_bills = []
    for bill in active_bills:
        # Count settlements for this bill
        paid_count = sum(1 for fr in flat_rows if bill.id in fr["bills"] and fr["bills"][bill.id]["status"] == "paid")
        # Count potential payers for this bill
        total_count = sum(1 for fr in flat_rows if bill.id in fr["bills"] and fr["bills"][bill.id]["status"] != "excluded")
        # Include in report only if there's outstanding money
        if total_count > 0 and paid_count < total_count:
            incomplete_bills.append(bill)

    # Handle scenario where everything is settled
    if not incomplete_bills:
        raise HTTPException(status_code=404, detail="No active billing cycles with outstanding payments were found.")
        
    # Focus report on these incomplete items
    active_bills = incomplete_bills

    # ── Final PDF Layout Generation ──
    buffer = BytesIO()
    # Use landscape A4 for complex tables
    page_size = landscape(A4)
    # Initialize ReportLab canvas
    c = pdf_canvas.Canvas(buffer, pagesize=page_size)
    W, H = page_size

    # Define a premium color palette
    primary = HexColor("#311B92")  # Deep Indigo
    white = HexColor("#FFFFFF")
    text_dark = HexColor("#1A1A2E")
    text_light = HexColor("#555555")
    green = HexColor("#2E7D32")
    red = HexColor("#C62828")
    grey_bg = HexColor("#F5F5F5")
    border = HexColor("#CCCCCC")

    # Helper: Draw consistent page headers
    def draw_header(canvas, page_num=1):
        # Header background bar
        canvas.setFillColor(primary)
        canvas.rect(0, H - 70, W, 70, fill=True, stroke=False)
        # Title text
        canvas.setFillColor(white)
        canvas.setFont("Helvetica-Bold", 18)
        canvas.drawString(30, H - 40, f"{society_name} — Comprehensive Billing Report")
        # Meta info
        canvas.setFont("Helvetica", 10)
        canvas.drawString(30, H - 56, f"Generated: {datetime.utcnow().strftime('%d %b %Y, %I:%M %p UTC')}")
        # Summary stats in header
        canvas.drawRightString(W - 30, H - 40, f"Monitored Bills: {len(active_bills)}")
        canvas.drawRightString(W - 30, H - 56, f"Page {page_num}")

    # Helper: Draw page footers
    def draw_footer(canvas):
        canvas.setFillColor(text_light)
        canvas.setFont("Helvetica", 7)
        canvas.drawCentredString(W / 2, 15, "Automated system report. All amounts in Indian Rupees (Rs.).")

    # ── Report Section 1: Billing Catalog Summary ──
    draw_header(c, 1)
    y = H - 100

    c.setFillColor(text_dark)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(30, y, "Active Billing Cycles")
    y -= 25

    # Define column horizontal positions
    col_x = [30, 230, 370, 480, 600]
    headers = ["Bill Title", "Category / Type", "Base Amount", "Due Date", "Settlement Ratio"]
    # Draw header bar for the table
    c.setFillColor(primary)
    c.rect(25, y - 5, W - 50, 20, fill=True, stroke=False)
    # Draw header labels
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 9)
    for i, h in enumerate(headers):
        c.drawString(col_x[i], y, h)
    y -= 22

    # Plot each bill in the summary table
    for idx, bill in enumerate(active_bills):
        # Check for page overflow
        if y < 50:
            draw_footer(c)
            c.showPage()
            draw_header(c, 2)
            y = H - 100

        # Implement zebra-striping for readability
        if idx % 2 == 0:
            c.setFillColor(grey_bg)
            c.rect(25, y - 5, W - 50, 18, fill=True, stroke=False)

        # Calculate counts for this specific bill
        paid_count = sum(1 for fr in flat_rows if bill.id in fr["bills"] and fr["bills"][bill.id]["status"] == "paid")
        total_count = sum(1 for fr in flat_rows if bill.id in fr["bills"] and fr["bills"][bill.id]["status"] != "excluded")

        c.setFillColor(text_dark)
        c.setFont("Helvetica", 9)
        # Truncate long titles
        title_display = bill.title[:30] + "..." if len(bill.title) > 30 else bill.title
        c.drawString(col_x[0], y, title_display)
        # Format enum value
        c.drawString(col_x[1], y, (bill.bill_type.value if bill.bill_type else "-").title())
        # Format currency
        c.drawString(col_x[2], y, f"{bill.amount:,.0f}")
        # Format date
        c.drawString(col_x[3], y, bill.due_date.strftime("%d %b %Y") if bill.due_date else "-")

        # Color-code the payment completion ratio
        if paid_count == total_count and total_count > 0:
            c.setFillColor(green)  # 100% complete
        elif paid_count == 0:
            c.setFillColor(red)    # 0% complete
        else:
            c.setFillColor(HexColor("#E65100")) # Partial
        c.setFont("Helvetica-Bold", 9)
        c.drawString(col_x[4], y, f"{paid_count} / {total_count}")

        y -= 20

    # ── Report Section 2: Interactive Flat-wise Ledger ──
    draw_footer(c)
    # Transition to new section
    c.showPage()
    page_num = 2
    draw_header(c, page_num)
    y = H - 100

    c.setFillColor(text_dark)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(30, y, "Unit-wise Payment Ledger")
    y -= 25

    # ── Pagination for Wide Columns ──
    # If there are many active bills, split them across multiple pages horizontally
    max_bills_per_page = 6
    bill_chunks = [active_bills[i:i + max_bills_per_page] for i in range(0, len(active_bills), max_bills_per_page)]

    for chunk_idx, bill_chunk in enumerate(bill_chunks):
        # Handle secondary ledger pages
        if chunk_idx > 0:
            draw_footer(c)
            c.showPage()
            page_num += 1
            draw_header(c, page_num)
            y = H - 100

        # Calculate reactive column widths
        num_cols = len(bill_chunk) + 2
        flat_col_width = (W - 60) * 2 / (num_cols + 1)
        other_col_width = (W - 60 - flat_col_width) / (num_cols - 1)
        col_starts = [30]
        for i in range(1, num_cols):
            col_starts.append(30 + flat_col_width + (i - 1) * other_col_width)

        # Ledger Section Table Header
        c.setFillColor(primary)
        c.rect(25, y - 5, W - 50, 20, fill=True, stroke=False)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(col_starts[0], y, "Flat Information")
        for bi, bill in enumerate(bill_chunk):
            # Shorten column labels for bills
            label = bill.title[:12] + ".." if len(bill.title) > 12 else bill.title
            c.drawString(col_starts[bi + 1], y, label)
        c.drawString(col_starts[-1], y, "Balance (Rs.)")
        y -= 20

        # Plot each flat unit as a row in the ledger
        for ridx, fr in enumerate(flat_rows):
            # Mid-ledger page break
            if y < 50:
                draw_footer(c)
                c.showPage()
                page_num += 1
                draw_header(c, page_num)
                y = H - 100

            # Line striping
            if ridx % 2 == 0:
                c.setFillColor(grey_bg)
                c.rect(25, y - 5, W - 50, 18, fill=True, stroke=False)

            c.setFont("Helvetica-Bold", 9)
            c.setFillColor(text_dark)
            # Display Flat + Owner identification
            flat_display = fr["flat"]
            if fr["owner"]:
                flat_display += f" ({fr['owner'][:15]})"
            c.drawString(col_starts[0], y, flat_display)

            # Plot payment checkmark or cross for each bill column
            c.setFont("Helvetica", 8)
            for bi, bill in enumerate(bill_chunk):
                bill_info = fr["bills"].get(bill.id)
                if not bill_info or bill_info["status"] == "excluded":
                    # Dash for non-relevant bills
                    c.setFillColor(text_light)
                    c.drawString(col_starts[bi + 1], y, "—")
                elif bill_info["status"] == "paid":
                    # Green Check with Amount
                    c.setFillColor(green)
                    c.drawString(col_starts[bi + 1], y, f"✓ {bill_info['amount']:,.0f}")
                else:
                    # Red Cross with Amount
                    c.setFillColor(red)
                    c.drawString(col_starts[bi + 1], y, f"✗ {bill_info['amount']:,.0f}")

            # Final Balance Column for this flat
            c.setFont("Helvetica-Bold", 9)
            if fr["total_due"] > 0:
                c.setFillColor(red)
            else:
                c.setFillColor(green)
            # Display total owed across all active bills
            c.drawString(col_starts[-1], y, f"{fr['total_due']:,.0f}")

            y -= 18

    # ── Final Totals & Grand Summary ──
    y -= 10
    # ensure room for the final summary box
    if y < 60:
        draw_footer(c)
        c.showPage()
        page_num += 1
        draw_header(c, page_num)
        y = H - 100

    # Aggregate global statistics
    grand_due = sum(fr["total_due"] for fr in flat_rows)
    grand_paid = sum(
        info["amount"]
        for fr in flat_rows
        for info in fr["bills"].values()
        if info["status"] == "paid"
    )

    # Separation line
    c.setStrokeColor(border)
    c.setLineWidth(1)
    c.line(30, y + 5, W - 30, y + 5)
    y -= 15

    # Display Grand Summary metrics
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(text_dark)
    c.drawString(30, y, f"Total Revenue Collected: ")
    c.setFillColor(green)
    c.drawString(165, y, f"Rs.{grand_paid:,.2f}")

    c.setFillColor(text_dark)
    c.drawString(340, y, f"Total Outstanding Dues: ")
    c.setFillColor(red)
    c.drawString(485, y, f"Rs.{grand_due:,.2f}")

    # Finalize and close the PDF stream
    draw_footer(c)
    c.save()
    buffer.seek(0)

    # Return the stream as a downloadable file with appropriate headers
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="society_billing_report_{date.today().isoformat()}.pdf"'},
    )


# ── Individual Bill Retrieval ──

# GET endpoint to fetch detailed data for a single bill
@router.get("/{bill_id}", response_model=BillOut)
def get_bill(bill_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Find the bill record
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    # Context-aware logic for residents
    if current_user.role == "resident":
        # Resolve specific amount for this resident
        actual_amount = _get_resident_bill_amount(bill, current_user, db)
        # If resident is explicitly excluded, treat as not found for them
        if actual_amount == 0:
            raise HTTPException(status_code=404, detail="Bill record not applicable to your unit")
        # Validate schema
        out = BillOut.model_validate(bill)
        # Apply local amount
        out.amount = actual_amount
    else:
        # Admins see the base amount in the detail view
        out = BillOut.model_validate(bill)
        
    # Inject computed payment status
    out.payment_status = _get_payment_status(bill, current_user, db)
    return out


# ── Detailed Payment Tracking (Admin View) ──

# GET endpoint for admins to see every resident's status for a specific bill
@router.get("/{bill_id}/residents")
def get_bill_residents(
    bill_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Retrieves a list of all society flats and matches them with their payment status for a specific bill."""
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill record not found")

    # Fetch all physical flats in the society
    flats = (
        db.query(Flat)
        .filter(Flat.society_id == bill.society_id)
        .order_by(Flat.block, Flat.flat_number)
        .all()
    )

    # Retrieve all payments recorded for this bill
    payments = db.query(BillPayment).filter(BillPayment.bill_id == bill_id).all()
    paid_user_ids = {p.user_id for p in payments}

    # Identify all flat IDs that are considered "Paid"
    paid_flat_ids = set()
    for user in db.query(User).filter(User.id.in_(paid_user_ids)).all():
        if user.flat_id:
            paid_flat_ids.add(user.flat_id)

    results = []
    for flat in flats:
        # Only include flats that have settled this bill (one entry of payment per flat)
        is_paid = flat.id in paid_flat_ids
        if not is_paid:
            continue

        # Find primary owner or active resident in this flat
        owner = next(
            (u for u in flat.residents if u.resident_type == ResidentType.OWNER and u.is_fully_approved),
            None,
        )
        if not owner:
            owner = next((u for u in flat.residents if u.is_fully_approved), None)

        actual_amount = _get_resident_bill_amount(bill, owner, db) if owner else bill.amount
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


# ── Payment Processing ──

# POST endpoint for residents to record a payment transaction
@router.post("/pay", response_model=BillPaymentOut, status_code=201)
def pay_bill(
    data: BillPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # check bill existence
    bill = db.query(Bill).filter(Bill.id == data.bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="The specified bill does not exist")

    # verify bill hasn't been paid by this household already
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

    # block double payments
    if existing:
        raise HTTPException(status_code=400, detail="This bill has already been settled by your unit")

    # Re-verify the expected amount for this specific payer
    expected_amount = _get_resident_bill_amount(bill, current_user, db)
    # block excluded users from paying
    if expected_amount == 0:
        raise HTTPException(status_code=400, detail="Your unit is not assigned to this billing cycle")

    # create the payment record
    payment = BillPayment(
        id=str(uuid.uuid4()),
        bill_id=data.bill_id,
        user_id=current_user.id,
        amount=expected_amount,
        payment_method=data.payment_method,
        transaction_ref=data.transaction_ref,
    )
    # add to DB
    db.add(payment)
    # commit
    db.commit()
    # reload
    db.refresh(payment)

    # trigger check: if this was the last payment needed, archive the bill automatically
    if _is_all_residents_paid(bill, db):
        bill.is_active = False
        db.commit()

    # return payment confirmation
    return payment


# GET endpoint for users to see only their own payment ledger
@router.get("/payments/history", response_model=list[BillPaymentOut])
def payment_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # retrieve and return all payments made by this account, newest first
    return (
        db.query(BillPayment)
        .filter(BillPayment.user_id == current_user.id)
        .order_by(BillPayment.paid_at.desc())
        .all()
    )


# POST endpoint to associate a digital receipt image with a payment record
@router.post("/{payment_id}/upload-receipt")
async def upload_receipt(
    payment_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # locate the relevant payment record, ensuring user owns it
    payment = db.query(BillPayment).filter(
        BillPayment.id == payment_id, BillPayment.user_id == current_user.id
    ).first()
    # check for payment existence
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found or access denied")

    # isolate file extension
    ext = os.path.splitext(file.filename)[1]
    # generate cloud storage path
    filename = f"{payment_id}{ext}"
    content_type = file.content_type or "application/octet-stream"
    # buffer the file stream
    data = await file.read()
    # process the upload to cloud storage
    payment.receipt_path = upload_file("bill-receipts", filename, data, content_type)
    # save the reference URL in the DB
    db.commit()
    # return the final path
    return {"receipt_path": payment.receipt_path}


# ── Bill Configuration Updates ──

# PUT endpoint to modify existing bill details (Admin only)
@router.put("/{bill_id}")
async def update_bill(
    bill_id: str,
    payload: BillUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    # locate the bill record
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill record not found")

    # iterate through patch payload
    for field, value in payload.model_dump(exclude_none=True).items():
        if field == "bill_type":
            # Cast type string to enum
            setattr(bill, field, BillType(value))
        else:
            # apply standard fields (title, amount, due_date, etc.)
            setattr(bill, field, value)
    
    # save changes
    db.commit()
    # reload fresh state
    db.refresh(bill)
    # return updated bill
    return bill


# ── Bill Deletion ──

# DELETE endpoint to remove a bill (Admin only)
@router.delete("/{bill_id}")
async def delete_bill(
    bill_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    # locate record
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill record not found")

    # safety check: block deletion if any payments have been recorded
    payments = db.query(BillPayment).filter(BillPayment.bill_id == bill_id).count()
    if payments > 0:
        raise HTTPException(status_code=400, detail="Audit restriction: Cannot delete a bill that has associated payment records")

    # remove from DB
    db.delete(bill)
    # commit deletion
    db.commit()
    # confirm success
    return {"detail": "Bill successfully removed from the system"}


# ── Digital Receipt Generation ──

# GET endpoint to generate a professional PDF receipt for a specific payment
@router.get("/{payment_id}/receipt")
def download_receipt(
    payment_id: str,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Generates a high-quality, printable PDF receipt for a successful payment.
    Supports token-in-query for direct browser access.
    """
    # Import necessary models and PDF tools inside the scope
    from app.models.society import Society
    from jose import jwt, JWTError
    from app.utils.auth import SECRET_KEY, ALGORITHM
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.colors import HexColor
    from reportlab.pdfgen import canvas as pdf_canvas
    from io import BytesIO
    from fastapi.responses import StreamingResponse

    # ── Authenticate Requester ──
    if token:
        try:
            # decode the access token
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(status_code=401, detail="Identification missing from token")
        except JWTError:
            raise HTTPException(status_code=401, detail="Authentication failed: Token is invalid or expired")
        
        # confirm the user is valid
        current_user = db.query(User).filter(User.id == user_id).first()
        if not current_user:
            raise HTTPException(status_code=401, detail="Authenticated user not found in the archives")
    else:
        # Require token query param for direct link functionality (e.g. mobile app download)
        raise HTTPException(status_code=401, detail="Authentication required. Provide ?token= query parameter.")

    # ── Verify Resource Ownership ──
    # Locate the target payment record
    payment = db.query(BillPayment).filter(
        BillPayment.id == payment_id, BillPayment.user_id == current_user.id
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found or access restricted")

    # Locate the parent bill record
    bill = db.query(Bill).filter(Bill.id == payment.bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Parent bill record is missing")

    # Get society details for branding
    society = db.query(Society).filter(Society.id == current_user.society_id).first()
    society_name = society.name if society else "Society Hub"
    society_address = society.address if society and society.address else "Address missing from profile"

    # ── PDF Initialization ──
    buffer = BytesIO()
    c = pdf_canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # ── Color Palette ──
    brand_primary = HexColor("#1E1B4B")   # Indigo 950
    brand_accent = HexColor("#4F46E5")    # Indigo 600
    brand_light = HexColor("#EEF2FF")     # Indigo 50
    text_main = HexColor("#0F172A")       # Slate 900
    text_muted = HexColor("#64748B")      # Slate 500
    card_bg = HexColor("#F8FAFC")         # Slate 50
    border_color = HexColor("#E2E8F0")    # Slate 200
    success_bg = HexColor("#DCFCE7")      # Emerald 100
    success_text = HexColor("#166534")    # Emerald 800

    receipt_no = f"SH-{payment.id[:8].upper()}"

    # ── 1. Top Header Banner ──
    c.setFillColor(brand_primary)
    c.roundRect(36, height - 120, width - 72, 85, 10, fill=True, stroke=False)

    # Accent Stripe
    c.setFillColor(brand_accent)
    c.roundRect(36, height - 120, 6, 85, 3, fill=True, stroke=False)

    # Header Left: Society Identity
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 17)
    c.drawString(55, height - 60, society_name.upper()[:32])

    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(HexColor("#A5B4FC"))
    c.drawString(55, height - 74, "SOCIETY MANAGEMENT SYSTEM")

    c.setFont("Helvetica", 8.5)
    c.setFillColor(HexColor("#CBD5E1"))
    c.drawString(55, height - 90, society_address[:55] if society_address else "")

    # Header Right: Receipt Tag
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(HexColor("#FFFFFF"))
    c.drawRightString(width - 55, height - 58, "PAYMENT RECEIPT")

    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(HexColor("#C7D2FE"))
    c.drawRightString(width - 55, height - 74, f"Receipt No: {receipt_no}")

    c.setFont("Helvetica", 8.5)
    c.setFillColor(HexColor("#E2E8F0"))
    c.drawRightString(width - 55, height - 90, f"Issued: {payment.paid_at.strftime('%d %b %Y, %I:%M %p')}")

    # ── 2. Payment Verified Badge ──
    y = height - 150
    c.setFillColor(success_bg)
    c.setStrokeColor(HexColor("#86EFAC"))
    c.setLineWidth(1)
    c.roundRect(36, y - 5, 175, 24, 6, fill=True, stroke=True)

    c.setFillColor(success_text)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(50, y + 2, "✔ PAYMENT VERIFIED & PAID")

    # ── 3. Two-Column Metadata Cards ──
    card_top = y - 40
    card_h = 100

    # Card 1 (Left): Resident Details
    c.setFillColor(card_bg)
    c.setStrokeColor(border_color)
    c.setLineWidth(1)
    c.roundRect(36, card_top - card_h, 250, card_h, 8, fill=True, stroke=True)

    c.setFillColor(HexColor("#475569"))
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(50, card_top - 18, "BILLED TO / RESIDENT DETAILS")

    c.setStrokeColor(HexColor("#CBD5E1"))
    c.setLineWidth(0.5)
    c.line(50, card_top - 23, 270, card_top - 23)

    flat_str = f"Block {current_user.flat.block} - Flat {current_user.flat.flat_number}" if current_user.flat else "Standalone Unit"

    c.setFont("Helvetica-Bold", 9.5)
    c.setFillColor(text_main)
    c.drawString(50, card_top - 38, current_user.name[:30])

    c.setFont("Helvetica", 8.5)
    c.setFillColor(text_muted)
    c.drawString(50, card_top - 54, f"Unit: {flat_str}")
    c.drawString(50, card_top - 68, f"Email: {current_user.email[:30]}")
    if hasattr(current_user, 'phone') and current_user.phone:
        c.drawString(50, card_top - 82, f"Phone: {current_user.phone}")

    # Card 2 (Right): Payment Details
    c.setFillColor(card_bg)
    c.setStrokeColor(border_color)
    c.setLineWidth(1)
    c.roundRect(300, card_top - card_h, width - 336, card_h, 8, fill=True, stroke=True)

    c.setFillColor(HexColor("#475569"))
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(314, card_top - 18, "TRANSACTION INFORMATION")

    c.setStrokeColor(HexColor("#CBD5E1"))
    c.setLineWidth(0.5)
    c.line(314, card_top - 23, width - 50, card_top - 23)

    method_str = (payment.payment_method or "Online Settlement").replace("_", " ").title()
    ref_str = payment.transaction_ref or "Bank Transfer Ref"

    c.setFont("Helvetica", 8.5)
    c.setFillColor(text_muted)
    c.drawString(314, card_top - 38, "Transaction Ref:")
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(text_main)
    c.drawString(395, card_top - 38, ref_str[:22])

    c.setFont("Helvetica", 8.5)
    c.setFillColor(text_muted)
    c.drawString(314, card_top - 54, "Payment Method:")
    c.setFont("Helvetica", 8.5)
    c.setFillColor(text_main)
    c.drawString(395, card_top - 54, method_str)

    c.setFont("Helvetica", 8.5)
    c.setFillColor(text_muted)
    c.drawString(314, card_top - 68, "Payment Date:")
    c.setFont("Helvetica", 8.5)
    c.setFillColor(text_main)
    c.drawString(395, card_top - 68, payment.paid_at.strftime('%d %b %Y, %I:%M %p'))

    # ── 4. Itemized Summary Table ──
    table_top = card_top - card_h - 30
    c.setFillColor(text_main)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(36, table_top, "Itemized Charge Details")

    # Table Header
    y = table_top - 20
    c.setFillColor(HexColor("#F1F5F9"))
    c.roundRect(36, y - 5, width - 72, 22, 4, fill=True, stroke=False)

    c.setFillColor(HexColor("#334155"))
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(50, y + 2, "BILL TITLE & DESCRIPTION")
    c.drawString(314, y + 2, "BILL TYPE")
    c.drawRightString(width - 50, y + 2, "AMOUNT (Rs.)")

    # Table Data Row
    y -= 25
    c.setFont("Helvetica-Bold", 9.5)
    c.setFillColor(text_main)
    c.drawString(50, y, bill.title[:38])

    b_type = (bill.bill_type.value if bill.bill_type else "Maintenance").replace("_", " ").title()
    c.setFont("Helvetica", 8.5)
    c.setFillColor(text_muted)
    c.drawString(314, y, b_type)

    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(text_main)
    c.drawRightString(width - 50, y, f"Rs. {payment.amount:,.2f}")

    if bill.description:
        y -= 14
        c.setFont("Helvetica-Oblique", 8)
        c.setFillColor(text_muted)
        c.drawString(50, y, bill.description[:70])

    y -= 15
    c.setStrokeColor(border_color)
    c.setLineWidth(1)
    c.line(36, y, width - 36, y)

    # ── 5. Total Settlement Highlight Box ──
    y -= 60
    c.setFillColor(brand_light)
    c.setStrokeColor(HexColor("#C7D2FE"))
    c.setLineWidth(1.5)
    c.roundRect(36, y, width - 72, 48, 8, fill=True, stroke=True)

    c.setFillColor(HexColor("#3730A3"))
    c.setFont("Helvetica-Bold", 11)
    c.drawString(52, y + 26, "TOTAL AMOUNT PAID")

    c.setFont("Helvetica", 8)
    c.setFillColor(brand_accent)
    c.drawString(52, y + 12, "Payment settled electronically in full")

    c.setFillColor(brand_primary)
    c.setFont("Helvetica-Bold", 18)
    c.drawRightString(width - 52, y + 16, f"Rs. {payment.amount:,.2f}")

    # ── 6. Digital Verification & Footer ──
    c.setFillColor(card_bg)
    c.setStrokeColor(border_color)
    c.setLineWidth(1)
    c.roundRect(36, 70, width - 72, 38, 6, fill=True, stroke=True)

    c.setFillColor(HexColor("#475569"))
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(width / 2, 94, "AUTHENTIC & DIGITALLY VERIFIED RECEIPT")

    c.setFont("Helvetica", 7.5)
    c.setFillColor(text_muted)
    c.drawCentredString(width / 2, 81, "This document is computer-generated under the Information Technology Act. No physical signature is required.")

    c.setStrokeColor(HexColor("#CBD5E1"))
    c.setLineWidth(0.5)
    c.line(36, 50, width - 36, 50)

    c.setFillColor(brand_accent)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawCentredString(width / 2, 36, "Thank you for being a valued resident! • SocietyHub System")

    # ── Save PDF Canvas ──
    c.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Receipt_{receipt_no}.pdf"'},
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
