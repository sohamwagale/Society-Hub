# Import the os module for handling environment variables and file paths
import os
# Import create_engine from SQLAlchemy to establish a connection to the database
from sqlalchemy import create_engine
# Import sessionmaker for creating database sessions and declarative_base for model definition
from sqlalchemy.orm import sessionmaker, declarative_base

# Import load_dotenv to load environment variables from a .env file
from dotenv import load_dotenv

# Execute load_dotenv to populate os.environ with variables defined in .env
load_dotenv()

# Retrieve the DATABASE_URL environment variable, which points to the database instance
DATABASE_URL = os.environ.get("DATABASE_URL")

# If DATABASE_URL is not set in environment variables, fall back to a local SQLite database
if not DATABASE_URL:
    # Get the parent directory of the current file's directory (the 'backend' directory)
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    # Create a file-based SQLite database URL
    DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'society.db')}"

# Configuration for SQLite connection
if DATABASE_URL.startswith("sqlite"):
    # SQLite requires 'check_same_thread=False' for multi-threaded access in FastAPI
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # Ensure PostgreSQL URLs use the 'postgresql://' scheme required by SQLAlchemy
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    # Check if we are using the Supabase Transaction Pooler (typically on port 6543)
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
# Create a 'Base' class which all database models will inherit from
Base = declarative_base()


# Dependency function to provide a database session for FastAPI requests
def get_db():
    # Initialize a new session instance
    db = SessionLocal()
    try:
        # Yield the session to be used by the dependent endpoint
        yield db
    finally:
        # Ensure the session is closed after the request is finished or if an error occurs
        db.close()

