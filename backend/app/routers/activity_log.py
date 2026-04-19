"""Activity log router — Restricted administrative audit trail for tracking system-wide changes."""
# Import FastAPI components for routing, dependencies, and paging queries
from fastapi import APIRouter, Depends, Query
# Import SQLAlchemy Session for database transactions
from sqlalchemy.orm import Session
# Import the database session utility
from app.database import get_db
# Import User model for type hinting and association mapping
from app.models.user import User
# Import ActivityLog model for DB operations
from app.models.activity_log import ActivityLog
# Import authorization utility for role-based restricted access
from app.utils.auth import require_role

# Initialize the router with a specific prefix and grouping tag
router = APIRouter(prefix="/api/activity-log", tags=["Activity Log"])


# ── Audit Trail Discovery ──

# GET endpoint to fetch a paged list of system activities (Admin Only)
@router.get("")
def list_activity_log(
    # Pagination support: skip N records
    skip: int = Query(0, ge=0),
    # Pagination support: return max N records (capped at 200 for performance)
    limit: int = Query(50, ge=1, le=200),
    # Optional filter to focus on specific entities (e.g., 'billing', 'resident')
    entity_type: str | None = Query(None),
    db: Session = Depends(get_db),
    # Guard the endpoint: strictly for society administrators
    _: User = Depends(require_role("admin")),
):
    # Base query for the audit log
    q = db.query(ActivityLog)
    
    # ── Filtering Logic ──
    if entity_type:
        q = q.filter(ActivityLog.entity_type == entity_type)
    
    # Execute query with paging and sorting (most recent activity first)
    logs = q.order_by(ActivityLog.created_at.desc()).offset(skip).limit(limit).all()
    
    # ── Custom Serialization ──
    # Manually mapping fields + injecting user metadata for a flat, frontend-friendly response
    return [
        {
            "id": l.id,
            "user_id": l.user_id,
            # Eagerly map the name of the user who performed the action
            "user_name": l.user.name if l.user else "System Process",
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            # JSON/Textual description of the change
            "details": l.details,
            # Standardize timestamp format
            "created_at": l.created_at.isoformat(),
        }
        for l in logs
    ]
