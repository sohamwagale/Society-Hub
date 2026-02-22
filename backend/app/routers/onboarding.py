import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole, ResidentType
from app.models.flat import Flat
from app.models.society import Society
from app.schemas.user import PendingUserOut
from app.utils.auth import get_current_user, require_role, hash_password, create_access_token


router = APIRouter(prefix="/api/onboarding", tags=["Onboarding"])


# ── Schemas ──
class JoinSocietyRequest(BaseModel):
    society_id: str
    flat_id: str
    resident_type: str  # owner, owner_family, renter, renter_family
    aadhar_number: Optional[str] = None
    pan_number: Optional[str] = None


class CreateSocietyFlat(BaseModel):
    flat_number: str
    block: str = "A"
    floor: str = "1"


class CreateSocietyRequest(BaseModel):
    society_name: str
    society_address: Optional[str] = None
    flats: List[CreateSocietyFlat] = []


class ApprovalRequest(BaseModel):
    user_id: str
    approve: bool = True


class RevokeRenterRequest(BaseModel):
    user_id: str


# ── Join Society ──
@router.post("/join", status_code=status.HTTP_200_OK)
def join_society(
    data: JoinSocietyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate resident type
    try:
        r_type = ResidentType(data.resident_type)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid resident_type. Must be one of: owner, owner_family, renter, renter_family",
        )

    # Validate society
    society = db.query(Society).filter(Society.id == data.society_id).first()
    if not society:
        raise HTTPException(status_code=400, detail="Invalid society")

    flat = db.query(Flat).filter(Flat.id == data.flat_id, Flat.society_id == society.id).first()
    if not flat:
        raise HTTPException(status_code=400, detail="Invalid flat for this society")

    # ── Owner ──
    if r_type == ResidentType.OWNER:
        if flat.owner_user_id and flat.owner_user_id != current_user.id:
            raise HTTPException(status_code=400, detail="This flat already has an owner")
        if not data.aadhar_number or not data.pan_number:
            raise HTTPException(status_code=400, detail="Aadhaar and PAN are required for flat owners")

        current_user.resident_type = ResidentType.OWNER
        current_user.aadhar_number = data.aadhar_number
        current_user.pan_number = data.pan_number
        flat.owner_user_id = current_user.id
        current_user.is_approved = True  # self-approved
        current_user.is_approved_by_admin = False  # needs admin

    # ── Owner Family ──
    elif r_type == ResidentType.OWNER_FAMILY:
        existing_owner = db.query(User).filter(
            User.flat_id == flat.id,
            User.resident_type == ResidentType.OWNER,
            User.is_approved_by_admin == True
        ).first()
        if not existing_owner:
            raise HTTPException(status_code=400, detail="Flat has no approved owner yet; owner must join first")
        
        # Ensure flat.owner_user_id is in sync for legacy users
        flat.owner_user_id = existing_owner.id
        
        if data.aadhar_number:
            current_user.aadhar_number = data.aadhar_number
        if data.pan_number:
            current_user.pan_number = data.pan_number

        current_user.resident_type = ResidentType.OWNER_FAMILY
        current_user.is_approved = False  # owner must approve
        current_user.is_approved_by_admin = True  # not needed

    # ── Renter ──
    elif r_type == ResidentType.RENTER:
        # Check there's an approved owner
        existing_owner = db.query(User).filter(
            User.flat_id == flat.id,
            User.resident_type == ResidentType.OWNER,
            User.is_approved_by_admin == True
        ).first()
        if not existing_owner:
            raise HTTPException(status_code=400, detail="Flat has no approved owner yet; owner must join first")
        
        flat.owner_user_id = existing_owner.id
        
        # Check no existing renter
        existing_renter = db.query(User).filter(
            User.flat_id == flat.id,
            User.resident_type == ResidentType.RENTER,
        ).first()
        if existing_renter and existing_renter.id != current_user.id:
            raise HTTPException(status_code=400, detail="This flat already has a renter")
        if data.aadhar_number:
            current_user.aadhar_number = data.aadhar_number
        if data.pan_number:
            current_user.pan_number = data.pan_number

        current_user.resident_type = ResidentType.RENTER
        current_user.is_approved = False  # owner must approve
        current_user.is_approved_by_admin = True  # not needed

    # ── Renter Family ──
    elif r_type == ResidentType.RENTER_FAMILY:
        # Check there's an approved renter on this flat
        existing_renter = db.query(User).filter(
            User.flat_id == flat.id,
            User.resident_type == ResidentType.RENTER,
            User.is_approved == True,  # noqa: E712
        ).first()
        if not existing_renter:
            raise HTTPException(status_code=400, detail="Flat has no approved renter yet; main renter must join first")
        if data.aadhar_number:
            current_user.aadhar_number = data.aadhar_number
        if data.pan_number:
            current_user.pan_number = data.pan_number

        current_user.resident_type = ResidentType.RENTER_FAMILY
        current_user.is_approved = False  # renter must approve
        current_user.is_approved_by_admin = True  # not needed

    current_user.society_id = society.id
    current_user.flat_id = flat.id

    db.commit()
    db.refresh(current_user)
    return {"detail": "Join request submitted", "user_id": current_user.id}


