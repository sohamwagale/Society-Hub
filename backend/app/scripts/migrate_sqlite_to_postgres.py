# Import standard OS and system modules
import os
import sys
import argparse
from typing import List, Dict, Any
# Import SQLAlchemy components
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
# Import load_dotenv to read database credentials from the .env file
from dotenv import load_dotenv

def format_postgres_url(raw_url: str) -> str:
    """Normalize Postgres connection URL for SQLAlchemy and Supabase."""
    url = raw_url.strip()
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


def reset_postgres_sequences(engine):
    """
    Synchronizes all PostgreSQL auto-increment sequences with MAX(id)
    to prevent duplicate key errors on subsequent INSERT operations.
    """
    print("\n[+] Synchronizing PostgreSQL primary key sequences...")
    with engine.connect() as conn:
        with conn.begin():
            inspector = inspect(engine)
            table_names = inspector.get_table_names()
            
            for table_name in table_names:
                try:
                    pk_constraint = inspector.get_pk_constraint(table_name)
                    pk_cols = pk_constraint.get("constrained_columns", [])
                    if not pk_cols or len(pk_cols) != 1:
                        continue
                    
                    pk_col = pk_cols[0]
                    seq_query = text(f"SELECT pg_get_serial_sequence('{table_name}', '{pk_col}') AS seq_name;")
                    seq_res = conn.execute(seq_query).scalar()
                    
                    if seq_res:
                        sync_sql = text(
                            f"SELECT setval('{seq_res}', COALESCE((SELECT MAX({pk_col}) FROM {table_name}), 1), true);"
                        )
                        conn.execute(sync_sql)
                        print(f"    ✓ Sequence updated for [{table_name}.{pk_col}] -> {seq_res}")
                except Exception:
                    pass


def migrate_data(source_db_path: str = None, target_db_url: str = None, clean: bool = True):
    """Orchestrates the ETL process from SQLite to Supabase Postgres."""
    print("=" * 65)
    print("  🚀 SocietyHub: SQLite -> Supabase Postgres Migration")
    print("=" * 65)

    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    if BASE_DIR not in sys.path:
        sys.path.insert(0, BASE_DIR)

    load_dotenv(os.path.join(BASE_DIR, ".env"))

    # Destination Postgres Setup
    postgres_url = target_db_url or os.environ.get("SUPABASE_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not postgres_url or postgres_url.startswith("sqlite"):
        postgres_url = input("Enter your Supabase PostgreSQL connection string:\n> ").strip()

    if not postgres_url:
        print("CRITICAL ERROR: 'DATABASE_URL' is missing from configuration.")
        sys.exit(1)

    postgres_url = format_postgres_url(postgres_url)
    
    # Supabase Transaction Pooler (port 6543) configuration
    if ":6543" in postgres_url:
        from sqlalchemy.pool import NullPool
        pg_engine = create_engine(postgres_url, poolclass=NullPool)
    else:
        pg_engine = create_engine(postgres_url, pool_pre_ping=True)

    # Source SQLite Setup
    sqlite_db_path = source_db_path or os.path.join(BASE_DIR, "society.db")
    if not os.path.exists(sqlite_db_path):
        print(f"CRITICAL ERROR: SQLite database file not found at '{sqlite_db_path}'.")
        sys.exit(1)

    sqlite_url = f"sqlite:///{sqlite_db_path}"
    sqlite_engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

    # Model imports and Schema Initialization
    import app.models
    from app.database import Base
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

    print("\n[1/4] Ensuring PostgreSQL schema tables exist...")
    Base.metadata.create_all(bind=pg_engine)
    print("    ✓ All schema tables ready.")

    ordered_tables = [
        Society, SocietyInfo, Flat, User, EmergencyContact,
        Bill, BillFlatAmount, BillPayment,
        Complaint, ComplaintComment,
        Poll, PollOption, Vote,
        ReimbursementRequest, ReimbursementPayment,
        Announcement, Notification,
        SocietyDocument, SocietyExpense, ActivityLog
    ]

    SqliteSession = sessionmaker(bind=sqlite_engine)
    PgSession = sessionmaker(bind=pg_engine)
    sqlite_session = SqliteSession()
    pg_session = PgSession()

    stats: List[Dict[str, Any]] = []

    print("\n[2/4] Migrating table rows...")
    supports_replica = False
    try:
        pg_session.execute(text("SET session_replication_role = 'replica';"))
        pg_session.commit()
        supports_replica = True
    except Exception:
        pg_session.rollback()

    try:
        for model in ordered_tables:
            table_name = model.__tablename__
            rows = sqlite_session.query(model).all()
            
            if not rows:
                stats.append({"table": table_name, "source": 0, "target": 0, "status": "Empty (0)"})
                print(f"  • Table [{table_name}]: 0 records (Skipped)")
                continue

            if clean:
                try:
                    pg_session.execute(text(f"TRUNCATE TABLE {table_name} CASCADE;"))
                    pg_session.commit()
                except Exception:
                    pg_session.rollback()
                    try:
                        pg_session.query(model).delete()
                        pg_session.commit()
                    except Exception:
                        pg_session.rollback()

            for row in rows:
                sqlite_session.expunge(row)
                pg_session.merge(row)

            pg_session.commit()
            target_count = pg_session.query(model).count()
            stats.append({
                "table": table_name,
                "source": len(rows),
                "target": target_count,
                "status": "OK" if len(rows) == target_count else "MISMATCH"
            })
            print(f"  ✓ Migrated [{table_name}]: {len(rows)} records -> Verified: {target_count}")

    except Exception as e:
        pg_session.rollback()
        print(f"\n☢️ CRITICAL FAILURE during migration: {e}")
        return False
    finally:
        if supports_replica:
            try:
                pg_session.execute(text("SET session_replication_role = 'origin';"))
                pg_session.commit()
            except Exception:
                pass
        sqlite_session.close()
        pg_session.close()

    # Step 3: Sequence reset
    reset_postgres_sequences(pg_engine)

    # Step 4: Summary
    print("\n" + "=" * 65)
    print(" [4/4] MIGRATION SUMMARY")
    print("=" * 65)
    print(f"{'Table Name':<30} {'SQLite Count':<15} {'Postgres Count':<15} {'Status'}")
    print("-" * 65)
    for stat in stats:
        print(f"{stat['table']:<30} {stat['source']:<15} {stat['target']:<15} {stat['status']}")
    print("=" * 65)
    print("🎉 Migration completed successfully!\n")
    return True


if __name__ == "__main__":
    migrate_data()

