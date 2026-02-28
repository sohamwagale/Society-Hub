"""Notification service — creates in-app notifications + sends push notifications via Expo."""
import uuid
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.notification import Notification, NotificationType

logger = logging.getLogger(__name__)


def _send_push_notifications(db: Session, db_users: list, title: str, body: str, data: dict | None = None):
    """Send push notifications via Expo Push API using exponent-server-sdk."""
    try:
        from exponent_server_sdk import (
            PushClient,
            PushMessage,
            PushServerError,
            PushTicketError,
        )
    except ImportError:
        logger.warning("exponent_server_sdk is not installed. Skipping push notifications.")
        return

    valid_users = [u for u in db_users if u.push_token and u.push_token.startswith("ExponentPushToken")]
    if not valid_users:
        return

    messages = []
    for user in valid_users:
        messages.append(
            PushMessage(
                to=user.push_token,
                body=body,
                title=title,
                data=data or {},
                sound="default",
            )
        )

    try:
        # Publish multiple messages. In the video version we keep it simple and just fire them.
        responses = PushClient().publish_multiple(messages)
        # Assuming success if no exception thrown by PushClient
        logger.info(f"Successfully pushed {len(responses)} notifications")
    except PushServerError as exc:
        logger.error(f"PushServerError: {exc}")
    except PushTicketError as exc:
        logger.error(f"PushTicketError: {exc.push_response._asdict()}")
    except Exception as exc:
        logger.error(f"Failed to publish push notifications: {exc}")


def create_notification(
    db: Session,
    user_id: str,
    title: str,
    body: str,
    notification_type: NotificationType = NotificationType.GENERAL,
    reference_id: str | None = None,
    send_push: bool = True,
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

    if send_push:
        from app.models.user import User
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.push_token:
            _send_push_notifications(
                db,
                [user],
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
    society_id: str | None = None,
):
    """Send a notification to all approved residents of a society."""
    from app.models.user import User, UserRole
    query = db.query(User).filter(User.role == UserRole.RESIDENT)
    if society_id:
        query = query.filter(User.society_id == society_id)
    residents = query.all()
    
    notifications = []
    for resident in residents:
        notif = Notification(
            id=str(uuid.uuid4()),
            user_id=resident.id,
            title=title,
            body=body,
            notification_type=notification_type,
            reference_id=reference_id,
            is_read=False,
            created_at=datetime.utcnow(),
        )
        notifications.append(notif)
        
    if notifications:
        db.add_all(notifications)
        db.commit()

    # Batch send pushes
    _send_push_notifications(
        db,
        residents,
        title,
        body,
        {"type": notification_type.value, "reference_id": reference_id},
    )
