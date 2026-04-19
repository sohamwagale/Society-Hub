# Import standard OS module for file path operations
import os
# Import uuid for generating unique expense identifiers and filenames
import uuid
# Import json in case of future structural log needs
import json
# Import datetime components for parsing and storing expense dates
from datetime import datetime, date
# Import Optional for type hinting nullable fields
from typing import Optional
# Import FastAPI components for routing, dependencies, errors, and multi-part form handling
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
# Import SQLAlchemy Session for database transactions
from sqlalchemy.orm import Session
# Import database session utility
from app.database import get_db
# Import User model for authentication and role-based checks
from app.models.user import User
# Import SocietyExpense model for DB operations
from app.models.society_expense import SocietyExpense
# Import Pydantic schema for output validation
from app.schemas.society_expense import SocietyExpenseOut
# Import authentication utilities for session and user verification
from app.utils.auth import get_current_user, require_role
# Import cloud storage utility for handling document/invoice uploads
from app.utils.storage import upload_file

# Initialize the router with relevant prefix and grouping tags
router = APIRouter(prefix="/api/expenses", tags=["Society Expenses"])


# ── Expense Recording ──

# POST endpoint for admins to log a new society-level expense (utilities, repairs, etc.)
@router.post("", response_model=SocietyExpenseOut, status_code=201)
async def create_expense(
    # Fields extracted from multi-part form data
    title: str = Form(...),
    amount: float = Form(...),
    expense_date: str = Form(...),
    description: Optional[str] = Form(None),
    # Optional invoice/receipt document upload
    document: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    # Restricted to Admin role
    admin: User = Depends(require_role("admin")),
):
    # Generate a unique ID for the expense record
    expense_id = str(uuid.uuid4())
    document_url = None

    # ── Document Processing ──
    if document and document.filename:
        # Isolate the file extension
        ext = os.path.splitext(document.filename)[1]
        # Construct a clean, unique filename for cloud storage
        filename = f"exp_{expense_id}{ext}"
        # Determine content type or fallback
        content_type = document.content_type or "application/octet-stream"
        # Buffer the binary payload
        data = await document.read()
        # Upload to 'expenses' bucket
        document_url = upload_file("expenses", filename, data, content_type)

    # ── Date Parsing Logic ──
    # Handle varying frontend date formats (ISO vs simple YYYY-MM-DD)
    try:
        # Attempt to parse ISO 8601 with timezone safety
        parsed_date = datetime.fromisoformat(expense_date.replace("Z", "+00:00"))
    except ValueError:
        # fallback to standard year-month-day parsing
        parsed_date = datetime.strptime(expense_date, "%Y-%m-%d")

    # ── Database Initialization ──
    expense = SocietyExpense(
        id=expense_id,
        # Link to the admin's society
        society_id=admin.society_id,
        # Content fields
        title=title,
        description=description,
        amount=amount,
        expense_date=parsed_date,
        # Reference to the physical invoice in cloud storage
        document_url=document_url,
        # Audit field: track which admin logged this
        created_by=admin.id,
    )
    # stage and commit
    db.add(expense)
    db.commit()
    # reload and return
    db.refresh(expense)

    return expense


# ── Expense Auditing & Retrieval ──

# GET endpoint to list all past society expenses (accessible by anyone in the society)
@router.get("", response_model=list[SocietyExpenseOut])
def list_expenses(
    # Optional sorting parameters for the ledger view
    sort_by: Optional[str] = Query("date_desc", description="Sort by: date_desc, date_asc, amount_desc, amount_asc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Scope query to the current user's society only
    query = db.query(SocietyExpense).filter(SocietyExpense.society_id == current_user.society_id)

    # ── Conditional Sorting Logic ──
    if sort_by == "date_desc":
        query = query.order_by(SocietyExpense.expense_date.desc())
    elif sort_by == "date_asc":
        query = query.order_by(SocietyExpense.expense_date.asc())
    elif sort_by == "amount_desc":
        query = query.order_by(SocietyExpense.amount.desc())
    elif sort_by == "amount_asc":
        query = query.order_by(SocietyExpense.amount.asc())
    else:
        # Default fallback sorting
        query = query.order_by(SocietyExpense.expense_date.desc())

    # Execute and return the list
    expenses = query.all()
    return expenses


# GET endpoint to fetch deep details of a specific expense record
@router.get("/{expense_id}", response_model=SocietyExpenseOut)
def get_expense(
    expense_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # lookup by primary key
    expense = db.query(SocietyExpense).filter(SocietyExpense.id == expense_id).first()
    # error if not found
    if not expense:
        raise HTTPException(status_code=404, detail="Society expense record not found")
    return expense
