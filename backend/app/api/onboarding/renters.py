from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.onboarding import RevokeRenterRequest
from app.core.deps import get_current_user
from app.services.onboarding_service import process_revoke_renter

router = APIRouter()


@router.post("/revoke-renter", status_code=status.HTTP_200_OK)
def revoke_renter(
    data: RevokeRenterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revoke tenancy of a renter and cascade to their family members."""
    return process_revoke_renter(data, db, current_user)
