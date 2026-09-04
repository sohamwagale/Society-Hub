import os
from dotenv import load_dotenv

# Populate os.environ from .env file
load_dotenv()

# Base directory for the backend project
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Database configuration
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = f"sqlite:///{os.path.join(os.path.dirname(BASE_DIR), 'society.db')}"

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "society-secret-key-change-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# Cookie settings
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "False").lower() in ("true", "1", "t")
COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN") or None
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")
REFRESH_COOKIE_SAMESITE = os.getenv("REFRESH_COOKIE_SAMESITE", "strict")

# Static and uploads directory
UPLOADS_DIR = os.path.join(os.path.dirname(BASE_DIR), "uploads")
