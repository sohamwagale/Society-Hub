import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.user import User
from app.models.flat import Flat
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/residents", tags=["Residents"])


class ResidentOut:
    pass  # we use dicts directly for flexibility


@router.get("")
def list_residents(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    residents = db.query(User).options(joinedload(User.flat)).order_by(User.name).all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "email": r.email,
            "phone": r.phone,
            "role": r.role.value,
            "flat_number": r.flat.flat_number if r.flat else None,
            "block": r.flat.block if r.flat else None,
            "floor": r.flat.floor if r.flat else None,
            "is_committee": r.is_committee,
            "committee_role": r.committee_role,
        }
        for r in residents
    ]


@router.put("/{user_id}/committee")
def set_committee_role(
    user_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_user), # We'll enforce role inside for now or use dependency
):
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_committee = payload.get("is_committee", False)
    user.committee_role = payload.get("committee_role", None)
    db.commit()
    return {"detail": "Committee role updated"}


@router.get("/stats")
def resident_stats(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    total_residents = db.query(User).filter(User.role == "resident").count()
    total_flats = db.query(Flat).count()
    occupied_flats = db.query(Flat).filter(Flat.residents.any()).count()
    vacant_flats = total_flats - occupied_flats
    return {
        "total_residents": total_residents,
        "total_flats": total_flats,
        "occupied_flats": occupied_flats,
        "vacant_flats": vacant_flats,
    }
