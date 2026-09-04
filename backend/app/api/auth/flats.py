import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.flat import Flat
from app.schemas.user import FlatOut, FlatCreate, FlatAssign
from app.core.deps import get_current_user, require_role

router = APIRouter()


@router.get("/flats", response_model=list[FlatOut])
def list_flats(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.query(Flat).all()


@router.post("/flats", response_model=FlatOut, status_code=status.HTTP_201_CREATED)
def create_flat(
    data: FlatCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    flat = Flat(
        id=str(uuid.uuid4()),
        flat_number=data.flat_number,
        block=data.block,
        floor=data.floor,
    )
    db.add(flat)
    db.commit()
    db.refresh(flat)
    return flat


@router.put("/assign-flat")
def assign_flat(
    data: FlatAssign,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    user = db.query(User).filter(User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.flat_id:
        flat = db.query(Flat).filter(Flat.id == data.flat_id).first()
        if not flat:
            raise HTTPException(status_code=404, detail="Flat not found")

    user.flat_id = data.flat_id
    db.commit()
    return {"detail": "Flat assignment updated"}
