from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole, ResidentType
from app.models.flat import Flat
from app.schemas.onboarding import ApprovalRequest
from app.core.deps import get_current_user
from app.services.onboarding_service import process_approval

router = APIRouter()


@router.get("/pending-approvals")
def get_pending_approvals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = []

    # Admin Context: owners awaiting validation
    if current_user.role == UserRole.ADMIN and current_user.society_id:
        pending = db.query(User).filter(
            User.society_id == current_user.society_id,
            User.resident_type == ResidentType.OWNER,
            User.is_approved_by_admin == False,
        ).all()
        for u in pending:
            flat = db.query(Flat).filter(Flat.id == u.flat_id).first()
            results.append({
                "id": u.id, "name": u.name, "email": u.email, "phone": u.phone,
                "resident_type": u.resident_type.value if u.resident_type else None,
                "flat_number": flat.flat_number if flat else None,
                "block": flat.block if flat else None,
                "floor": flat.floor if flat else None,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            })

    # Owner Context: family or tenants awaiting approval
    if current_user.resident_type == ResidentType.OWNER and current_user.flat_id:
        pending = db.query(User).filter(
            User.flat_id == current_user.flat_id,
            User.resident_type.in_([ResidentType.OWNER_FAMILY, ResidentType.RENTER]),
            User.is_approved == False,
        ).all()
        flat = db.query(Flat).filter(Flat.id == current_user.flat_id).first()
        for u in pending:
            results.append({
                "id": u.id, "name": u.name, "email": u.email, "phone": u.phone,
                "resident_type": u.resident_type.value if u.resident_type else None,
                "flat_number": flat.flat_number if flat else None,
                "block": flat.block if flat else None,
                "floor": flat.floor if flat else None,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            })

    # Renter Context: family members
    if current_user.resident_type == ResidentType.RENTER and current_user.flat_id and current_user.is_approved:
        pending = db.query(User).filter(
            User.flat_id == current_user.flat_id,
            User.resident_type == ResidentType.RENTER_FAMILY,
            User.is_approved == False,
        ).all()
        flat = db.query(Flat).filter(Flat.id == current_user.flat_id).first()
        for u in pending:
            results.append({
                "id": u.id, "name": u.name, "email": u.email, "phone": u.phone,
                "resident_type": u.resident_type.value if u.resident_type else None,
                "flat_number": flat.flat_number if flat else None,
                "block": flat.block if flat else None,
                "floor": flat.floor if flat else None,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            })

    return results


@router.post("/approve", status_code=status.HTTP_200_OK)
def approve_user(
    data: ApprovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return process_approval(data, db, current_user)
