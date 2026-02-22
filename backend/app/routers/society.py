import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.society_info import SocietyInfo, EmergencyContact
from app.models.society import Society
from app.models.flat import Flat
from app.schemas.society import (
    SocietyInfoOut,
    SocietyInfoUpdate,
    EmergencyContactCreate,
    EmergencyContactOut,
    SocietyCreate,
    SocietyOut,
)
from app.utils.auth import get_current_user, require_role

router = APIRouter(prefix="/api/society", tags=["Society"])


# ── Societies (multi-society support) ──
@router.get("", response_model=list[SocietyOut])
def list_societies(db: Session = Depends(get_db)):
    return db.query(Society).order_by(Society.name).all()


@router.post("", response_model=SocietyOut, status_code=201)
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


# ── Society Info (key-value) ──
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


# ── Emergency Contacts ──
@router.get("/emergency-contacts", response_model=list[EmergencyContactOut])
def list_emergency_contacts(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(EmergencyContact).order_by(EmergencyContact.role).all()


@router.post("/emergency-contacts", response_model=EmergencyContactOut, status_code=201)
def create_emergency_contact(
    data: EmergencyContactCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    contact = EmergencyContact(
        id=str(uuid.uuid4()), name=data.name, phone=data.phone, role=data.role,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/emergency-contacts/{contact_id}", status_code=204)
def delete_emergency_contact(
    contact_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    contact = db.query(EmergencyContact).filter(EmergencyContact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(contact)
    db.commit()
