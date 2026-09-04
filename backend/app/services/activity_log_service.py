import uuid
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.activity_log import ActivityLog

logger = logging.getLogger(__name__)

def log_activity(
    db: Session,
    user_id: str,
    society_id: str | None,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    details: str | None = None,
) -> ActivityLog | None:
    """Helper to record audit trail entries across administrative and resident actions."""
    try:
        log_entry = ActivityLog(
            id=str(uuid.uuid4()),
            user_id=user_id,
            society_id=society_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
            created_at=datetime.utcnow(),
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry
    except Exception as e:
        logger.error(f"Failed to log activity '{action}': {e}")
        db.rollback()
        return None
