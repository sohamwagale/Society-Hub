"""Activity log router — Restricted administrative audit trail for tracking system-wide changes."""
import csv
import io
from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from app.database import get_db
from app.models.user import User
from app.models.activity_log import ActivityLog
from app.utils.auth import require_role, SECRET_KEY, ALGORITHM

router = APIRouter(prefix="/api/activity-log", tags=["Activity Log"])


@router.get("")
def list_activity_log(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    entity_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    """Retrieve paged audit logs for the current admin's society."""
    q = db.query(ActivityLog)

    # Filter by society_id directly — no JOIN needed
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


@router.get("/export-csv")
def export_activity_log_csv(
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Stream CSV file of all society audit logs for administrative auditors."""
    if not token:
        raise HTTPException(status_code=401, detail="Authentication token required (?token=)")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    admin = db.query(User).filter(User.id == user_id).first()
    if not admin or admin.role.value != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required for audit log export")

    q = db.query(ActivityLog)
    if admin.society_id:
        q = q.filter(ActivityLog.society_id == admin.society_id)

    logs = q.order_by(ActivityLog.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Timestamp (UTC)", "User Name", "User ID", "Action", "Entity Type", "Entity ID", "Details"])

    for l in logs:
        writer.writerow([
            l.created_at.strftime("%Y-%m-%d %H:%M:%S") if l.created_at else "",
            l.user.name if l.user else "System",
            l.user_id or "",
            l.action,
            l.entity_type or "",
            l.entity_id or "",
            l.details or "",
        ])

    buffer = io.BytesIO(output.getvalue().encode("utf-8-sig"))
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="society_audit_logs_{date.today().isoformat()}.csv"'},
    )
