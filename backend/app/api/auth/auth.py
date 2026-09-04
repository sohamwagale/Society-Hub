import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import RegisterRequest, TokenResponse, UserOut
from app.core.security import hash_password, verify_password
from app.core.jwt import create_access_token, create_refresh_token
from app.core.config import (
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
    COOKIE_SECURE,
    COOKIE_DOMAIN,
    COOKIE_SAMESITE,
    REFRESH_COOKIE_SAMESITE,
)

router = APIRouter()


def _set_auth_cookies(response: Response, access_token: str, refresh_token: Optional[str] = None):
    """Sets secure HttpOnly cookies for access and refresh tokens."""
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
        domain=COOKIE_DOMAIN,
        secure=COOKIE_SECURE,
        httponly=True,
        samesite=COOKIE_SAMESITE,
    )
    if refresh_token:
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400,
            expires=REFRESH_TOKEN_EXPIRE_DAYS * 86400,
            path="/api/auth",
            domain=COOKIE_DOMAIN,
            secure=COOKIE_SECURE,
            httponly=True,
            samesite=REFRESH_COOKIE_SAMESITE,
        )


def _clear_auth_cookies(response: Response):
    """Clears authentication cookies."""
    response.delete_cookie(
        key="access_token",
        path="/",
        domain=COOKIE_DOMAIN,
        secure=COOKIE_SECURE,
        httponly=True,
        samesite=COOKIE_SAMESITE,
    )
    response.delete_cookie(
        key="refresh_token",
        path="/api/auth",
        domain=COOKIE_DOMAIN,
        secure=COOKIE_SECURE,
        httponly=True,
        samesite=REFRESH_COOKIE_SAMESITE,
    )
    # Also delete at root path to cover legacy/custom paths
    response.delete_cookie(
        key="refresh_token",
        path="/",
        domain=COOKIE_DOMAIN,
        secure=COOKIE_SECURE,
        httponly=True,
        samesite=REFRESH_COOKIE_SAMESITE,
    )


@router.post("/login", response_model=TokenResponse)
def login(
    response: Response,
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, str(user.password_hash)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    access_token = create_access_token({
        "sub": user.id,
        "role": user.role.value,
    })
    refresh_token = create_refresh_token({
        "sub": user.id,
        "role": user.role.value,
    })

    _set_auth_cookies(response, access_token=access_token, refresh_token=refresh_token)
    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
def refresh_token_endpoint(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """Refreshes the access token using the HttpOnly refresh token cookie."""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        # Check bearer header as fallback
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            refresh_token = auth_header.split(" ", 1)[1]

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )

    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        token_type: Optional[str] = payload.get("type")

        if not user_id or token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Expired or invalid refresh token",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    new_access_token = create_access_token({
        "sub": user.id,
        "role": user.role.value,
    })
    _set_auth_cookies(response, access_token=new_access_token)
    return TokenResponse(access_token=new_access_token)


@router.post("/logout")
def logout(response: Response):
    """Logs the user out by clearing HttpOnly session and refresh cookies."""
    _clear_auth_cookies(response)
    return {"message": "Logged out successfully"}


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
