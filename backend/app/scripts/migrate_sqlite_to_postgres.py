# Import standard OS module for path manipulation
import os
# Import sys to modify Python path and handle exits
import sys
# Import SQLAlchemy components for database connection and metadata reflection
from sqlalchemy import create_engine, MetaData
# Import sessionmaker to establish connection pools
from sqlalchemy.orm import sessionmaker
# Import load_dotenv to read database credentials from the .env file
from dotenv import load_dotenv

def migrate_data():
    """Main function to orchestrate the ETL (Extract, Transform, Load) process from SQLite to Postgres."""
    print("Initiating full data migration: Local SQLite ──▶ Supabase Postgres...")
    # Read environment variables
    load_dotenv()
    
    # ── Path Resolution ──
    # Calculate the root directory of the backend to ensure relative imports work correctly
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    # Append root to sys.path to resolve the 'app' module
    sys.path.insert(0, BASE_DIR)

    # 1. ── Destination Setup: Postgres (Supabase) ──
    # Retrieve the target connection string
    postgres_url = os.environ.get("DATABASE_URL")
    if not postgres_url:
        print("CRITICAL ERROR: 'DATABASE_URL' is missing from your .env configuration.")
        sys.exit(1)
        
    print(f"Establishing connection to Destination: Postgres...")
    # Initialize engine with pool_pre_ping to handle potential connection drops during long migrations
    pg_engine = create_engine(postgres_url, pool_pre_ping=True)
    # Create the session factory
    PgSession = sessionmaker(bind=pg_engine)
    pg_session = PgSession()

    # 2. ── Source Setup: SQLite (Local) ──
    # Map the local database file location
    sqlite_db_path = os.path.join(BASE_DIR, 'society.db')
    sqlite_url = f"sqlite:///{sqlite_db_path}"
    print(f"Opening Source: SQLite ({sqlite_db_path})")
    
    # Verify the source file actually exists
    if not os.path.exists(sqlite_db_path):
        print("CRITICAL ERROR: 'society.db' not found. Ensure the file is in the backend root.")
        sys.exit(1)

    # Initialize the local engine
    sqlite_engine = create_engine(sqlite_url)
    SqliteSession = sessionmaker(bind=sqlite_engine)
    sqlite_session = SqliteSession()

    # ── Database Model Imports ──
    # We import these inside the function to ensure the sys.path manipulation has taken effect
    from sqlalchemy import text
    from sqlalchemy.orm import Session
    
    try:
        # Import all application models to use for batch querying and insertion
        from app.models import (
            Society, SocietyInfo, Flat, User, EmergencyContact,
            Bill, BillPayment,
            Complaint, ComplaintComment,
            Poll, PollOption, Vote,
            ReimbursementRequest, ReimbursementPayment,
            Announcement, Notification,
            SocietyDocument, SocietyExpense, ActivityLog
        )
        from app.models.billing import BillFlatAmount

        # Order of tables is important to maintain referential integrity (Top-level tables first)
        tables_to_migrate = [
            Society,
            SocietyInfo,
            Flat,
            User,
            EmergencyContact,
            Bill,
            BillFlatAmount,
            BillPayment,
            Complaint,
            ComplaintComment,
            Poll,
            PollOption,
            Vote,
            ReimbursementRequest,
            ReimbursementPayment,
            Announcement,
            Notification,
            SocietyDocument,
            SocietyExpense,
            ActivityLog
        ]

        # ── Migration Strategy ──
        # Temporarily disable foreign key constraints in Postgres to allow out-of-order data seeding
        # Using 'replica' role bypasses constraint checks during the session
        pg_session.execute(text("SET session_replication_role = 'replica';"))
        
        # Iterate through each model and perform the data transfer
        for model in tables_to_migrate:
            table_name = model.__tablename__
            print(f"Migrating table [{table_name}]... ", end="")
            
            # Step A: Extract all rows from the local SQLite source
            rows = sqlite_session.query(model).all()
            if not rows:
                print("Skipped (Empty Table)")
                continue

            # Step B: Prepare destination by purging existing data (Idempotency check)
            pg_session.execute(text(f"TRUNCATE TABLE {table_name} CASCADE;"))
            
            # Step C: Load data into Postgres
            for row in rows:
                # Use 'merge' to attach detached SQLite instances to the new Postgres session
                pg_session.merge(row)

            # Commit the table batch
            pg_session.commit()
            print(f"Success ({len(rows)} records synchronized)")

        # ── Finalization ──
        # Restore standard constraint enforcement behavior
        pg_session.execute(text("SET session_replication_role = 'origin';"))
        pg_session.commit()
        print("\n🏆 Migration cycle successfully finalized!")

    except Exception as e:
        # Handle failures by rolling back the current transaction to prevent partial/corrupt data
        print(f"\n☢️ CRITICAL FAILURE during migration: {e}")
        pg_session.rollback()
    finally:
        # Guarantee closure of both database connections
        sqlite_session.close()
        pg_session.close()

# Main entry point guard
if __name__ == "__main__":
    migrate_data()
