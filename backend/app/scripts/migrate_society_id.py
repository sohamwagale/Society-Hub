"""
Database Patch Script: Normalizes content ownership by adding society_id to all 
feature tables and back-filling from the creator's user profile.
Requirement: Run once during the multi-tenancy upgrade.
"""
# Import sqlite3 for direct manipulation of the local database file
import sqlite3
# Import OS for absolute path calculation
import os

# Calculate the precise absolute path to the SQLite society.db file
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "society.db")
DB_PATH = os.path.abspath(DB_PATH)

# Define the schema of tables that require the society_id column and their respective ownership columns
TABLES = [
    # Format: (target_table, foreign_key_to_user_who_created_it, user_join_col)
    ("bills",                  "created_by",  "id"),
    ("announcements",          "created_by",  "id"),
    ("polls",                  "created_by",  "id"),
    ("complaints",             "user_id",     "id"),
    ("society_expenses",       "created_by",  "id"),
    ("society_documents",      "uploaded_by", "id"),
    ("reimbursement_requests", "user_id",     "id"),
]


def column_exists(cursor, table: str, column: str) -> bool:
    """Introspects the table schema to check if a specific column already exists."""
    # Execute SQLite pragma to get column metadata
    cursor.execute(f"PRAGMA table_info({table})")
    # Extract column names from the metadata rows (name is at index 1)
    cols = [row[1] for row in cursor.fetchall()]
    return column in cols


def migrate():
    """Main migration loop to update schema and synchronize tenant ownership."""
    # Open connection to the binary database file
    conn = sqlite3.connect(DB_PATH)
    # Temporarily disable integrity checks to allow schema alterations
    conn.execute("PRAGMA foreign_keys = OFF")
    cur = conn.cursor()

    # Iterate through each defined content table
    for table, creator_col, _ in TABLES:
        # 1. ── Schema Alteration ──
        # Check if the column needs to be added
        if not column_exists(cur, table, "society_id"):
            print(f"  Modifying Schema: Adding society_id to {table}...")
            # Append the new column with a foreign key constraint back to the societies table
            cur.execute(f"ALTER TABLE {table} ADD COLUMN society_id TEXT REFERENCES societies(id)")
        else:
            print(f"  Schema Status: society_id already present in {table}, skipping alteration.")

        # 2. ── Data Synchronization (Back-fill) ──
        print(f"  Synchronizing Data: Back-filling {table}.society_id from owner profile...")
        # Execute correlated subquery: find the society_id of the user linked via the creator_col
        cur.execute(f"""
            UPDATE {table}
            SET society_id = (
                SELECT u.society_id
                FROM users u
                WHERE u.id = {table}.{creator_col}
            )
            # Only update records that haven't been assigned to a tenant yet
            WHERE society_id IS NULL
        """)
        # Capture the volume of changes
        updated = conn.total_changes
        print(f"  Operations Status: Completed ({updated} aggregate rows modified in this session).")

    # Commit all schema changes and data updates
    conn.commit()
    # Restore referential integrity enforcement
    conn.execute("PRAGMA foreign_keys = ON")
    # Clean up connection
    conn.close()
    print("\nFull Database Migration: Cycle Successfully Completed.")


# Script Entry Point
if __name__ == "__main__":
    print(f"Initiating Migration Cycle on Target DB: {DB_PATH}\n")
    migrate()
