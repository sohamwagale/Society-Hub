import csv
import io
from datetime import date
from sqlalchemy.orm import Session
from app.models.billing import BillPayment, BillFlatAmount


def generate_activity_log_csv(logs) -> io.BytesIO:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Timestamp (UTC)", "User Name", "User ID", "Action", "Entity Type", "Entity ID", "Details"])
    for l in logs:
        writer.writerow([
            l.created_at.strftime("%Y-%m-%d %H:%M:%S") if l.created_at else "",
            l.user.name if l.user else "System",
            l.user_id or "",
            l.action,
            l.entity_type or "",
            l.entity_id or "",
            l.details or "",
        ])
    return io.BytesIO(output.getvalue().encode("utf-8-sig"))


def generate_dues_csv(flats, active_bills, db: Session) -> io.BytesIO:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Flat Number", "Block", "Floor", "Bill Title", "Bill Amount (INR)", "Due Date", "Payment Status"])
    for flat in flats:
        flat_users = [u for u in flat.residents if u.is_fully_approved]
        flat_user_ids = [u.id for u in flat_users]
        for bill in active_bills:
            override = db.query(BillFlatAmount).filter(
                BillFlatAmount.bill_id == bill.id,
                BillFlatAmount.flat_id == flat.id
            ).first()
            if override and override.amount == 0:
                continue
            bill_amount = override.amount if override else bill.amount
            payment = db.query(BillPayment).filter(
                BillPayment.bill_id == bill.id,
                BillPayment.user_id.in_(flat_user_ids)
            ).first() if flat_user_ids else None
            status_str = "Paid" if payment else ("Overdue" if bill.due_date < date.today() else "Unpaid")
            writer.writerow([
                flat.flat_number,
                flat.block,
                flat.floor,
                bill.title,
                f"{bill_amount:.2f}",
                bill.due_date.strftime("%Y-%m-%d") if bill.due_date else "",
                status_str,
            ])
    return io.BytesIO(output.getvalue().encode("utf-8-sig"))


def generate_payments_csv(payments) -> io.BytesIO:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Payment ID", "Bill Title", "Payer Name", "Flat Number", "Amount Paid (INR)", "Payment Method", "Transaction Ref", "Paid At (UTC)"])
    for p in payments:
        payer = p.user
        flat_label = f"{payer.flat.block}-{payer.flat.flat_number}" if payer and payer.flat else "Unassigned"
        writer.writerow([
            p.id,
            p.bill.title if p.bill else "",
            payer.name if payer else "Unknown",
            flat_label,
            f"{p.amount:.2f}",
            p.payment_method or "Online",
            p.transaction_ref or "",
            p.paid_at.strftime("%Y-%m-%d %H:%M:%S") if p.paid_at else "",
        ])
    return io.BytesIO(output.getvalue().encode("utf-8-sig"))


def generate_expenses_csv(expenses) -> io.BytesIO:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Expense ID", "Title", "Description", "Amount (INR)", "Expense Date", "Has Voucher Document", "Created At"])
    for exp in expenses:
        writer.writerow([
            exp.id,
            exp.title,
            exp.description or "",
            f"{exp.amount:.2f}",
            exp.expense_date.strftime("%Y-%m-%d") if exp.expense_date else "",
            "Yes" if exp.document_url else "No",
            exp.created_at.strftime("%Y-%m-%d %H:%M:%S") if exp.created_at else "",
        ])
    return io.BytesIO(output.getvalue().encode("utf-8-sig"))
