import os
import sys
from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

def migrate_data():
    print("Starting data migration from SQLite to Supabase Postgres...")
    load_dotenv()
    
    # Add backend directory to sys.path to allow importing 'app'
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    sys.path.insert(0, BASE_DIR)

    # 1. Setup Postgres Engine (Destination)
    postgres_url = os.environ.get("DATABASE_URL")
    if not postgres_url:
        print("ERROR: DATABASE_URL not found in .env")
        sys.exit(1)
        
    print(f"Destination: Postgres (connecting...)")
    pg_engine = create_engine(postgres_url, pool_pre_ping=True)
    PgSession = sessionmaker(bind=pg_engine)
    pg_session = PgSession()

    # 2. Setup SQLite Engine (Source)
    # The database is actually at backend/society.db
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    sqlite_db_path = os.path.join(BASE_DIR, 'society.db')
    sqlite_url = f"sqlite:///{sqlite_db_path}"
    print(f"Source: SQLite ({sqlite_url})")
    
    if not os.path.exists(sqlite_db_path):
        print("ERROR: society.db not found!")
        sys.exit(1)

    sqlite_engine = create_engine(sqlite_url)
    SqliteSession = sessionmaker(bind=sqlite_engine)
    sqlite_session = SqliteSession()

    from sqlalchemy import text
    from sqlalchemy.orm import Session
    
    try:
        # Need to dynamically reflect tables since we're selecting from raw tables
        # using the models directly
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

        # Disable foreign key checks for Postgres
        pg_session.execute(text("SET session_replication_role = 'replica';"))
        
        for model in tables_to_migrate:
            table_name = model.__tablename__
            print(f"Migrating table: {table_name}... ", end="")
            
            # Read all rows from SQLite
            rows = sqlite_session.query(model).all()
            if not rows:
                print("Skipped (0 rows)")
                continue

            # Clear existing data in Postgres table (if any)
            pg_session.execute(text(f"TRUNCATE TABLE {table_name} CASCADE;"))
            
            # Insert into Postgres by adding them to the Postgres session
            # We merge to avoid detached instance errors
            for row in rows:
                pg_session.merge(row)

            pg_session.commit()
            print(f"Done ({len(rows)} rows)")

        # Re-enable foreign key checks
        pg_session.execute(text("SET session_replication_role = 'origin';"))
        pg_session.commit()
        print("\n✅ Migration completed successfully!")

    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        pg_session.rollback()
    finally:
        sqlite_session.close()
        pg_session.close()

if __name__ == "__main__":
    migrate_data()
