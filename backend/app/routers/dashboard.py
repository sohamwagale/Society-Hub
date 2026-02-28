from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User, UserRole
from app.models.flat import Flat
from app.models.billing import Bill, BillPayment
from app.models.complaint import Complaint, ComplaintStatus
from app.models.poll import Poll, Vote
from app.models.reimbursement import ReimbursementRequest, ReimbursementStatus
from app.models.billing import BillFlatAmount
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats")
def dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    is_admin = current_user.role == UserRole.ADMIN
    sid = current_user.society_id

    # Billing stats (scoped to this society)
    total_bills = db.query(Bill).filter(Bill.society_id == sid).count()
    all_bills = db.query(Bill).filter(Bill.society_id == sid).all()

    # Build flat override lookup: (bill_id, flat_id) -> custom amount
    bill_ids = [b.id for b in all_bills]
    overrides = db.query(BillFlatAmount).filter(BillFlatAmount.bill_id.in_(bill_ids)).all() if bill_ids else []
    override_dict = {(o.bill_id, o.flat_id): o.amount for o in overrides}

    # Find occupied (non-vacant) flats within this society
    all_residents = db.query(User).filter(
        User.role == UserRole.RESIDENT,
        User.society_id == sid,
        User.flat_id.isnot(None),
    ).all()
    approved_residents = [u for u in all_residents if u.is_fully_approved]
    occupied_flat_ids = list({u.flat_id for u in approved_residents})

    # Pre-fetch all payments grouped by bill (for this society's bills)
    all_payments = db.query(BillPayment).filter(BillPayment.bill_id.in_(bill_ids)).all() if bill_ids else []
    payments_by_bill: dict[str, list] = {}
    for p in all_payments:
        payments_by_bill.setdefault(p.bill_id, []).append(p)

    # Build paid flat IDs per bill
    paid_flats_by_bill: dict[str, set] = {}
    for b_id, bill_payments in payments_by_bill.items():
        payer_ids = {p.user_id for p in bill_payments}
        payer_users = db.query(User).filter(User.id.in_(payer_ids)).all()
        paid_flats_by_bill[b_id] = {u.flat_id for u in payer_users if u.flat_id}

    total_bill_amount = 0
    total_collected = 0

    for bill in all_bills:
        paid_flat_ids = paid_flats_by_bill.get(bill.id, set())
        for flat_id in occupied_flat_ids:
            amt = override_dict.get((bill.id, flat_id), bill.amount)
            if amt == 0:
                continue
            total_bill_amount += amt
            if flat_id in paid_flat_ids:
                total_collected += amt

    overdue_bills = db.query(Bill).filter(
        Bill.society_id == sid,
        Bill.due_date < date.today(),
    ).count()

    # Personal billing (for residents)
    if not is_admin:
        my_paid = (
            db.query(func.sum(BillPayment.amount))
            .filter(BillPayment.user_id == current_user.id)
            .scalar() or 0
        )
        my_bills_count = total_bills
        my_paid_count = (
            db.query(BillPayment)
            .filter(BillPayment.user_id == current_user.id)
            .count()
        )
    else:
        my_paid = total_collected
        my_bills_count = total_bills
        my_paid_count = db.query(BillPayment).filter(BillPayment.bill_id.in_(bill_ids)).count() if bill_ids else 0

    # Complaint stats (scoped to this society)
    total_complaints = db.query(Complaint).filter(Complaint.society_id == sid).count()
    open_complaints = db.query(Complaint).filter(Complaint.society_id == sid, Complaint.status == ComplaintStatus.OPEN).count()
    in_progress_complaints = db.query(Complaint).filter(Complaint.society_id == sid, Complaint.status == ComplaintStatus.IN_PROGRESS).count()
    resolved_complaints = db.query(Complaint).filter(Complaint.society_id == sid, Complaint.status == ComplaintStatus.RESOLVED).count()

    # Poll stats (scoped to this society)
    total_polls = db.query(Poll).filter(Poll.society_id == sid).count()
    active_polls = db.query(Poll).filter(Poll.society_id == sid, Poll.is_active == True).count()
    poll_ids = [p.id for p in db.query(Poll).filter(Poll.society_id == sid).all()]
    total_votes = db.query(Vote).filter(Vote.poll_id.in_(poll_ids)).count() if poll_ids else 0

    # Reimbursement stats (scoped to this society)
    from app.models.reimbursement import ReimbursementRequest, ReimbursementStatus
    total_reimbursements = db.query(ReimbursementRequest).filter(ReimbursementRequest.society_id == sid).count()
    pending_reimbursements = db.query(ReimbursementRequest).filter(
        ReimbursementRequest.society_id == sid,
        ReimbursementRequest.status == ReimbursementStatus.SUBMITTED,
    ).count()
    approved_amount = db.query(func.sum(ReimbursementRequest.approved_amount)).filter(
        ReimbursementRequest.society_id == sid,
        ReimbursementRequest.status.in_([ReimbursementStatus.APPROVED, ReimbursementStatus.PAID]),
    ).scalar() or 0

    # Resident and flat stats (scoped to this society)
    total_residents = db.query(User).filter(User.role == UserRole.RESIDENT, User.society_id == sid).count()
    total_flats = db.query(Flat).filter(Flat.society_id == sid).count()

    return {
        "billing": {
            "total_bills": total_bills,
            "total_amount": float(total_bill_amount),
            "total_collected": float(total_collected),
            "collection_rate": round(float(total_collected) / float(total_bill_amount) * 100, 1) if total_bill_amount > 0 else 0,
            "overdue_bills": overdue_bills,
            "my_paid": float(my_paid),
            "my_bills_count": my_bills_count,
            "my_paid_count": my_paid_count,
        },
        "complaints": {
            "total": total_complaints,
            "open": open_complaints,
            "in_progress": in_progress_complaints,
            "resolved": resolved_complaints,
            "resolution_rate": round(resolved_complaints / total_complaints * 100, 1) if total_complaints > 0 else 0,
        },
        "polls": {
            "total": total_polls,
            "active": active_polls,
            "total_votes": total_votes,
        },
        "reimbursements": {
            "total": total_reimbursements,
            "pending": pending_reimbursements,
            "approved_amount": float(approved_amount),
        },
        "community": {
            "total_residents": total_residents,
            "total_flats": total_flats,
        },
    }
