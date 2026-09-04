from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.user import User
from app.core.deps import get_current_user

router = APIRouter()


@router.get("/")
def list_residents(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    residents = (
        db.query(User)
        .options(joinedload(User.flat))
        .filter(User.society_id == current_user.society_id)
        .order_by(User.name)
        .all()
    )
    return [
        {
            "id": r.id,
            "name": r.name,
            "email": r.email,
            "phone": r.phone,
            "role": r.role.value,
            "flat_id": r.flat_id,
            "resident_type": r.resident_type.value if r.resident_type else None,
            "flat_number": r.flat.flat_number if r.flat else None,
            "block": r.flat.block if r.flat else None,
            "floor": r.flat.floor if r.flat else None,
            "is_committee": r.is_committee,
            "committee_role": r.committee_role,
        }
        for r in residents
    ]
