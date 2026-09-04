# Import uuid for generating unique identifiers for new societies and flats
import uuid
# Import FastAPI utilities for routing, dependency management, and error handling
from fastapi import APIRouter, Depends, HTTPException, status
# Import Pydantic for defining request body schemas
from pydantic import BaseModel
# Import type hinting for collections and optional values
from typing import Optional, List
# Import SQLAlchemy Session for database transactions
from sqlalchemy.orm import Session

# Import the main database session provider
from app.database import get_db
# Import core models for logic execution
from app.models.user import User, UserRole, ResidentType
from app.models.flat import Flat
from app.models.society import Society
# Import relevant output schema
from app.schemas.user import PendingUserOut
# Import authentication and security utilities
from app.utils.auth import get_current_user, require_role, hash_password, create_access_token


# Initialize the router for onboarding-related workflows
router = APIRouter(prefix="/api/onboarding", tags=["Onboarding"])


# ── Internal Schemas ──

# Schema for a resident's request to join an existing society
class JoinSocietyRequest(BaseModel):
    # The unique ID of the target society
    society_id: str
    # The unique ID of the specific flat within that society
    flat_id: str
    # The classification of the joiner (owner, renter, etc.)
    resident_type: str
    # Optional Aadhaar ID for identification (required for owners)
    aadhar_number: Optional[str] = None
    # Optional PAN ID for identification (required for owners)
    pan_number: Optional[str] = None


# Schema for defining a flat's physical attributes during bulk creation
class CreateSocietyFlat(BaseModel):
    # Display number of the flat (e.g., '101')
    flat_number: str
    # Block or wing of the building, defaults to 'A'
    block: str = "A"
    # Floor level of the flat, defaults to '1'
    floor: str = "1"


# Schema for the bulk society registration request
class CreateSocietyRequest(BaseModel):
    # Name of the community being registered
    society_name: str
    # Physical address of the society
    society_address: Optional[str] = None
    # Collection of flats to be pre-created for this society
    flats: List[CreateSocietyFlat] = []


# Schema for handling resident approval or rejection actions
class ApprovalRequest(BaseModel):
    # ID of the user whose request is being actioned
    user_id: str
    # Boolean flag: True to approve, False to reject/deny
    approve: bool = True


# Schema for identifying a renter to be removed from a flat
class RevokeRenterRequest(BaseModel):
    # Unique ID of the renter user
    user_id: str


# ── Join Society Logic ──

