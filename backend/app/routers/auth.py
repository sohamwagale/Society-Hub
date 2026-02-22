from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.flat import Flat
from app.models.society import Society
from app.schemas.user import (
    LoginRequest, RegisterRequest, TokenResponse, UserOut, FlatOut, FlatCreate,
)
from app.utils.auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, require_role,
)
import uuid

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ── Extra schemas for V2 ──
class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    payment_address: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


# ── Auth endpoints ──
@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token({"sub": user.id, "role": user.role.value})
    return TokenResponse(access_token=token)


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        user = User(
            id=str(uuid.uuid4()),
            name=data.name,
            email=data.email,
            phone=data.phone,
            password_hash=hash_password(data.password),
            role=UserRole.RESIDENT,
            # Society/flat/resident_type will be set during onboarding
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    flat = db.query(Flat).filter(Flat.id == current_user.flat_id).first() if current_user.flat_id else None
    user_data = UserOut.model_validate(current_user).model_dump()
    user_data["flat_number"] = flat.flat_number if flat else None
    user_data["block"] = flat.block if flat else None
    user_data["floor"] = flat.floor if flat else None
    user_data["payment_address"] = current_user.payment_address
    user_data["is_fully_approved"] = current_user.is_fully_approved
    return user_data


# ── Profile update (V2) ──
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


# ── Password change (V2) ──
@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    current_user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


# ── Flat management (admin) ──
@router.get("/flats", response_model=list[FlatOut])
def list_flats(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Flat).all()


@router.post("/flats", response_model=FlatOut, status_code=status.HTTP_201_CREATED)
def create_flat(data: FlatCreate, db: Session = Depends(get_db), _: User = Depends(require_role("admin"))):
    flat = Flat(id=str(uuid.uuid4()), flat_number=data.flat_number, block=data.block, floor=data.floor)
    db.add(flat)
    db.commit()
    db.refresh(flat)
    return flat


class FlatAssign(BaseModel):
    user_id: str
    flat_id: Optional[str] = None  # None = unassign


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


# ── Push Notification Token ──
class PushTokenRequest(BaseModel):
    token: str


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
