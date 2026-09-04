from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.database import get_db
from app.models.user import User
from app.models.activity_log import ActivityLog
from app.core.config import SECRET_KEY, ALGORITHM
from app.services.export_service import generate_activity_log_csv

router = APIRouter()


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
    buffer = generate_activity_log_csv(logs)

    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="society_audit_logs_{date.today().isoformat()}.csv"'},
    )
