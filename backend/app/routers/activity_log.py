"""Activity log router — admin-only audit trail."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.activity_log import ActivityLog
from app.utils.auth import require_role

router = APIRouter(prefix="/api/activity-log", tags=["Activity Log"])


@router.get("")
def list_activity_log(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    entity_type: str | None = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    q = db.query(ActivityLog)
    if entity_type:
        q = q.filter(ActivityLog.entity_type == entity_type)
    logs = q.order_by(ActivityLog.created_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id": l.id,
            "user_id": l.user_id,
            "user_name": l.user.name if l.user else None,
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "details": l.details,
            "created_at": l.created_at.isoformat(),
        }
        for l in logs
    ]
