import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import RegisterRequest, TokenResponse, UserOut
from app.core.security import hash_password, verify_password
from app.core.jwt import create_access_token

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, str(user.password_hash)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    token = create_access_token({
        "sub": user.id,
        "role": user.role.value
    })
    return TokenResponse(access_token=token)


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(new_user_data: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == new_user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        user = User(
            id=str(uuid.uuid4()),
            name=new_user_data.name,
            email=new_user_data.email,
            phone=new_user_data.phone,
            password_hash=hash_password(new_user_data.password),
            role=UserRole.RESIDENT,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")
