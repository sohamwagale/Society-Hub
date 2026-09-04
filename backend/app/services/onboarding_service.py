from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.user import User, UserRole, ResidentType
from app.models.flat import Flat
from app.models.society import Society
from app.schemas.onboarding import JoinSocietyRequest, ApprovalRequest, RevokeRenterRequest


def process_join_society(data: JoinSocietyRequest, db: Session, current_user: User) -> dict:
    try:
        r_type = ResidentType(data.resident_type)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid resident_type: {data.resident_type}. Must be one of: owner, owner_family, renter, renter_family",
        )

    society = db.query(Society).filter(Society.id == data.society_id).first()
    if not society:
        raise HTTPException(status_code=400, detail="Invalid society ID provided")

    flat = db.query(Flat).filter(Flat.id == data.flat_id, Flat.society_id == society.id).first()
    if not flat:
        raise HTTPException(status_code=400, detail="The specified flat does not belong to this society")

    if r_type == ResidentType.OWNER:
        if flat.owner_user_id and flat.owner_user_id != current_user.id:
            raise HTTPException(status_code=400, detail="This flat already has an assigned owner")
        if not data.aadhar_number or not data.pan_number:
            raise HTTPException(status_code=400, detail="Aadhaar and PAN are mandatory for primary flat owners")

        current_user.resident_type = ResidentType.OWNER
        current_user.aadhar_number = data.aadhar_number
        current_user.pan_number = data.pan_number
        flat.owner_user_id = current_user.id
        current_user.is_approved = True
        current_user.is_approved_by_admin = False

    elif r_type == ResidentType.OWNER_FAMILY:
        existing_owner = db.query(User).filter(
            User.flat_id == flat.id, User.resident_type == ResidentType.OWNER, User.is_approved_by_admin == True
        ).first()
        if not existing_owner:
            raise HTTPException(status_code=400, detail="No approved owner found for this flat; the owner must join first")
        flat.owner_user_id = existing_owner.id
        if data.aadhar_number:
            current_user.aadhar_number = data.aadhar_number
        if data.pan_number:
            current_user.pan_number = data.pan_number
        current_user.resident_type = ResidentType.OWNER_FAMILY
        current_user.is_approved = False
        current_user.is_approved_by_admin = True

    elif r_type == ResidentType.RENTER:
        existing_owner = db.query(User).filter(
            User.flat_id == flat.id, User.resident_type == ResidentType.OWNER, User.is_approved_by_admin == True
        ).first()
        if not existing_owner:
            raise HTTPException(status_code=400, detail="No approved owner found for this flat; owner must join first to approve renters")
        flat.owner_user_id = existing_owner.id
        existing_renter = db.query(User).filter(User.flat_id == flat.id, User.resident_type == ResidentType.RENTER).first()
        if existing_renter and existing_renter.id != current_user.id:
            raise HTTPException(status_code=400, detail="This flat already has an active renter")
        if data.aadhar_number:
            current_user.aadhar_number = data.aadhar_number
        if data.pan_number:
            current_user.pan_number = data.pan_number
        current_user.resident_type = ResidentType.RENTER
        current_user.is_approved = False
        current_user.is_approved_by_admin = True

    elif r_type == ResidentType.RENTER_FAMILY:
        existing_renter = db.query(User).filter(
            User.flat_id == flat.id, User.resident_type == ResidentType.RENTER, User.is_approved == True
        ).first()
        if not existing_renter:
            raise HTTPException(status_code=400, detail="No approved main renter found; main renter must join and be approved first")
        if data.aadhar_number:
            current_user.aadhar_number = data.aadhar_number
        if data.pan_number:
            current_user.pan_number = data.pan_number
        current_user.resident_type = ResidentType.RENTER_FAMILY
        current_user.is_approved = False
        current_user.is_approved_by_admin = True

    current_user.society_id = society.id
    current_user.flat_id = flat.id
    db.commit()
    db.refresh(current_user)
    return {"detail": "Society join request submitted successfully", "user_id": current_user.id}


def process_approval(data: ApprovalRequest, db: Session, current_user: User) -> dict:
    target = db.query(User).filter(User.id == data.user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target user not found")

    if current_user.role == UserRole.ADMIN and target.resident_type == ResidentType.OWNER and target.society_id == current_user.society_id:
        target.is_approved_by_admin = data.approve
        if not data.approve:
            flat = db.query(Flat).filter(Flat.id == target.flat_id).first()
            if flat and flat.owner_user_id == target.id:
                flat.owner_user_id = None
            target.flat_id = None
            target.society_id = None
            target.resident_type = None
        db.commit()
        return {"detail": "Owner validation status updated by administrator"}

    if current_user.resident_type == ResidentType.OWNER and current_user.flat_id and target.flat_id == current_user.flat_id and target.resident_type in (ResidentType.OWNER_FAMILY, ResidentType.RENTER):
        target.is_approved = data.approve
        if not data.approve:
            target.flat_id = None
            target.society_id = None
            target.resident_type = None
        db.commit()
        return {"detail": "Resident approval status updated by flat owner"}

    if current_user.resident_type == ResidentType.RENTER and current_user.is_approved and current_user.flat_id and target.flat_id == current_user.flat_id and target.resident_type == ResidentType.RENTER_FAMILY:
        target.is_approved = data.approve
        if not data.approve:
            target.flat_id = None
            target.society_id = None
            target.resident_type = None
        db.commit()
        return {"detail": "Renter family approval updated by main tenant"}

    raise HTTPException(status_code=403, detail="You do not have the required permissions to approve this specific user request")


def process_revoke_renter(data: RevokeRenterRequest, db: Session, current_user: User) -> dict:
    if current_user.resident_type != ResidentType.OWNER or not current_user.flat_id:
        raise HTTPException(status_code=403, detail="Only verified flat owners can revoke renters")
    target = db.query(User).filter(User.id == data.user_id, User.flat_id == current_user.flat_id, User.resident_type == ResidentType.RENTER).first()
    if not target:
        raise HTTPException(status_code=404, detail="The specified renter was not found assigned to your flat")

    renter_family = db.query(User).filter(User.flat_id == current_user.flat_id, User.resident_type == ResidentType.RENTER_FAMILY).all()
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
    return {"detail": f"Tenancy revoked successfully. The renter and {len(renter_family)} family members have been removed from the flat."}
