from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.database import get_db
from app.models.user import User
from app.models.society_expense import SocietyExpense
from app.core.config import SECRET_KEY, ALGORITHM
from app.services.export_service import generate_expenses_csv

router = APIRouter()


@router.get("/export-csv")
def export_expenses_csv(
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Stream CSV report of society expenditures for auditor review."""
    if not token:
        raise HTTPException(status_code=401, detail="Authentication token required (?token=)")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    admin = db.query(User).filter(User.id == user_id).first()
    if not admin or admin.role.value != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required for expense export")

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
