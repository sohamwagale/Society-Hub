from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.user import User, UserRole
from app.models.flat import Flat
from app.models.billing import Bill, BillPayment, BillFlatAmount
from app.models.complaint import Complaint, ComplaintStatus
from app.models.poll import Poll, Vote
from app.models.reimbursement import ReimbursementRequest, ReimbursementStatus


def compute_dashboard_stats(db: Session, current_user: User) -> dict:
    """Aggregates society KPIs and metrics for admin or resident dashboard."""
    is_admin = current_user.role == UserRole.ADMIN
    sid = current_user.society_id
    if not sid:
        return {"error": "User is not linked to any society"}

    all_bills = db.query(Bill).filter(Bill.society_id == sid).all()
    total_bills = len(all_bills)
    bill_ids = [b.id for b in all_bills]

    overrides = db.query(BillFlatAmount).filter(BillFlatAmount.bill_id.in_(bill_ids)).all() if bill_ids else []
    override_dict = {(o.bill_id, o.flat_id): o.amount for o in overrides}

    all_residents = db.query(User).filter(
        User.role == UserRole.RESIDENT, User.society_id == sid, User.flat_id.isnot(None)
    ).all()
    approved_residents = [u for u in all_residents if u.is_fully_approved]
    occupied_flat_ids = list({u.flat_id for u in approved_residents})

    all_payments = db.query(BillPayment).filter(BillPayment.bill_id.in_(bill_ids)).all() if bill_ids else []
    payments_by_bill: dict[str, list] = {}
    for p in all_payments:
        payments_by_bill.setdefault(p.bill_id, []).append(p)

    paid_flats_by_bill: dict[str, set] = {}
    for b_id, bill_payments in payments_by_bill.items():
        payer_ids = {p.user_id for p in bill_payments}
        payer_users = db.query(User).filter(User.id.in_(payer_ids)).all()
        paid_flats_by_bill[b_id] = {u.flat_id for u in payer_users if u.flat_id}

    total_billable = 0
    total_collected = 0
    for bill in all_bills:
        paid_flat_ids = paid_flats_by_bill.get(bill.id, set())
        for flat_id in occupied_flat_ids:
            amt = override_dict.get((bill.id, flat_id), bill.amount)
            if amt == 0:
                continue
            total_billable += amt
            if flat_id in paid_flat_ids:
                total_collected += amt

    overdue_bills = db.query(Bill).filter(Bill.society_id == sid, Bill.due_date < date.today()).count()

    if not is_admin:
        flat_user_ids = [current_user.id]
        if current_user.flat_id:
            flat_users = db.query(User.id).filter(User.flat_id == current_user.flat_id).all()
            flat_user_ids = [u[0] for u in flat_users]

        my_paid_sum = db.query(func.sum(BillPayment.amount)).filter(BillPayment.user_id.in_(flat_user_ids)).scalar() or 0
        my_bills_total_count = total_bills
        my_paid_count = db.query(func.count(func.distinct(BillPayment.bill_id))).filter(BillPayment.user_id.in_(flat_user_ids)).scalar() or 0
    else:
        my_paid_sum = total_collected
        my_bills_total_count = total_bills
        my_paid_count = len(all_payments)

    total_complaints = db.query(Complaint).filter(Complaint.society_id == sid).count()
    open_complaints = db.query(Complaint).filter(Complaint.society_id == sid, Complaint.status == ComplaintStatus.OPEN).count()
    in_progress_complaints = db.query(Complaint).filter(Complaint.society_id == sid, Complaint.status == ComplaintStatus.IN_PROGRESS).count()
    resolved_complaints = db.query(Complaint).filter(Complaint.society_id == sid, Complaint.status == ComplaintStatus.RESOLVED).count()

    total_polls = db.query(Poll).filter(Poll.society_id == sid).count()
    active_polls = db.query(Poll).filter(Poll.society_id == sid, Poll.is_active == True).count()
    poll_ids_list = [p.id for p in db.query(Poll).filter(Poll.society_id == sid).all()]
    total_votes = db.query(Vote).filter(Vote.poll_id.in_(poll_ids_list)).count() if poll_ids_list else 0

    total_reimb = db.query(ReimbursementRequest).filter(ReimbursementRequest.society_id == sid).count()
    pending_reimb = db.query(ReimbursementRequest).filter(
        ReimbursementRequest.society_id == sid, ReimbursementRequest.status == ReimbursementStatus.SUBMITTED
    ).count()
    approved_reimb_money = db.query(func.sum(ReimbursementRequest.approved_amount)).filter(
        ReimbursementRequest.society_id == sid,
        ReimbursementRequest.status.in_([ReimbursementStatus.APPROVED, ReimbursementStatus.PAID]),
    ).scalar() or 0

    return {
        "billing": {
            "total_bills": total_bills,
            "total_amount": float(total_billable),
            "total_collected": float(total_collected),
            "collection_rate": round(float(total_collected) / float(total_billable) * 100, 1) if total_billable > 0 else 0,
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
            "resolution_rate": round(resolved_complaints / total_complaints * 100, 1) if total_complaints > 0 else 0,
        },
        "polls": {
            "total": total_polls,
            "active": active_polls,
            "total_votes": total_votes,
        },
        "reimbursements": {
            "total": total_reimb,
            "pending": pending_reimb,
            "approved_amount": float(approved_reimb_money),
        },
        "community": {
            "total_residents": db.query(User).filter(User.role == UserRole.RESIDENT, User.society_id == sid).count(),
            "total_flats": db.query(Flat).filter(Flat.society_id == sid).count(),
        },
    }
