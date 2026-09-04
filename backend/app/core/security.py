from passlib.context import CryptContext

# Initialize the password hashing context using the bcrypt algorithm
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Computes a secure bcrypt hash of a plain-text password."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Compares a plain-text password against a stored hash to verify authenticity."""
    return pwd_context.verify(plain_password, hashed_password)
