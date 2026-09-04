from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.society import Society
from app.models.flat import Flat
from app.schemas.society import SocietyCreate, SocietyOut
from app.core.deps import get_current_user, require_role

router = APIRouter()


@router.get("/", response_model=list[SocietyOut])
def list_societies(db: Session = Depends(get_db)):
    return db.query(Society).order_by(Society.name).all()


@router.post("/", response_model=SocietyOut, status_code=201)
def create_society(
    data: SocietyCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    society = Society(name=data.name, address=data.address)
    db.add(society)
    db.commit()
    db.refresh(society)
    return society


@router.get("/{society_id}/flats")
def list_flats_for_society(
    society_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    flats = db.query(Flat).filter(Flat.society_id == society_id).order_by(Flat.flat_number).all()
    return [
        {
            "id": f.id,
            "flat_number": f.flat_number,
            "block": f.block,
            "floor": f.floor,
            "owner_user_id": f.owner_user_id,
        }
        for f in flats
    ]
