from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.notification import Notification
from app.core.deps import get_current_user

router = APIRouter()


@router.patch("/{notification_id}/read")
def mark_read(notification_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notif = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if notif:
        notif.is_read = True
        db.commit()
    return {"success": True}


@router.patch("/read-all")
def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(Notification).filter(
        Notification.user_id == current_user.id, Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"success": True}


@router.delete("/clear")
def clear_all(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).delete()
    db.commit()
    return {"success": True}


@router.delete("/{notification_id}")
def delete_single_notification(notification_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(Notification).filter(
        Notification.id == notification_id, Notification.user_id == current_user.id
    ).delete()
    db.commit()
    return {"success": True}
