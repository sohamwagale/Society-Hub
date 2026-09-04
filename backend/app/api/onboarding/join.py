from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.onboarding import JoinSocietyRequest
from app.core.deps import get_current_user
from app.services.onboarding_service import process_join_society

router = APIRouter()


@router.post("/join", status_code=status.HTTP_200_OK)
def join_society(
    data: JoinSocietyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Request access to join an existing society and flat."""
    return process_join_society(data, db, current_user)
