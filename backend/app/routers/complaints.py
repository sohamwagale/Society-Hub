import os
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.complaint import Complaint, ComplaintStatus, ComplaintCategory
from app.models.comment import ComplaintComment
from app.schemas.complaint import ComplaintCreate, ComplaintUpdate, ComplaintOut
from app.schemas.comment import CommentCreate, CommentOut
from app.utils.auth import get_current_user, require_role
from app.utils.storage import upload_file
from app.services.notification_service import create_notification
from app.models.notification import NotificationType

router = APIRouter(prefix="/api/complaints", tags=["Complaints"])


@router.post("", response_model=ComplaintOut, status_code=201)
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


@router.get("", response_model=list[ComplaintOut])
def list_complaints(
    status: Optional[str] = Query(None, description="Filter by status: open, in_progress, resolved"),
    category: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Complaint)

    # Role-based filtering
    if current_user.role.value != "admin":
        query = query.filter(Complaint.user_id == current_user.id)
    else:
        query = query.filter(Complaint.society_id == current_user.society_id)

    # Status filter
    if status:
        query = query.filter(Complaint.status == ComplaintStatus(status))

    # Category filter
    if category:
        query = query.filter(Complaint.category == ComplaintCategory(category))

    return query.order_by(Complaint.created_at.desc()).all()


@router.get("/{complaint_id}", response_model=ComplaintOut)
def get_complaint(complaint_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
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


# ── Comments (V2) ──
@router.get("/{complaint_id}/comments", response_model=list[CommentOut])
def list_comments(complaint_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    comments = (
        db.query(ComplaintComment)
        .filter(ComplaintComment.complaint_id == complaint_id)
        .order_by(ComplaintComment.created_at.asc())
        .all()
    )
    results = []
    for c in comments:
        out = CommentOut.model_validate(c)
        out.user_name = c.user.name if c.user else None
        out.user_role = c.user.role.value if c.user else None
        results.append(out)
    return results


@router.post("/{complaint_id}/comments", response_model=CommentOut, status_code=201)
def add_comment(
    complaint_id: str,
    data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Authorization: only complaint owner or admin can comment
    if complaint.user_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to comment")

    comment = ComplaintComment(
        id=str(uuid.uuid4()),
        complaint_id=complaint_id,
        user_id=current_user.id,
        message=data.message,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    # Notify the other party
    if current_user.role.value == "admin":
        create_notification(
            db, complaint.user_id,
            f"New reply on: {complaint.title}",
            data.message[:80],
            NotificationType.COMPLAINT, complaint.id,
        )
    else:
        # Notify admins (simplified: just create a general notification)
        from app.models.user import UserRole
        admins = db.query(User).filter(User.role == UserRole.ADMIN).all()
        for admin in admins:
            create_notification(
                db, admin.id,
                f"Resident replied on: {complaint.title}",
                data.message[:80],
                NotificationType.COMPLAINT, complaint.id,
            )

    out = CommentOut.model_validate(comment)
    out.user_name = current_user.name
    out.user_role = current_user.role.value
    return out


# ── Image upload ──
@router.post("/{complaint_id}/upload-image")
async def upload_complaint_image(
    complaint_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if complaint.user_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    ext = os.path.splitext(file.filename)[1]
    filename = f"{complaint_id}_{uuid.uuid4().hex[:8]}{ext}"
    content_type = file.content_type or "application/octet-stream"
    data = await file.read()
    image_url = upload_file("complaints", filename, data, content_type)

    images = complaint.images or []
    images.append(image_url)
    complaint.images = images
    db.commit()
    return {"image_path": image_url}
