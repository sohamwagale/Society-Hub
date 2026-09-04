from datetime import date
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.billing import Bill, BillPayment, BillFlatAmount


def get_resident_bill_amount(bill: Bill, user: User, db: Session) -> float:
    """Returns the final numeric amount a resident owes for a bill, accounting for overrides."""
    if not user.flat_id:
        return bill.amount
    override = db.query(BillFlatAmount).filter(
        BillFlatAmount.bill_id == bill.id,
        BillFlatAmount.flat_id == user.flat_id
    ).first()
    if override:
        return override.amount
    return bill.amount


def get_payment_status(bill: Bill, user: User, db: Session) -> str:
    """Computes the status of a bill (paid/due/overdue) relative to a specific user or context."""
    if user.role == "admin":
        residents_query = db.query(User).filter(User.role == "resident")
        if bill.society_id:
            residents_query = residents_query.filter(User.society_id == bill.society_id)
        all_residents = [u for u in residents_query.all() if u.is_fully_approved]
        payments = db.query(BillPayment).filter(BillPayment.bill_id == bill.id).all()
        paid_user_ids = {p.user_id for p in payments}

        paid_flat_ids = set()
        for u in db.query(User).filter(User.id.in_(paid_user_ids)).all():
            if u.flat_id:
                paid_flat_ids.add(u.flat_id)

        seen_flats = set()
        total_owing = 0
        total_paid = 0
        for u in all_residents:
            flat_key = u.flat_id or u.id
            if flat_key in seen_flats:
                continue
            seen_flats.add(flat_key)
            actual_amount = get_resident_bill_amount(bill, u, db)
            if actual_amount == 0:
                continue
            total_owing += 1
            if (u.id in paid_user_ids) or (u.flat_id and u.flat_id in paid_flat_ids):
                total_paid += 1

        if total_owing > 0 and total_paid >= total_owing:
            return "paid"
        if bill.due_date < date.today():
            return "overdue"
        return "due"

    # Resident context
    if not user.flat_id:
        payment = db.query(BillPayment).filter(
            BillPayment.bill_id == bill.id, BillPayment.user_id == user.id
        ).first()
    else:
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


def is_all_residents_paid(bill: Bill, db: Session) -> bool:
    """Returns True ONLY when every non-excluded resident has cleared the bill."""
    residents_query = db.query(User).filter(User.role == "resident")
    if bill.society_id:
        residents_query = residents_query.filter(User.society_id == bill.society_id)
    all_residents = [u for u in residents_query.all() if u.is_fully_approved]
    payments = db.query(BillPayment).filter(BillPayment.bill_id == bill.id).all()
    paid_user_ids = {p.user_id for p in payments}

    paid_flat_ids = set()
    for u in db.query(User).filter(User.id.in_(paid_user_ids)).all():
        if u.flat_id:
            paid_flat_ids.add(u.flat_id)

    seen_flats = set()
    total_owing = 0
    total_paid = 0
    for u in all_residents:
        flat_key = u.flat_id or u.id
        if flat_key in seen_flats:
            continue
        seen_flats.add(flat_key)
        if get_resident_bill_amount(bill, u, db) == 0:
            continue
        total_owing += 1
        if (u.id in paid_user_ids) or (u.flat_id and u.flat_id in paid_flat_ids):
            total_paid += 1

    return total_owing > 0 and total_paid >= total_owing
