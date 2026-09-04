from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.core.deps import get_current_user
from app.services.dashboard_service import compute_dashboard_stats

router = APIRouter()


@router.get("/stats")
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve comprehensive KPIs and metrics for the dashboard."""
    return compute_dashboard_stats(db, current_user)