# POST endpoint for residents to request access to a society and flat
@router.post("/join", status_code=status.HTTP_200_OK)
def join_society(
    data: JoinSocietyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ── Input Validation ──
    try:
        # Cast the string resident_type to the formal Enum type
        r_type = ResidentType(data.resident_type)
    except ValueError:
        # Raise error if the provided type is not recognized by the system
        raise HTTPException(
            status_code=400,
            detail=f"Invalid resident_type: {data.resident_type}. Must be one of: owner, owner_family, renter, renter_family",
        )

    # ── Society & Flat Verification ──
    # Ensure the target society exists in the database
    society = db.query(Society).filter(Society.id == data.society_id).first()
    if not society:
        raise HTTPException(status_code=400, detail="Invalid society ID provided")

    # Ensure the target flat belongs to the specified society
    flat = db.query(Flat).filter(Flat.id == data.flat_id, Flat.society_id == society.id).first()
    if not flat:
        raise HTTPException(status_code=400, detail="The specified flat does not belong to this society")

    # ── Role-Specific Logic ──

    # Case: User is joining as a primary OWNER
    if r_type == ResidentType.OWNER:
        # Verify flat isn't already claimed by another user
        if flat.owner_user_id and flat.owner_user_id != current_user.id:
            raise HTTPException(status_code=400, detail="This flat already has an assigned owner")
        # Enforce KYC requirements for owners
        if not data.aadhar_number or not data.pan_number:
            raise HTTPException(status_code=400, detail="Aadhaar and PAN are mandatory for primary flat owners")

        # Update user profile with owner status and identification
        current_user.resident_type = ResidentType.OWNER
        current_user.aadhar_number = data.aadhar_number
        current_user.pan_number = data.pan_number
        # Link the user as the official owner of the flat record
        flat.owner_user_id = current_user.id
        # Owners are self-validating regarding intent
        current_user.is_approved = True
        # but still require official validation by the society admin
        current_user.is_approved_by_admin = False

    # Case: User is joining as the FAMILY member of an owner
    elif r_type == ResidentType.OWNER_FAMILY:
        # Check if an approved owner is already registered on this flat
        existing_owner = db.query(User).filter(
            User.flat_id == flat.id,
            User.resident_type == ResidentType.OWNER,
            User.is_approved_by_admin == True
        ).first()
        if not existing_owner:
            # Family members cannot join before the primary owner is active
            raise HTTPException(status_code=400, detail="No approved owner found for this flat; the owner must join first")
        
        # Ensure flat metadata is consistent
        flat.owner_user_id = existing_owner.id
        
        # Update identification if provided
        if data.aadhar_number:
            current_user.aadhar_number = data.aadhar_number
        if data.pan_number:
            current_user.pan_number = data.pan_number

        # set residency type
        current_user.resident_type = ResidentType.OWNER_FAMILY
        # requires approval from the primary owner of the flat
        current_user.is_approved = False
        # No additional admin approval needed for family after owner approves
        current_user.is_approved_by_admin = True

    # Case: User is joining as a primary RENTER (tenant)
    elif r_type == ResidentType.RENTER:
        # Verify there is a valid owner who can approve this tenancy
        existing_owner = db.query(User).filter(
            User.flat_id == flat.id,
            User.resident_type == ResidentType.OWNER,
            User.is_approved_by_admin == True
        ).first()
        if not existing_owner:
            raise HTTPException(status_code=400, detail="No approved owner found for this flat; owner must join first to approve renters")
        
        # Sync owner info
        flat.owner_user_id = existing_owner.id
        
        # Prevent multiple active renter entities on same flat
        existing_renter = db.query(User).filter(
            User.flat_id == flat.id,
            User.resident_type == ResidentType.RENTER,
        ).first()
        if existing_renter and existing_renter.id != current_user.id:
            raise HTTPException(status_code=400, detail="This flat already has an active renter")
        # Update Renter properties
        if data.aadhar_number:
            current_user.aadhar_number = data.aadhar_number
        if data.pan_number:
            current_user.pan_number = data.pan_number

        current_user.resident_type = ResidentType.RENTER
        # Requires explicit approval from the flat owner
        current_user.is_approved = False
        # No extra admin step needed
        current_user.is_approved_by_admin = True

    # Case: User is joining as the FAMILY member of a renter
    elif r_type == ResidentType.RENTER_FAMILY:
        # Verify the primary renter is already active and approved
        existing_renter = db.query(User).filter(
            User.flat_id == flat.id,
            User.resident_type == ResidentType.RENTER,
            User.is_approved == True,
        ).first()
        if not existing_renter:
            raise HTTPException(status_code=400, detail="No approved main renter found; main renter must join and be approved first")
        # Update ID if provided
        if data.aadhar_number:
            current_user.aadhar_number = data.aadhar_number
        if data.pan_number:
            current_user.pan_number = data.pan_number

        current_user.resident_type = ResidentType.RENTER_FAMILY
        # Requires approval from the primary renter user
        current_user.is_approved = False
        # No extra admin step
        current_user.is_approved_by_admin = True

    # Finalize associations for the current user
    current_user.society_id = society.id
    current_user.flat_id = flat.id

    # Commit all changes (User updates and potential Flat ownership updates)
    db.commit()
    # refresh instance local data
    db.refresh(current_user)

    # return successful submission summary
    return {"detail": "Society join request submitted successfully", "user_id": current_user.id}


# ── Create Society Workflow (Authenticated user becomes the first ADMIN) ──
@router.post("/create-society", status_code=status.HTTP_201_CREATED)
def create_society(
    data: CreateSocietyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check if the user is already part of a different society
    if current_user.society_id:
        raise HTTPException(status_code=400, detail="You already belong to an existing society")

    # Step 1: Create the new Society entity
    society = Society(
        id=str(uuid.uuid4()),
        name=data.society_name,
        address=data.society_address,
    )
    db.add(society)

    # Step 2: Create all flat units defined in the request for this society
    for f in data.flats:
        flat = Flat(
            id=str(uuid.uuid4()),
            flat_number=f.flat_number,
            block=f.block,
            floor=f.floor,
            society_id=society.id,
        )
        db.add(flat)

    # Step 3: Promote the creator user to ADMIN of this new society
    current_user.role = UserRole.ADMIN
    current_user.society_id = society.id
    # Creator admins are automatically approved
    current_user.is_approved = True
    current_user.is_approved_by_admin = True

    # Step 4: Persist the entire new society tree
    db.commit()
    # Reload local instances
    db.refresh(current_user)
    db.refresh(society)

    # Return summary of work done
    return {
        "detail": "Society and flats created successfully. You are now the administrator.",
        "society_id": society.id,
        "flats_created": len(data.flats),
    }


# ── Pending Approval Fetching (Context-Aware relative to the logged-in user) ──
@router.get("/pending-approvals")
def get_pending_approvals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # List to hold unified results for the UI
    results = []

    # ── Admin Context ──
    # Society Admins see primary OWNERS waiting for society-level validation
    if current_user.role == UserRole.ADMIN and current_user.society_id:
        pending = db.query(User).filter(
            User.society_id == current_user.society_id,
            User.resident_type == ResidentType.OWNER,
            User.is_approved_by_admin == False,
        ).all()
        # Compile detail for each pending owner
        for u in pending:
            # identify their claimed flat
            flat = db.query(Flat).filter(Flat.id == u.flat_id).first()
            results.append({
                "id": u.id, "name": u.name, "email": u.email, "phone": u.phone,
                "resident_type": u.resident_type.value if u.resident_type else None,
                "flat_number": flat.flat_number if flat else None,
                "block": flat.block if flat else None,
                "floor": flat.floor if flat else None,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            })

    # ── Owner Context ──
    # Flat Owners see RENTERS or FAMILY members waiting for flat-level validation
    if current_user.resident_type == ResidentType.OWNER and current_user.flat_id:
        pending = db.query(User).filter(
            User.flat_id == current_user.flat_id,
            # Owners approve family and tenants
            User.resident_type.in_([ResidentType.OWNER_FAMILY, ResidentType.RENTER]),
            User.is_approved == False,
        ).all()
        # retrieve current flat info for consistency
        flat = db.query(Flat).filter(Flat.id == current_user.flat_id).first()
        for u in pending:
            results.append({
                "id": u.id, "name": u.name, "email": u.email, "phone": u.phone,
                "resident_type": u.resident_type.value if u.resident_type else None,
                "flat_number": flat.flat_number if flat else None,
                "block": flat.block if flat else None,
                "floor": flat.floor if flat else None,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            })

    # ── Renter Context ──
    # Main Tenants see their own family members waiting for approval
    if current_user.resident_type == ResidentType.RENTER and current_user.flat_id and current_user.is_approved:
        pending = db.query(User).filter(
            User.flat_id == current_user.flat_id,
            User.resident_type == ResidentType.RENTER_FAMILY,
            User.is_approved == False,
        ).all()
        # Flat details
        flat = db.query(Flat).filter(Flat.id == current_user.flat_id).first()
        for u in pending:
            results.append({
                "id": u.id, "name": u.name, "email": u.email, "phone": u.phone,
                "resident_type": u.resident_type.value if u.resident_type else None,
                "flat_number": flat.flat_number if flat else None,
                "block": flat.block if flat else None,
                "floor": flat.floor if flat else None,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            })

    # Return the collected list of users needing action
    return results


# ── Resident Approval & Rejection Logic ──
@router.post("/approve", status_code=status.HTTP_200_OK)
def approve_user(
    data: ApprovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Locate the target user being processed
    target = db.query(User).filter(User.id == data.user_id).first()
    # Error if target is missing
    if not target:
        raise HTTPException(status_code=404, detail="Target user not found")

    # flow 1: Admin validating a primary Owner's residency
    if (
        current_user.role == UserRole.ADMIN
        and target.resident_type == ResidentType.OWNER
        and target.society_id == current_user.society_id
    ):
        # Update the admin-specific approval flag
        target.is_approved_by_admin = data.approve
        # If rejected, wipe their association completely
        if not data.approve:
            # find the flat they claimed
            flat = db.query(Flat).filter(Flat.id == target.flat_id).first()
            # Clear owner link on the flat
            if flat and flat.owner_user_id == target.id:
                flat.owner_user_id = None
            # Reset user fields
            target.flat_id = None
            target.society_id = None
            target.resident_type = None
        # Save change
        db.commit()
        return {"detail": "Owner validation status updated by administrator"}

    # flow 2: Flat Owner validating their Family or a new Renter
    if (
        current_user.resident_type == ResidentType.OWNER
        and current_user.flat_id
        and target.flat_id == current_user.flat_id
        and target.resident_type in (ResidentType.OWNER_FAMILY, ResidentType.RENTER)
    ):
        # Update the owner-specific approval flag
        target.is_approved = data.approve
        # Wipe associations if rejected
        if not data.approve:
            target.flat_id = None
            target.society_id = None
            target.resident_type = None
        db.commit()
        return {"detail": "Resident approval status updated by flat owner"}

    # flow 3: Primary Renter validating their Family
    if (
        current_user.resident_type == ResidentType.RENTER
        and current_user.is_approved
        and current_user.flat_id
        and target.flat_id == current_user.flat_id
        and target.resident_type == ResidentType.RENTER_FAMILY
    ):
        # Update approval
        target.is_approved = data.approve
        # Wipe on reject
        if not data.approve:
            target.flat_id = None
            target.society_id = None
            target.resident_type = None
        db.commit()
        return {"detail": "Renter family approval updated by main tenant"}

    # if none of the above logic matches, it's an unauthorized attempt
    raise HTTPException(status_code=403, detail="You do not have the required permissions to approve this specific user request")


# ── Renter Management (Self-service for Flat Owners) ──
@router.post("/revoke-renter", status_code=status.HTTP_200_OK)
def revoke_renter(
    data: RevokeRenterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # verify only the owner of the specific flat can perform this action
    if current_user.resident_type != ResidentType.OWNER or not current_user.flat_id:
        raise HTTPException(status_code=403, detail="Only verified flat owners can revoke renters")

    # Search for the renter residing in the owner's unit
    target = db.query(User).filter(
        User.id == data.user_id,
        User.flat_id == current_user.flat_id,
        User.resident_type == ResidentType.RENTER,
    ).first()
    # Handle renter not found on this flat
    if not target:
        raise HTTPException(status_code=404, detail="The specified renter was not found assigned to your flat")

    # ── Cascade Revocation ──
    # Automatically remove all members of the renter's family associated with this flat
    renter_family = db.query(User).filter(
        User.flat_id == current_user.flat_id,
        User.resident_type == ResidentType.RENTER_FAMILY,
    ).all()

    # Reset all family members to unassigned state
    for member in renter_family:
        member.flat_id = None
        member.society_id = None
        member.resident_type = None
        member.is_approved = False

    # Reset the primary renter to unassigned state
    target.flat_id = None
    target.society_id = None
    target.resident_type = None
    target.is_approved = False

    # commit the removal of the tenancy
    db.commit()
    # return detailed confirmation
    return {"detail": f"Tenancy revoked successfully. The renter and {len(renter_family)} family members have been removed from the flat."}

