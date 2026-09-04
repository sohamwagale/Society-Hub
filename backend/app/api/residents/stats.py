from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.flat import Flat
from app.core.deps import get_current_user

router = APIRouter()


@router.get("/stats")
def resident_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sid = current_user.society_id
    total_residents = db.query(User).filter(User.role == "resident", User.society_id == sid).count()
    total_flats = db.query(Flat).filter(Flat.society_id == sid).count()
    occupied_flats = (
        db.query(Flat)
        .filter(Flat.society_id == sid)
        .filter(Flat.residents.any(User.society_id == sid))
        .count()
    )
    vacant_flats = total_flats - occupied_flats
    return {
        "total_residents": total_residents,
        "total_flats": total_flats,
        "occupied_flats": occupied_flats,
        "vacant_flats": vacant_flats,
    }
