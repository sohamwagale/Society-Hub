# Import date for handling historical overdue checks
from datetime import date
# Import FastAPI components for routing and dependencies
from fastapi import APIRouter, Depends
# Import SQLAlchemy Session and aggregation functions
from sqlalchemy.orm import Session
from sqlalchemy import func
# Import database session utility
from app.database import get_db
# Import model for role and user identification
from app.models.user import User, UserRole
# Import Flat model for community statistics
from app.models.flat import Flat
# Import billing models for financial metrics
from app.models.billing import Bill, BillPayment
# Import complaint models for service metrics
from app.models.complaint import Complaint, ComplaintStatus
# Import poll models for engagement metrics
from app.models.poll import Poll, Vote
# Import reimbursement models for expense metrics
from app.models.reimbursement import ReimbursementRequest, ReimbursementStatus
# Import specific billing amount model for override handling
from app.models.billing import BillFlatAmount
# Import authentication utility to scope data per-user/society
from app.utils.auth import get_current_user

# Initialize the router with relevant prefix and grouping tags
router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


# ── Statistics Aggregation ──

# GET endpoint to retrieve a comprehensive set of KPIs and metrics for the dashboard
@router.get("/stats")
def dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Determine the requester's context (Is this an admin or a resident?)
    is_admin = current_user.role == UserRole.ADMIN
    # Isolate the specific society ID to ensure multi-tenant data privacy
    sid = current_user.society_id
    
    # Check for society existence
    if not sid:
        return {"error": "User is not linked to any society"}

    # ── Billing & Collections Logic ──
    # Count all billing cycles created within this society
    total_bills = db.query(Bill).filter(Bill.society_id == sid).count()
    # retrieve references for deeper aggregation
    all_bills = db.query(Bill).filter(Bill.society_id == sid).all()
    bill_ids = [b.id for b in all_bills]

    # Build flat-wise override lookup: (bill_id, flat_id) -> custom amount
    # This handles special cases where some flats pay more/less than the standard maintenance
    overrides = db.query(BillFlatAmount).filter(BillFlatAmount.bill_id.in_(bill_ids)).all() if bill_ids else []
    override_dict = {(o.bill_id, o.flat_id): o.amount for o in overrides}

    # Identify all active (non-vacant) flats within this specific society
    all_residents = db.query(User).filter(
        User.role == UserRole.RESIDENT,
        User.society_id == sid,
        User.flat_id.isnot(None),
    ).all()
    # Only count flats with fully approved resident accounts
    approved_residents = [u for u in all_residents if u.is_fully_approved]
    occupied_flat_ids = list({u.flat_id for u in approved_residents})

    # Pre-fetch and bucket all payments made against society bills for efficient tallying
    all_payments = db.query(BillPayment).filter(BillPayment.bill_id.in_(bill_ids)).all() if bill_ids else []
    payments_by_bill: dict[str, list] = {}
    for p in all_payments:
        payments_by_bill.setdefault(p.bill_id, []).append(p)

    # Cross-reference payments to identify which flats have 'paid' status on which bill
    paid_flats_by_bill: dict[str, set] = {}
    for b_id, bill_payments in payments_by_bill.items():
        payer_ids = {p.user_id for p in bill_payments}
        # find the flat association for these payers
        payer_users = db.query(User).filter(User.id.in_(payer_ids)).all()
        paid_flats_by_bill[b_id] = {u.flat_id for u in payer_users if u.flat_id}

    # Initialize collection counters
    total_billable_receivable = 0
    total_collected_to_date = 0

    # ── Calculation Loop ── (Accounting for overrides per-flat per-bill)
    for bill in all_bills:
        paid_flat_ids = paid_flats_by_bill.get(bill.id, set())
        for flat_id in occupied_flat_ids:
            # use custom override if exists, else fall back to default bill amount
            amt = override_dict.get((bill.id, flat_id), bill.amount)
            # ignore 0-amount edge cases
            if amt == 0:
                continue
            total_billable_receivable += amt
            # tally if a payment was recorded for this flat
            if flat_id in paid_flat_ids:
                total_collected_to_date += amt

    # Count bills that have passed their deadline
    overdue_bills = db.query(Bill).filter(
        Bill.society_id == sid,
        Bill.due_date < date.today(),
    ).count()

    # ── Personal / Resident-Centric Context ──
    if not is_admin:
        # For residents, we want to show THEIR personal payment history vs the society totals
        flat_user_ids = [current_user.id]
        if current_user.flat_id:
            # track payments from all members of the same household (flat)
            flat_users = db.query(User.id).filter(User.flat_id == current_user.flat_id).all()
            flat_user_ids = [u[0] for u in flat_users]

        # Total amount paid by the user's household
        my_paid_sum = (
            db.query(func.sum(BillPayment.amount))
            .filter(BillPayment.user_id.in_(flat_user_ids))
            .scalar() or 0
        )
        my_bills_total_count = total_bills
        # count of distinct bills paid by this household
        my_paid_count = (
            db.query(func.count(func.distinct(BillPayment.bill_id)))
            .filter(BillPayment.user_id.in_(flat_user_ids))
            .scalar() or 0
        )
    else:
        # For admins, 'my' stats represent the global society collection status
        my_paid_sum = total_collected_to_date
        my_bills_total_count = total_bills
        # Count of individual payment transactions recorded
        my_paid_count = db.query(BillPayment).filter(BillPayment.bill_id.in_(bill_ids)).count() if bill_ids else 0

    # ── Complaint Metrics ──
    total_complaints = db.query(Complaint).filter(Complaint.society_id == sid).count()
    # status-specific tallying
    open_complaints = db.query(Complaint).filter(Complaint.society_id == sid, Complaint.status == ComplaintStatus.OPEN).count()
    in_progress_complaints = db.query(Complaint).filter(Complaint.society_id == sid, Complaint.status == ComplaintStatus.IN_PROGRESS).count()
    resolved_complaints = db.query(Complaint).filter(Complaint.society_id == sid, Complaint.status == ComplaintStatus.RESOLVED).count()

    # ── Polls & Participation ──
    total_polls = db.query(Poll).filter(Poll.society_id == sid).count()
    active_polls = db.query(Poll).filter(Poll.society_id == sid, Poll.is_active == True).count()
    # retrieve engagement (vote count) across all society polls
    poll_ids_list = [p.id for p in db.query(Poll).filter(Poll.society_id == sid).all()]
    total_votes_casted = db.query(Vote).filter(Vote.poll_id.in_(poll_ids_list)).count() if poll_ids_list else 0

    # ── Reimbursement Activity ──
    # Note: re-importing inside function to avoid potential circular dependency if applicable, 
    # though already imported at top for clarity here.
    total_reimb_requests = db.query(ReimbursementRequest).filter(ReimbursementRequest.society_id == sid).count()
    # count of items awaiting review
    pending_reimb_requests = db.query(ReimbursementRequest).filter(
        ReimbursementRequest.society_id == sid,
        ReimbursementRequest.status == ReimbursementStatus.SUBMITTED,
    ).count()
    # aggregate sum of money paid out or scheduled for payout
    total_approved_reimb_money = db.query(func.sum(ReimbursementRequest.approved_amount)).filter(
        ReimbursementRequest.society_id == sid,
        ReimbursementRequest.status.in_([ReimbursementStatus.APPROVED, ReimbursementStatus.PAID]),
    ).scalar() or 0

    # ── Community Size ──
    # User count (Residents)
    total_residents_count = db.query(User).filter(User.role == UserRole.RESIDENT, User.society_id == sid).count()
    # Real estate units count
    total_physical_flats = db.query(Flat).filter(Flat.society_id == sid).count()

    # ── Unified Response Serialization ──
    return {
        "billing": {
            "total_bills": total_bills,
            "total_amount": float(total_billable_receivable),
            "total_collected": float(total_collected_to_date),
            # Calculate collection efficiency percentage
            "collection_rate": round(float(total_collected_to_date) / float(total_billable_receivable) * 100, 1) if total_billable_receivable > 0 else 0,
            "overdue_bills": overdue_bills,
            "my_paid": float(my_paid_sum),
            "my_bills_count": my_bills_total_count,
            "my_paid_count": my_paid_count,
        },
        "complaints": {
            "total": total_complaints,
            "open": open_complaints,
            "in_progress": in_progress_complaints,
            "resolved": resolved_complaints,
            # Calculate resolution efficiency
            "resolution_rate": round(resolved_complaints / total_complaints * 100, 1) if total_complaints > 0 else 0,
        },
        "polls": {
            "total": total_polls,
            "active": active_polls,
            "total_votes": total_votes_casted,
        },
        "reimbursements": {
            "total": total_reimb_requests,
            "pending": pending_reimb_requests,
            "approved_amount": float(total_approved_reimb_money),
        },
        "community": {
            "total_residents": total_residents_count,
            "total_flats": total_physical_flats,
        },
    }
