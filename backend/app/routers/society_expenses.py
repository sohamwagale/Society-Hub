import os
import uuid
import csv
import io
from datetime import datetime, date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from app.database import get_db
from app.models.user import User
from app.models.society_expense import SocietyExpense
from app.schemas.society_expense import SocietyExpenseOut
from app.utils.auth import get_current_user, require_role, SECRET_KEY, ALGORITHM
from app.utils.storage import upload_file
from app.services.activity_log_service import log_activity

router = APIRouter(prefix="/api/expenses", tags=["Society Expenses"])


@router.post("", response_model=SocietyExpenseOut, status_code=201)
async def create_expense(
    title: str = Form(...),
    amount: float = Form(...),
    expense_date: str = Form(...),
    description: Optional[str] = Form(None),
    document: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    expense_id = str(uuid.uuid4())
    document_url = None

    if document and document.filename:
        ext = os.path.splitext(document.filename)[1]
        filename = f"exp_{expense_id}{ext}"
        content_type = document.content_type or "application/octet-stream"
        data = await document.read()
        document_url = upload_file("expenses", filename, data, content_type)

    try:
        parsed_date = datetime.fromisoformat(expense_date.replace("Z", "+00:00"))
    except ValueError:
        parsed_date = datetime.strptime(expense_date, "%Y-%m-%d")

    expense = SocietyExpense(
        id=expense_id,
        society_id=admin.society_id,
        title=title,
        description=description,
        amount=amount,
        expense_date=parsed_date,
        document_url=document_url,
        created_by=admin.id,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)

    log_activity(
        db,
        user_id=admin.id,
        society_id=admin.society_id,
        action="Created Expense",
        entity_type="expense",
        entity_id=expense.id,
        details=f"Logged expense '{title}' of Rs.{amount:,.2f}",
    )

    return expense


@router.get("", response_model=list[SocietyExpenseOut])
def list_expenses(
    sort_by: Optional[str] = Query("date_desc", description="Sort by: date_desc, date_asc, amount_desc, amount_asc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(SocietyExpense).filter(SocietyExpense.society_id == current_user.society_id)

    if sort_by == "date_desc":
        query = query.order_by(SocietyExpense.expense_date.desc())
    elif sort_by == "date_asc":
        query = query.order_by(SocietyExpense.expense_date.asc())
    elif sort_by == "amount_desc":
        query = query.order_by(SocietyExpense.amount.desc())
    elif sort_by == "amount_asc":
        query = query.order_by(SocietyExpense.amount.asc())
    else:
        query = query.order_by(SocietyExpense.expense_date.desc())

    return query.all()


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

    buffer = io.BytesIO(output.getvalue().encode("utf-8-sig"))
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="society_expenses_{date.today().isoformat()}.csv"'},
    )


@router.get("/{expense_id}", response_model=SocietyExpenseOut)
def get_expense(
    expense_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = db.query(SocietyExpense).filter(SocietyExpense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Society expense record not found")
    return expense
