"""Notification service — creates in-app notifications + sends push notifications via Expo."""
import uuid
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.notification import Notification, NotificationType

logger = logging.getLogger(__name__)


def _send_push_notifications(tokens: list[str], title: str, body: str, data: dict | None = None):
    """Send push notifications via Expo Push API. Fire-and-forget."""
    import httpx

    valid_tokens = [t for t in tokens if t and t.startswith("ExponentPushToken")]
    if not valid_tokens:
        return

    messages = [
        {
            "to": token,
            "sound": "default",
            "title": title,
            "body": body,
            "data": data or {},
        }
        for token in valid_tokens
    ]

    try:
        # Batch send (Expo supports up to 100 per request)
        for i in range(0, len(messages), 100):
            batch = messages[i:i + 100]
            resp = httpx.post(
                "https://exp.host/--/api/v2/push/send",
                json=batch,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                timeout=10,
            )
            if resp.status_code != 200:
                logger.warning(f"Expo push API returned {resp.status_code}: {resp.text}")
    except Exception as e:
        logger.warning(f"Failed to send push notification: {e}")


def create_notification(
    db: Session,
    user_id: str,
    title: str,
    body: str,
    notification_type: NotificationType = NotificationType.GENERAL,
    reference_id: str | None = None,
) -> Notification:
    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=user_id,
        title=title,
        body=body,
        notification_type=notification_type,
        reference_id=reference_id,
        is_read=False,
        created_at=datetime.utcnow(),
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    # Also send push notification
    from app.models.user import User
    user = db.query(User).filter(User.id == user_id).first()
    if user and user.push_token:
        _send_push_notifications(
            [user.push_token],
            title,
            body,
            {"type": notification_type.value, "reference_id": reference_id},
        )

    return notif


def notify_all_residents(
    db: Session,
    title: str,
    body: str,
    notification_type: NotificationType = NotificationType.GENERAL,
    reference_id: str | None = None,
):
    """Send a notification to all approved residents (not admins)."""
    from app.models.user import User, UserRole
    residents = db.query(User).filter(User.role == UserRole.RESIDENT).all()
    push_tokens = []
    for resident in residents:
        create_notification(db, resident.id, title, body, notification_type, reference_id)
        # Don't double-send push here — create_notification already sends per-user push
        # But we skip the per-user push inside create_notification to batch them instead

    # Actually, create_notification already handles per-user push.
    # No extra batch needed since each create_notification call sends its own push.
