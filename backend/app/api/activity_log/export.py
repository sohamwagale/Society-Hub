from datetime import date
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.activity_log import ActivityLog
from app.core.deps import require_role
from app.services.export_service import generate_activity_log_csv

router = APIRouter()


@router.get("/export-csv")
def export_activity_log_csv(
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Stream CSV file of all society audit logs for administrative auditors."""
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
