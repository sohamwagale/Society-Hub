# Import FastAPI utilities for routing, dependencies, and error handling
from fastapi import APIRouter, Depends, HTTPException, status
# Import standard OAuth2 form for handling password-based login requests
from fastapi.security import OAuth2PasswordRequestForm
# Import Pydantic's BaseModel for inline data validation
from pydantic import BaseModel
# Import Optional for type hinting nullable fields
from typing import Optional
# Import SQLAlchemy Session for database interactions
from sqlalchemy.orm import Session
# Import the database session dependency
from app.database import get_db
# Import User and associated enums/models for authentication logic
from app.models.user import User, UserRole
# Import Flat model to retrieve residence details
from app.models.flat import Flat
# Import Society model (reserved for future use in registration)
from app.models.society import Society
# Import schemas for structured request and response data
from app.schemas.user import (
    LoginRequest, RegisterRequest, TokenResponse, UserOut, FlatOut, FlatCreate,
)
# Import authentication utilities for security and token management
from app.utils.auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, require_role,
)
# Import uuid for generating unique user and flat identifiers
import uuid

# Initialize the router with a specific prefix and tag for documentation
router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ── Extra schemas for Profile Updates ──
# Schema for updating basic user profile information
class UserUpdate(BaseModel):
    # Optional updated name of the user
    name: Optional[str] = None
    # Optional updated contact phone number
    phone: Optional[str] = None
    # Optional updated UPI or payment address
    payment_address: Optional[str] = None


# Schema for handling password change requests
class ChangePasswordRequest(BaseModel):
    # The user's current password for verification
    old_password: str
    # The new password to be set
    new_password: str


# ── Authentication Endpoints ──

# POST endpoint for user login, returning a JWT access token
@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Look up the user by email provided in the 'username' field of the form
    user = db.query(User).filter(User.email == form.username).first()
    # verify if user exists and password matches the stored hash
    if not user or not verify_password(form.password, user.password_hash):
        # Raise 401 if credentials don't match
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    # Generate a JWT token containing user ID and role
    token = create_access_token({"sub": user.id, "role": user.role.value})
    # Return the token wrapped in a TokenResponse schema
    return TokenResponse(access_token=token)


# POST endpoint for new user registration
@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    # Check if a user with the same email already exists in the database
    if db.query(User).filter(User.email == data.email).first():
        # Raise 400 error if email is taken
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        # Create a new User instance with hashed password and default RESIDENT role
        user = User(
            id=str(uuid.uuid4()),
            name=data.name,
            email=data.email,
            phone=data.phone,
            password_hash=hash_password(data.password),
            role=UserRole.RESIDENT,
            # Note: Society and flat associations are handled during the subsequent onboarding phase
        )
        # Add the new user to the database session
        db.add(user)
        # Commit the transaction to persist the user
        db.commit()
        # Refresh the instance to load any database-generated defaults (like created_at)
        db.refresh(user)
        # Return the newly created user object
        return user
    except Exception as e:
        # Roll back on any failure to maintain data integrity
        db.rollback()
        # Raise 500 internal server error with details
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


# GET endpoint to retrieve details of the currently authenticated user
@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Retrieve the user's flat details if they have a flat_id assigned
    flat = db.query(Flat).filter(Flat.id == current_user.flat_id).first() if current_user.flat_id else None
    # Validate and dump the user model into an API-ready dictionary
    user_data = UserOut.model_validate(current_user).model_dump()
    # Manually inject flat details into the response dictionary
    user_data["flat_number"] = flat.flat_number if flat else None
    user_data["block"] = flat.block if flat else None
    user_data["floor"] = flat.floor if flat else None
    # Ensure payment address and computed approval status are included
    user_data["payment_address"] = current_user.payment_address
    user_data["is_fully_approved"] = current_user.is_fully_approved
    # Return the enriched user data
    return user_data


# ── Profile Update Endpoints ──

# PATCH endpoint for a user to update their own profile details
@router.patch("/me", response_model=UserOut)
def update_profile(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Conditionally update name if provided in the request
    if data.name is not None:
        current_user.name = data.name
    # Conditionally update phone if provided
    if data.phone is not None:
        current_user.phone = data.phone
    # Conditionally update payment address if provided
    if data.payment_address is not None:
        current_user.payment_address = data.payment_address
    # Commit change to database
    db.commit()
    # Refresh user object to reflect changes
    db.refresh(current_user)
    # Return the updated user object
    return current_user


# POST endpoint for self-service password changes
@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify the provided 'old' password matches the current hash
    if not verify_password(data.old_password, current_user.password_hash):
        # Raise 400 error if verification fails
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    # Enforce a minimum length for the new password
    if len(data.new_password) < 6:
        # Raise 400 if password is too short
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    # Hash the new password and update the user record
    current_user.password_hash = hash_password(data.new_password)
    # Commit the update
    db.commit()
    # return success message
    return {"message": "Password changed successfully"}


# ── Flat Management Endpoints (Admin Required) ──

# GET endpoint to list all flats in the system (accessible by any logged in user)
@router.get("/flats", response_model=list[FlatOut])
def list_flats(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    # Fetch and return all flat records
    return db.query(Flat).all()


# POST endpoint to manually create a new flat record (admin only)
@router.post("/flats", response_model=FlatOut, status_code=status.HTTP_201_CREATED)
def create_flat(data: FlatCreate, db: Session = Depends(get_db), _: User = Depends(require_role("admin"))):
    # Initialize a new Flat instance with a unique ID
    flat = Flat(id=str(uuid.uuid4()), flat_number=data.flat_number, block=data.block, floor=data.floor)
    # Add to database context
    db.add(flat)
    # Persist the record
    db.commit()
    # Refresh to load defaults
    db.refresh(flat)
    # Return the new flat details
    return flat


# Local helper schema for flat assignment
class FlatAssign(BaseModel):
    # ID of the user to be updated
    user_id: str
    # ID of the flat to assign (or None to remove assignment)
    flat_id: Optional[str] = None


# PUT endpoint to assign (or unassign) a user to a specific flat (admin only)
@router.put("/assign-flat")
def assign_flat(
    data: FlatAssign,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    # find the user target by ID
    user = db.query(User).filter(User.id == data.user_id).first()
    # error if user doesn't exist
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # If a flat_id is provided, verify that the flat exists
    if data.flat_id:
        flat = db.query(Flat).filter(Flat.id == data.flat_id).first()
        if not flat:
            raise HTTPException(status_code=404, detail="Flat not found")
    # Update the user's flat association
    user.flat_id = data.flat_id
    # Commit change
    db.commit()
    # Return confirmation message
    return {"detail": "Flat assignment updated"}


# ── Push Notification Management ──

# Local helper schema for registering push tokens
class PushTokenRequest(BaseModel):
    # The push notification token string from the device
    token: str


# POST endpoint to store/update the user's device push token
@router.post("/push-token")
def register_push_token(
    data: PushTokenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register or update the user's Expo push notification token."""
    # Validate the token format (must be an Expo token for this system)
    if not data.token.startswith("ExponentPushToken"):
        # Raise 400 if token format is invalid
        raise HTTPException(status_code=400, detail="Invalid push token format")
    # Update the push_token field on the current user record
    current_user.push_token = data.token
    # Commit the update to the database
    db.commit()
    # Return confirmation
    return {"detail": "Push token registered"}

