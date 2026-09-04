import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.complaint import Complaint
from app.models.comment import ComplaintComment
from app.schemas.comment import CommentCreate, CommentOut
from app.core.deps import get_current_user
from app.services.notification_service import create_notification
from app.models.notification import NotificationType

router = APIRouter()


@router.get("/{complaint_id}/comments", response_model=list[CommentOut])
def list_comments(complaint_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint or complaint.society_id != current_user.society_id:
        raise HTTPException(status_code=404, detail="Complaint record not found")

    comments = (
        db.query(ComplaintComment)
        .filter(ComplaintComment.complaint_id == complaint_id)
        .order_by(ComplaintComment.created_at.asc())
        .all()
    )
    results = []
    for c in comments:
        out = CommentOut.model_validate(c)
        out.user_name = c.user.name if c.user else "Deleted User"
        out.user_role = c.user.role.value if c.user else "N/A"
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
    if not complaint or complaint.society_id != current_user.society_id:
        raise HTTPException(status_code=404, detail="Parent entity missing")

    comment = ComplaintComment(
        id=str(uuid.uuid4()),
        complaint_id=complaint_id,
        user_id=current_user.id,
        message=data.message,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    if current_user.role.value == "admin":
        create_notification(
            db, complaint.user_id,
            f"New reply from Admin on: {complaint.title}",
            data.message[:80],
            NotificationType.COMPLAINT, complaint.id,
        )
    else:
        admins = db.query(User).filter(User.role == UserRole.ADMIN, User.society_id == current_user.society_id).all()
        for admin in admins:
            create_notification(
                db, admin.id,
                f"Resident response on: {complaint.title}",
                data.message[:80],
                NotificationType.COMPLAINT, complaint.id,
            )

    out = CommentOut.model_validate(comment)
    out.user_name = current_user.name
    out.user_role = current_user.role.value
    return out
