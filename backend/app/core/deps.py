from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import SECRET_KEY, ALGORITHM
from app.database.session import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user(
    request: Request,
    bearer_token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Validates the JWT from HttpOnly cookie, Bearer header, or query param, and retrieves the User."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials - please sign in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1. Check HttpOnly cookie first
    token = request.cookies.get("access_token")

    # 2. Fall back to Authorization: Bearer <token>
    if not token and bearer_token:
        token = bearer_token

    # 3. Fall back to query param ?token= (useful for direct browser link transitions)
    if not token:
        token = request.query_params.get("token")

    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        token_type: Optional[str] = payload.get("type")

        if user_id is None:
            raise credentials_exception
        if token_type == "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token cannot be used for API access",
            )
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    return user


def require_role(role: str):
    """Factory function that returns a dependency to enforce specific user roles (RBAC)."""
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role.value != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Authorization Error: Required access level ({role}) not met.",
            )
        return current_user
    return role_checker
