from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.flat import Flat
from app.schemas.user import UserOut, UserUpdate, ChangePasswordRequest, PushTokenRequest
from app.core.security import hash_password, verify_password
from app.core.deps import get_current_user

router = APIRouter()


@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    flat = db.query(Flat).filter(Flat.id == current_user.flat_id).first() if current_user.flat_id else None
    user_data = UserOut.model_validate(current_user).model_dump()
    user_data["flat_number"] = flat.flat_number if flat else None
    user_data["block"] = flat.block if flat else None
    user_data["floor"] = flat.floor if flat else None
    user_data["payment_address"] = current_user.payment_address
    user_data["is_fully_approved"] = current_user.is_fully_approved
    return user_data


@router.patch("/me", response_model=UserOut)
def update_profile(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.name is not None:
        current_user.name = data.name
    if data.phone is not None:
        current_user.phone = data.phone
    if data.payment_address is not None:
        current_user.payment_address = data.payment_address

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.old_password, str(current_user.password_hash)):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    current_user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


@router.post("/push-token")
def register_push_token(
    data: PushTokenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register or update the user's Expo push notification token."""
    if not data.token.startswith("ExponentPushToken"):
        raise HTTPException(status_code=400, detail="Invalid push token format")

    current_user.push_token = data.token
    db.commit()
    return {"detail": "Push token registered"}
