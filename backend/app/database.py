import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from dotenv import load_dotenv

# populate os.environ
load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'society.db')}"

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    # if using the Supabase Transaction Pooler (typically on port 6543)
    if ":6543" in DATABASE_URL:
        # Import NullPool to disable SQLAlchemy's internal pooling when using an external pooler
        from sqlalchemy.pool import NullPool
        # Create engine without internal pooling
        engine = create_engine(DATABASE_URL, poolclass=NullPool)
    else:
        # Create engine with standard pooling and 'pool_pre_ping' to handle stale connections
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# Create a 'SessionLocal' class which will be used to generate database session instances
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# Dependency function to provide a database session for FastAPI requests
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