# ── Create Society (authenticated user becomes admin) ──
@router.post("/create-society", status_code=status.HTTP_201_CREATED)
def create_society(
    data: CreateSocietyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.society_id:
        raise HTTPException(status_code=400, detail="You already belong to a society")

    # Create society
    society = Society(
        id=str(uuid.uuid4()),
        name=data.society_name,
        address=data.society_address,
    )
    db.add(society)

    # Create flats
    for f in data.flats:
        flat = Flat(
            id=str(uuid.uuid4()),
            flat_number=f.flat_number,
            block=f.block,
            floor=f.floor,
            society_id=society.id,
        )
        db.add(flat)

    # Promote user to admin
    current_user.role = UserRole.ADMIN
    current_user.society_id = society.id
    current_user.is_approved = True
    current_user.is_approved_by_admin = True

    db.commit()
    db.refresh(current_user)
    db.refresh(society)

    return {
        "detail": "Society created successfully",
        "society_id": society.id,
        "flats_created": len(data.flats),
    }


# ── Pending Approvals (context-aware) ──
@router.get("/pending-approvals")
def get_pending_approvals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = []

    # Admin: sees pending owners in their society
    if current_user.role == UserRole.ADMIN and current_user.society_id:
        pending = db.query(User).filter(
            User.society_id == current_user.society_id,
            User.resident_type == ResidentType.OWNER,
            User.is_approved_by_admin == False,  # noqa: E712
        ).all()
        for u in pending:
            flat = db.query(Flat).filter(Flat.id == u.flat_id).first()
            results.append({
                "id": u.id, "name": u.name, "email": u.email, "phone": u.phone,
                "resident_type": u.resident_type.value if u.resident_type else None,
                "flat_number": flat.flat_number if flat else None,
                "block": flat.block if flat else None,
                "floor": flat.floor if flat else None,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            })

    # Owner: sees pending owner_family and renters on their flat
    if current_user.resident_type == ResidentType.OWNER and current_user.flat_id:
        pending = db.query(User).filter(
            User.flat_id == current_user.flat_id,
            User.resident_type.in_([ResidentType.OWNER_FAMILY, ResidentType.RENTER]),
            User.is_approved == False,  # noqa: E712
        ).all()
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

    # Renter: sees pending renter_family on their flat
    if current_user.resident_type == ResidentType.RENTER and current_user.flat_id and current_user.is_approved:
        pending = db.query(User).filter(
            User.flat_id == current_user.flat_id,
            User.resident_type == ResidentType.RENTER_FAMILY,
            User.is_approved == False,  # noqa: E712
        ).all()
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

    return results


# ── Approve / Reject ──
@router.post("/approve", status_code=status.HTTP_200_OK)
def approve_user(
    data: ApprovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target = db.query(User).filter(User.id == data.user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Admin approving an owner
    if (
        current_user.role == UserRole.ADMIN
        and target.resident_type == ResidentType.OWNER
        and target.society_id == current_user.society_id
    ):
        target.is_approved_by_admin = data.approve
        if not data.approve:
            # Rejected: remove from flat
            flat = db.query(Flat).filter(Flat.id == target.flat_id).first()
            if flat and flat.owner_user_id == target.id:
                flat.owner_user_id = None
            target.flat_id = None
            target.society_id = None
            target.resident_type = None
        db.commit()
        return {"detail": "Owner approval updated"}

    # Owner approving owner_family or renter
    if (
        current_user.resident_type == ResidentType.OWNER
        and current_user.flat_id
        and target.flat_id == current_user.flat_id
        and target.resident_type in (ResidentType.OWNER_FAMILY, ResidentType.RENTER)
    ):
        target.is_approved = data.approve
        if not data.approve:
            target.flat_id = None
            target.society_id = None
            target.resident_type = None
        db.commit()
        return {"detail": "Resident approval updated"}

    # Renter approving renter_family
    if (
        current_user.resident_type == ResidentType.RENTER
        and current_user.is_approved
        and current_user.flat_id
        and target.flat_id == current_user.flat_id
        and target.resident_type == ResidentType.RENTER_FAMILY
    ):
        target.is_approved = data.approve
        if not data.approve:
            target.flat_id = None
            target.society_id = None
            target.resident_type = None
        db.commit()
        return {"detail": "Renter family approval updated"}

    raise HTTPException(status_code=403, detail="You are not authorized to approve this user")


# ── Revoke Renter (owner only) ──
@router.post("/revoke-renter", status_code=status.HTTP_200_OK)
def revoke_renter(
    data: RevokeRenterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.resident_type != ResidentType.OWNER or not current_user.flat_id:
        raise HTTPException(status_code=403, detail="Only flat owners can revoke renters")

    target = db.query(User).filter(
        User.id == data.user_id,
        User.flat_id == current_user.flat_id,
        User.resident_type == ResidentType.RENTER,
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="Renter not found on your flat")

    # Cascade: remove all renter_family members too
    renter_family = db.query(User).filter(
        User.flat_id == current_user.flat_id,
        User.resident_type == ResidentType.RENTER_FAMILY,
    ).all()

    for member in renter_family:
        member.flat_id = None
        member.society_id = None
        member.resident_type = None
        member.is_approved = False

    target.flat_id = None
    target.society_id = None
    target.resident_type = None
    target.is_approved = False

    db.commit()
    return {"detail": f"Renter revoked. {len(renter_family)} family members also removed."}
