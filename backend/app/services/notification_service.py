"""Notification service — Orchestrates simultaneous in-app notification creation and Expo-based mobile push alerts."""
# Import uuid for unique primary key generation for each notification record
import uuid
# Import logging to capture push delivery failures for administrative auditing
import logging
# Import datetime for timestamping notification arrivals
from datetime import datetime
# Import SQLAlchemy Session for database persistence
from sqlalchemy.orm import Session
# Import models for notification records and their category enums
from app.models.notification import Notification, NotificationType

# Initialize a module-level logger for this service
logger = logging.getLogger(__name__)


# ── Push Notification Subsystem ──

def _send_push_notifications(db: Session, db_users: list, title: str, body: str, data: dict | None = None):
    """Bridge function to send push alerts via the Expo Push API using the official server-side SDK."""
    try:
        # Import the SDK components locally to avoid hard startup dependencies if the lib is missing
        from exponent_server_sdk import (
            PushClient,
            PushMessage,
            PushServerError,
            PushTicketError,
        )
    except ImportError:
        # Gracefully handle environments without the push engine installed
        logger.warning("Mobile notification engine (exponent_server_sdk) not detected. Bypassing push alerts.")
        return

    # Filter for users who have a valid 'ExponentPushToken' registered on their device
    valid_users = [u for u in db_users if u.push_token and u.push_token.startswith("ExponentPushToken")]
    if not valid_users:
        # Exit if no targetable devices are found
        return

    # Construct the batch of individual push messages
    messages = []
    for user in valid_users:
        messages.append(
            PushMessage(
                to=user.push_token,
                body=body,
                title=title,
                # Dynamic payload used for deep-linking in the mobile app
                data=data or {},
                # standard alert sound
                sound="default",
            )
        )

    try:
        # Execute the network request to publish the batch of messages to Expo's servers
        responses = PushClient().publish_multiple(messages)
        # Log volume of successfully dispatched signals
        logger.info(f"Broadcast successful: Dispatched {len(responses)} push alerts")
    except PushServerError as exc:
        # Handle Expo-side infrastructure errors
        logger.error(f"Expo Server Error encountered: {exc}")
    except PushTicketError as exc:
        # Handle individual message delivery/token errors
        logger.error(f"Push Ticket Error details: {exc.push_response._asdict()}")
    except Exception as exc:
        # Generic fallback for unexpected connection or logic failures
        logger.error(f"Critical failure in push dispatch logic: {exc}")


# ── In-App Notification Engine ──

def create_notification(
    db: Session,
    user_id: str,
    title: str,
    body: str,
    notification_type: NotificationType = NotificationType.GENERAL,
    reference_id: str | None = None,
    send_push: bool = True,
) -> Notification:
    """Primary entry point to alert a specific user. Handles both DB entry and optional push signal."""
    # Initialize the database record for the in-app notification inbox
    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=user_id,
        title=title,
        body=body,
        notification_type=notification_type,
        # ID of the related object (e.g., complaint_id, poll_id) for one-tap navigation
        reference_id=reference_id,
        # Default as unread for the UI indicator
        is_read=False,
        # Capture precise arrival time
        created_at=datetime.utcnow(),
    )
    # Persist the record immediately
    db.add(notif)
    db.commit()
    db.refresh(notif)

    # Trigger push notification if requested and if the user has a device token
    if send_push:
        # Import User model locally to avoid circular import issues
        from app.models.user import User
        # Retrieve the user profile to check for push credentials
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.push_token:
            # Dispatch the mobile alert
            _send_push_notifications(
                db,
                [user],
                title,
                body,
                # Context payload for mobile deep-linking
                {"type": notification_type.value, "reference_id": reference_id},
            )

    return notif


# ── Broadcast System ──

def notify_all_residents(
    db: Session,
    title: str,
    body: str,
    notification_type: NotificationType = NotificationType.GENERAL,
    reference_id: str | None = None,
    society_id: str | None = None,
):
    """Mass-broadcast system for announcements, polls, or emergency alerts targeting all approved residents."""
    # Import user/role models locally
    from app.models.user import User, UserRole
    # Build query for targetable users
    query = db.query(User).filter(User.role == UserRole.RESIDENT)
    # Restrict to a specific society if specified
    if society_id:
        query = query.filter(User.society_id == society_id)
    # Materialize the recipient list
    residents = query.all()
    
    # Batch process database entries for efficiency
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
        
    # Bulk write the inbox entries if any residents exist
    if notifications:
        db.add_all(notifications)
        db.commit()

    # Trigger a batch push dispatch for the entire resident group in one call
    _send_push_notifications(
        db,
        residents,
        title,
        body,
        {"type": notification_type.value, "reference_id": reference_id},
    )
