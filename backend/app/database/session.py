from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import DATABASE_URL

# Configure engine based on connection type
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    url = DATABASE_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    # If using Supabase Transaction Pooler (typically on port 6543)
    if ":6543" in url:
        from sqlalchemy.pool import NullPool
        engine = create_engine(url, poolclass=NullPool)
    else:
        engine = create_engine(url, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency function providing a database session for FastAPI requests."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
