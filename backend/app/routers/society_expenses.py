import os
import uuid
import json
from datetime import datetime, date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.society_expense import SocietyExpense
from app.schemas.society_expense import SocietyExpenseOut
from app.utils.auth import get_current_user, require_role
from app.utils.storage import upload_file

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
        filename = f"{expense_id}{ext}"
        content_type = document.content_type or "application/octet-stream"
        data = await document.read()
        document_url = upload_file("expenses", filename, data, content_type)

    # Parse expense date, handling potential full ISO format or just YYYY-MM-DD
    try:
        parsed_date = datetime.fromisoformat(expense_date.replace("Z", "+00:00"))
    except ValueError:
        # fallback to simple date parsing if not ISO
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

    expenses = query.all()
    return expenses


@router.get("/{expense_id}", response_model=SocietyExpenseOut)
def get_expense(
    expense_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = db.query(SocietyExpense).filter(SocietyExpense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense
