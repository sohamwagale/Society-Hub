from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.society_info import SocietyInfo
from app.schemas.society import SocietyInfoOut, SocietyInfoUpdate
from app.core.deps import get_current_user, require_role

router = APIRouter()


@router.get("/info", response_model=list[SocietyInfoOut])
def get_society_info(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(SocietyInfo).all()


@router.put("/info")
def update_society_info(
    data: SocietyInfoUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    info = db.query(SocietyInfo).filter(SocietyInfo.key == data.key).first()
    if info:
        info.value = data.value
    else:
        info = SocietyInfo(key=data.key, value=data.value)
        db.add(info)
    db.commit()
    return {"key": data.key, "value": data.value}


@router.delete("/info/{key}", status_code=204)
def delete_society_info(
    key: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    info = db.query(SocietyInfo).filter(SocietyInfo.key == key).first()
    if not info:
        raise HTTPException(status_code=404, detail="Parameter not found")
    db.delete(info)
    db.commit()
    return None
