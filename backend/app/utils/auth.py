# Import datetime for token expiration management
from datetime import datetime, timedelta
# Import Optional for type hinting nullable fields
from typing import Optional
# Import jose for JWT encoding and decoding
from jose import JWTError, jwt
# Import passlib for secure password hashing and verification
from passlib.context import CryptContext
# Import FastAPI components for dependencies and HTTP error handling
from fastapi import Depends, HTTPException, status
# Import OAuth2PasswordBearer as the standard for bearer token authentication
from fastapi.security import OAuth2PasswordBearer
# Import SQLAlchemy Session for database queries
from sqlalchemy.orm import Session
# Import database session utility
from app.database import get_db
# Import User model for type casting
from app.models.user import User

# ── Security Configuration ──
# SECRET_KEY used to sign JWTs (MUST be changed and kept confidential in production)
SECRET_KEY = "apartment-society-secret-key-change-in-production"
# Hashing algorithm for the tokens
ALGORITHM = "HS256"
# Standard token TTL: Sessions remain valid for 24 hours
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# Initialize the password hashing context using the bcrypt algorithm
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# Define the OAuth2 scheme and the endpoint where tokens can be acquired
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ── Password Cryptography ──

def hash_password(password: str) -> str:
    """Computes a secure bcrypt hash of a plain-text password."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Compares a plain-text password against a stored hash to verify authenticity."""
    return pwd_context.verify(plain_password, hashed_password)


# ── JWT Orchestration ──

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generates a signed JWT containing specific user data and an expiration timestamp."""
    # Create a mutable copy of the payload
    to_encode = data.copy()
    # Calculate expiration time
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    # Update payload with expiration (exp) claim
    to_encode.update({"exp": expire})
    # Sign and return the serialized token
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ── Dependency Injection ──

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Validates the incoming JWT and retrieves the associated User record from the database."""
    # Standard exception for invalid or expired tokens
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials - please sign in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decode the token using the secret key and defined algorithm
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # Extract the user ID (stored in the 'sub' claim)
        user_id: str = payload.get("sub")
        # Ensure ID exists in payload
        if user_id is None:
            raise credentials_exception
    except JWTError:
        # Catch and re-raise JWT specific errors as HTTP 401s
        raise credentials_exception

    # Locate the user in the database by their unique ID
    user = db.query(User).filter(User.id == user_id).first()
    # Verify the user record still exists
    if user is None:
        raise credentials_exception
    
    # Return the authenticated user object
    return user


def require_role(role: str):
    """Factory function that returns a dependency to enforce specific user roles (RBAC)."""
    def role_checker(current_user: User = Depends(get_current_user)):
        # Compare current user's role against the required role for the endpoint
        if current_user.role.value != role:
            # Raise 403 Forbidden if roles do not match
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Authorization Error: Required access level ({role}) not met.",
            )
        # Return the user if authorization passes
        return current_user
    # Return the checker function instance
    return role_checker
