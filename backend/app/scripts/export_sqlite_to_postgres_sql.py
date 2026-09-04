"""
Export SQLite Data to PostgreSQL SQL Dump
Generates a standard PostgreSQL-compatible SQL file from local `society.db`.
"""

import os
import sys
import sqlite3
from datetime import datetime


def format_sql_value(val):
    if val is None:
        return "NULL"
    if isinstance(val, bool):
        return "TRUE" if val else "FALSE"
    if isinstance(val, (int, float)):
        return str(val)
    # String / Datetime / UUID / JSON
    val_str = str(val)
    escaped = val_str.replace("'", "''")
    return f"'{escaped}'"


def export_sqlite_to_postgres_sql():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(os.path.dirname(script_dir))
    sqlite_path = os.path.join(backend_dir, "society.db")
    output_sql_path = os.path.join(backend_dir, "postgres_dump.sql")

    if not os.path.exists(sqlite_path):
        print(f"Error: SQLite database not found at '{sqlite_path}'.")
        sys.exit(1)

    print(f"Connecting to SQLite: {sqlite_path}")
    conn = sqlite3.connect(sqlite_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get list of all tables in the SQLite database
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    available_tables = [row[0] for row in cursor.fetchall()]

    # Ordered table list to respect foreign key constraints
    table_order = [
        "societies",
        "society_info",
        "flats",
        "users",
        "emergency_contacts",
        "bills",
        "bill_flat_amounts",
        "bill_payments",
        "complaints",
        "complaint_comments",
        "polls",
        "poll_options",
        "poll_votes",
        "votes",
        "reimbursement_requests",
        "reimbursement_payments",
        "announcements",
        "notifications",
        "society_documents",
        "society_expenses",
        "activity_logs",
    ]

    # Include any tables present in SQLite that aren't in the ordered list
    for t in available_tables:
        if t not in table_order:
            table_order.append(t)

    lines = []
    lines.append("-- ========================================================")
    lines.append("-- SocietyHub PostgreSQL Seed Dump")
    lines.append(f"-- Generated on: {datetime.utcnow().isoformat()} UTC")
    lines.append("-- Source: SQLite society.db")
    lines.append("-- ========================================================\n")
    lines.append("-- Temporarily disable foreign key constraints during bulk load")
    lines.append("SET session_replication_role = 'replica';\n")

    total_records = 0

    for table in table_order:
        if table not in available_tables:
            continue

        cursor.execute(f"PRAGMA table_info({table});")
        columns_info = cursor.fetchall()
        column_names = [col[1] for col in columns_info]
        column_types = {col[1]: col[2].upper() for col in columns_info}

        cursor.execute(f"SELECT * FROM {table};")
        rows = cursor.fetchall()

        if not rows:
            lines.append(f"-- Table '{table}': 0 records (skipped)")
            continue

        lines.append(f"\n-- Data for table: {table} ({len(rows)} records)")
        lines.append(f"TRUNCATE TABLE {table} CASCADE;")

        cols_joined = ", ".join([f'"{col}"' for col in column_names])

        for row in rows:
            values = []
            for col in column_names:
                raw_val = row[col]
                col_type = column_types.get(col, "")

                # Handle SQLite integer booleans for boolean columns
                if "BOOL" in col_type and raw_val is not None:
                    raw_val = bool(raw_val)

                values.append(format_sql_value(raw_val))

            vals_joined = ", ".join(values)
            lines.append(f"INSERT INTO {table} ({cols_joined}) VALUES ({vals_joined});")

        total_records += len(rows)
        print(f"  ✓ Exported table '{table}': {len(rows)} rows")

    lines.append("\n-- Re-enable foreign key constraints")
    lines.append("SET session_replication_role = 'origin';\n")
    lines.append("-- ========================================================")
    lines.append(f"-- Dump finished successfully: {total_records} total records")
    lines.append("-- ========================================================\n")

    with open(output_sql_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"\nSuccess! Exported {total_records} records to '{output_sql_path}'.")
    conn.close()


if __name__ == "__main__":
    export_sqlite_to_postgres_sql()
