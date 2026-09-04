from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.activity_log import ActivityLog
from app.core.deps import require_role

router = APIRouter()


@router.get("/")
def list_activity_log(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    entity_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    """Retrieve paged audit logs for the current admin's society."""
    q = db.query(ActivityLog)
    if admin.society_id:
        q = q.filter(ActivityLog.society_id == admin.society_id)
    if entity_type:
        q = q.filter(ActivityLog.entity_type == entity_type)

    logs = q.order_by(ActivityLog.created_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id": l.id,
            "user_id": l.user_id,
            "user_name": l.user.name if l.user else "System",
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "details": l.details,
            "created_at": l.created_at.isoformat(),
        }
        for l in logs
    ]
