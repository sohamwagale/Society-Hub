import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.complaint import Complaint, ComplaintStatus, ComplaintCategory
from app.schemas.complaint import ComplaintCreate, ComplaintUpdate, ComplaintOut
from app.core.deps import get_current_user, require_role
from app.services.notification_service import create_notification
from app.models.notification import NotificationType

router = APIRouter()


@router.post("/", response_model=ComplaintOut, status_code=201)
def create_complaint(
    data: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = Complaint(
        id=str(uuid.uuid4()),
        society_id=current_user.society_id,
        user_id=current_user.id,
        category=ComplaintCategory(data.category),
        title=data.title,
        description=data.description,
        status=ComplaintStatus.OPEN,
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return complaint


@router.get("/", response_model=list[ComplaintOut])
def list_complaints(
    status: Optional[str] = Query(None, description="Filter by status: open, in_progress, resolved"),
    category: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Complaint).filter(Complaint.society_id == current_user.society_id)
    if status:
        query = query.filter(Complaint.status == ComplaintStatus(status))
    if category:
        query = query.filter(Complaint.category == ComplaintCategory(category))
    return query.order_by(Complaint.created_at.desc()).all()


@router.get("/{complaint_id}", response_model=ComplaintOut)
def get_complaint(complaint_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint or complaint.society_id != current_user.society_id:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint


@router.patch("/{complaint_id}", response_model=ComplaintOut)
def update_complaint(
    complaint_id: str,
    data: ComplaintUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if data.status:
        complaint.status = ComplaintStatus(data.status)
    if data.admin_notes is not None:
        complaint.admin_notes = data.admin_notes
    complaint.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(complaint)

    create_notification(
        db, complaint.user_id,
        f"Complaint Update: {complaint.title}",
        f"Status changed to: {complaint.status.value}",
        NotificationType.COMPLAINT, complaint.id,
    )

    return complaint
