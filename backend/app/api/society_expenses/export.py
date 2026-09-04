from datetime import date
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.society_expense import SocietyExpense
from app.core.deps import require_role
from app.services.export_service import generate_expenses_csv

router = APIRouter()


@router.get("/export-csv")
def export_expenses_csv(
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Stream CSV report of society expenditures for auditor review."""
    expenses = (
        db.query(SocietyExpense)
        .filter(SocietyExpense.society_id == admin.society_id)
        .order_by(SocietyExpense.expense_date.desc())
        .all()
    )

    buffer = generate_expenses_csv(expenses)
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="society_expenses_{date.today().isoformat()}.csv"'},
    )
