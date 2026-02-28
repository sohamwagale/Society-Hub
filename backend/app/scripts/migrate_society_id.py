"""
Migration: Add society_id to content tables and back-fill from creator's society.
Run once: python -m app.scripts.migrate_society_id
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "society.db")
DB_PATH = os.path.abspath(DB_PATH)


TABLES = [
    # (table_name, creator_col, users_join_col)
    ("bills",                  "created_by",  "id"),
    ("announcements",          "created_by",  "id"),
    ("polls",                  "created_by",  "id"),
    ("complaints",             "user_id",     "id"),
    ("society_expenses",       "created_by",  "id"),
    ("society_documents",      "uploaded_by", "id"),
    ("reimbursement_requests", "user_id",     "id"),
]


def column_exists(cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table})")
    cols = [row[1] for row in cursor.fetchall()]
    return column in cols


def migrate():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = OFF")
    cur = conn.cursor()

    for table, creator_col, _ in TABLES:
        # 1. Add column if missing
        if not column_exists(cur, table, "society_id"):
            print(f"  Adding society_id to {table}...")
            cur.execute(f"ALTER TABLE {table} ADD COLUMN society_id TEXT REFERENCES societies(id)")
        else:
            print(f"  society_id already exists in {table}, skipping ALTER.")

        # 2. Back-fill: set society_id from the creator's society_id in users table
        print(f"  Back-filling {table}.society_id from users.{creator_col}...")
        cur.execute(f"""
            UPDATE {table}
            SET society_id = (
                SELECT u.society_id
                FROM users u
                WHERE u.id = {table}.{creator_col}
            )
            WHERE society_id IS NULL
        """)
        updated = conn.total_changes
        print(f"  Done ({updated} rows touched so far in this session).")

    conn.commit()
    conn.execute("PRAGMA foreign_keys = ON")
    conn.close()
    print("\nMigration complete.")


if __name__ == "__main__":
    print(f"Running migration on: {DB_PATH}\n")
    migrate()
