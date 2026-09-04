from sqlalchemy.orm import Session
from app.models.billing import BillFlatAmount, BillPayment


def prepare_billing_report_data(active_bills, flats, db: Session) -> list:
    """Prepares structured flat-by-flat payment and due records for active bills."""
    flat_rows = []
    for flat in flats:
        flat_label = f"{flat.block}-{flat.flat_number}"
        flat_resident_ids = [u.id for u in flat.residents if u.is_fully_approved]
        owner = next((u for u in flat.residents if u.resident_type == 'owner' and u.is_fully_approved), None)
        owner_name = owner.name if owner else (flat.residents[0].name if flat.residents else "Occupant")

        row = {"flat": flat_label, "owner": owner_name, "bills": {}, "total_due": 0.0}
        for bill in active_bills:
            override = db.query(BillFlatAmount).filter(
                BillFlatAmount.bill_id == bill.id,
                BillFlatAmount.flat_id == flat.id
            ).first()
            if override and override.amount == 0:
                row["bills"][bill.id] = {"status": "excluded", "amount": 0}
                continue

            bill_amount = override.amount if override else bill.amount
            payment = db.query(BillPayment).filter(
                BillPayment.bill_id == bill.id,
                BillPayment.user_id.in_(flat_resident_ids)
            ).first() if flat_resident_ids else None

            if payment:
                row["bills"][bill.id] = {"status": "paid", "amount": bill_amount}
            else:
                row["bills"][bill.id] = {"status": "due", "amount": bill_amount}
                row["total_due"] += bill_amount

        flat_rows.append(row)
    return flat_rows
