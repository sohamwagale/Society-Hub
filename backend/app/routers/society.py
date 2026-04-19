# Import uuid for generating unique identifiers for emergency contacts
import uuid
# Import FastAPI utilities for routing, dependency injection, and error handling
from fastapi import APIRouter, Depends, HTTPException
# Import SQLAlchemy for database sessions
from sqlalchemy.orm import Session
# Import the database session dependency
from app.database import get_db
# Import User model for authentication context
from app.models.user import User
# Import society-specific models for information and contacts
from app.models.society_info import SocietyInfo, EmergencyContact
# Import base Society model
from app.models.society import Society
# Import Flat model for property listing
from app.models.flat import Flat
# Import schemas for structured request and response data
from app.schemas.society import (
    SocietyInfoOut,
    SocietyInfoUpdate,
    EmergencyContactCreate,
    EmergencyContactOut,
    SocietyCreate,
    SocietyOut,
)
# Import authentication utilities for session tracking and role enforcement
from app.utils.auth import get_current_user, require_role

# Initialize the router with a prefix and tags for cleaner API documentation
router = APIRouter(prefix="/api/society", tags=["Society"])


# ── Societies Management (Multi-society Support) ──

# GET endpoint to list all available societies in the system
@router.get("", response_model=list[SocietyOut])
def list_societies(db: Session = Depends(get_db)):
    # Query and return societies ordered alphabetically by name
    return db.query(Society).order_by(Society.name).all()


# POST endpoint to register a new society (Super-admin only)
@router.post("", response_model=SocietyOut, status_code=201)
def create_society(
    data: SocietyCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    # Initialize a new Society instance with provided data
    society = Society(name=data.name, address=data.address)
    # Add to database context
    db.add(society)
    # Persist the record
    db.commit()
    # Refresh to load any database-generated fields
    db.refresh(society)
    # Return the new society record
    return society


# GET endpoint to list all physical flat units belonging to a specific society
@router.get("/{society_id}/flats")
def list_flats_for_society(
    society_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    # Query flats filtered by society ID and ordered by flat number
    flats = db.query(Flat).filter(Flat.society_id == society_id).order_by(Flat.flat_number).all()
    # Return a custom JSON structure for frontend consumption
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


# ── Society Settings & Information (Key-Value metadata) ──

# GET endpoint to retrieve all society-wide configuration and info keys
@router.get("/info", response_model=list[SocietyInfoOut])
def get_society_info(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    # Return all key-value pairs from the society_info table
    return db.query(SocietyInfo).all()


# PUT endpoint to create or update a specific piece of society information (Admin only)
@router.put("/info")
def update_society_info(
    data: SocietyInfoUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    # Attempt to find the existing record by its unique key
    info = db.query(SocietyInfo).filter(SocietyInfo.key == data.key).first()
    if info:
        # Update value if key exists
        info.value = data.value
    else:
        # Create a new record if key is new
        info = SocietyInfo(key=data.key, value=data.value)
        db.add(info)
    # Commit changes
    db.commit()
    # Return the updated key-pair
    return {"key": data.key, "value": data.value}


# ── Emergency Contacts Directory ──

# GET endpoint to list all helpdesk and emergency contacts
@router.get("/emergency-contacts", response_model=list[EmergencyContactOut])
def list_emergency_contacts(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    # Return all contacts ordered alphabetically by their role (e.g., 'Electrician', 'Security')
    return db.query(EmergencyContact).order_by(EmergencyContact.role).all()


# POST endpoint to add a new contact to the directory (Admin only)
@router.post("/emergency-contacts", response_model=EmergencyContactOut, status_code=201)
def create_emergency_contact(
    data: EmergencyContactCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    # Create new contact instance with a unique UUID
    contact = EmergencyContact(
        id=str(uuid.uuid4()), name=data.name, phone=data.phone, role=data.role,
    )
    # Add and persist
    db.add(contact)
    # Commit
    db.commit()
    # Refresh record
    db.refresh(contact)
    # Return the new contact object
    return contact


# DELETE endpoint to remove a contact from the directory (Admin only)
@router.delete("/emergency-contacts/{contact_id}", status_code=204)
def delete_emergency_contact(
    contact_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    # Search for the target contact by ID
    contact = db.query(EmergencyContact).filter(EmergencyContact.id == contact_id).first()
    # Handle not found scenario
    if not contact:
        raise HTTPException(status_code=404, detail="Not found")
    # Delete the record
    db.delete(contact)
    # Commit deletion
    db.commit()
    # Return empty 204 response

