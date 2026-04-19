# Import FastAPI components for routing and dependency injection
from fastapi import APIRouter, Depends
# Import SQLAlchemy Session for database transactions
from sqlalchemy.orm import Session
# Import the database session utility
from app.database import get_db
# Import User model for authentication context
from app.models.user import User
# Import Notification model for DB operations
from app.models.notification import Notification
# Import Pydantic schema for notification output validation
from app.schemas.notification import NotificationOut
# Import authentication utility to retrieve the current logged-in user
from app.utils.auth import get_current_user

# Initialize the router with a specific URL prefix and grouping tag
router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


# ── Notification Retrieval ──

# GET endpoint to fetch the user's notification history
@router.get("", response_model=list[NotificationOut])
def list_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Query all notifications belonging to the current user
    return (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        # Order by newest first for better UX
        .order_by(Notification.created_at.desc())
        # Cap the results to the most recent 50 alerts
        .limit(50)
        .all()
    )


# GET endpoint to retrieve the count of unread notifications
@router.get("/unread-count")
def unread_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Count records where is_read is False for this specific user
    count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)
        .count()
    )
    # Return count in a JSON dictionary
    return {"count": count}


# ── Notification Management State ──

# PATCH endpoint to mark a specific notification as 'Read'
@router.patch("/{notification_id}/read")
def mark_read(notification_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Locate the notification, ensuring it belongs to the requester for security
    notif = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    # If the record exists, update its status
    if notif:
        notif.is_read = True
        # Save change to DB
        db.commit()
    # Confirm success
    return {"success": True}


# PATCH endpoint to clear all unread markers for the user
@router.patch("/read-all")
def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Perform a batch update on all unread notifications for the user
    db.query(Notification).filter(
        Notification.user_id == current_user.id, Notification.is_read == False
    ).update({"is_read": True})
    # Finalize the batch update
    db.commit()
    return {"success": True}


# DELETE endpoint to wipe the user's notification history
@router.delete("/clear")
def clear_all(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Remove all notification records linked to this user
    db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).delete()
    # Finalize deletion
    db.commit()
    return {"success": True}
