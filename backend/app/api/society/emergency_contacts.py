import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.society_info import EmergencyContact
from app.schemas.society import EmergencyContactCreate, EmergencyContactOut
from app.core.deps import get_current_user, require_role

router = APIRouter()


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
    return None


@router.put("/emergency-contacts/{contact_id}", response_model=EmergencyContactOut)
def update_emergency_contact(
    contact_id: str,
    data: EmergencyContactCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    contact = db.query(EmergencyContact).filter(EmergencyContact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    contact.name = data.name
    contact.phone = data.phone
    contact.role = data.role
    db.commit()
    db.refresh(contact)
    return contact
