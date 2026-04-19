# Import uuid for potential unique identifier generation
import uuid
# Import FastAPI utilities for routing, dependencies, and error handling
from fastapi import APIRouter, Depends, HTTPException
# Import SQLAlchemy for database sessions and eager loading (joinedload)
from sqlalchemy.orm import Session, joinedload
# Import database session dependency
from app.database import get_db
# Import User model for resident data
from app.models.user import User
# Import Flat model for property details
from app.models.flat import Flat
# Import authentication utility to retrieve the current user
from app.utils.auth import get_current_user

# Initialize the router with a prefix and tags for documentation
router = APIRouter(prefix="/api/residents", tags=["Residents"])


# Dummy class placeholder (unused, as we return dictionaries for data flexibility)
class ResidentOut:
    pass


# GET endpoint to list all residents belonging to the current user's society
@router.get("")
def list_residents(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Query all users tied to the same society as the logged-in user
    residents = (
        db.query(User)
        # Eagerly load the flat details to avoid N+1 query problems
        .options(joinedload(User.flat))
        # Filter by the society ID of the current user
        .filter(User.society_id == current_user.society_id)
        # Sort alphabetically by name
        .order_by(User.name)
        .all()
    )
    # Transform database objects into a lean list of dictionaries for the frontend
    return [
        {
            "id": r.id,
            "name": r.name,
            "email": r.email,
            "phone": r.phone,
            # Map the role enum value to a string
            "role": r.role.value,
            # Flatten flat details for easier consumption in mobile UI
            "flat_number": r.flat.flat_number if r.flat else None,
            "block": r.flat.block if r.flat else None,
            "floor": r.flat.floor if r.flat else None,
            # Include committee-specific flags
            "is_committee": r.is_committee,
            "committee_role": r.committee_role,
        }
        for r in residents
    ]


# PUT endpoint to toggle a user's committee status and specific role (Admin only)
@router.put("/{user_id}/committee")
def set_committee_role(
    user_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_user),
):
    # Manual check for admin role (can also be a dependency)
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Find the target user by their unique ID
    user = db.query(User).filter(User.id == user_id).first()
    # Handle user not found scenario
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Update committee status and role from request payload
    user.is_committee = payload.get("is_committee", False)
    user.committee_role = payload.get("committee_role", None)
    # Persist the changes
    db.commit()
    # return success confirmation
    return {"detail": "Committee role updated"}


# GET endpoint to retrieve summary statistics for the society
@router.get("/stats")
def resident_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Extract the society ID for efficiency
    sid = current_user.society_id
    # Count all users with the 'resident' role in this society
    total_residents = db.query(User).filter(User.role == "resident", User.society_id == sid).count()
    # Count all flat records belonging to this society
    total_flats = db.query(Flat).filter(Flat.society_id == sid).count()
    # Count flats that have at least one associated resident in this society
    occupied_flats = (
        db.query(Flat)
        .filter(Flat.society_id == sid)
        .filter(Flat.residents.any(User.society_id == sid))
        .count()
    )
    # Calculate vacant flats locally
    vacant_flats = total_flats - occupied_flats
    # return the statistical overview
    return {
        "total_residents": total_residents,
        "total_flats": total_flats,
        "occupied_flats": occupied_flats,
        "vacant_flats": vacant_flats,
    }

