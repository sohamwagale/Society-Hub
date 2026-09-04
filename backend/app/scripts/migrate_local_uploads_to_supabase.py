# Import OS for filesystem navigation and path management
import os
# Import sys to manipulate the Python search path for module resolution
import sys
# Import mimetypes to automatically detect file content types during re-upload
import mimetypes

# ── Environment Setup ──
# Inject the project root into the search path so the 'app' module can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

# Import SQLAlchemy Session management
from sqlalchemy.orm import Session
# Import the direct database session factory
from app.database import SessionLocal
# Import the storage utility (which might point to cloud storage) to handle the 'upload' aspect of migration
from app.services.storage_service import upload_file
# Import all models containing file URL references to be updated
from app.models.society_expense import SocietyExpense
from app.models.society_document import SocietyDocument
from app.models.announcement import Announcement
from app.models.reimbursement import ReimbursementRequest
from app.models.complaint import Complaint
from app.models.billing import BillPayment

# Resolve the absolute path of the legacy local 'uploads' directory
UPLOADS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'uploads'))

def migrate_local_to_supabase():
    """Iterates through database records, detects local file references, and re-uploads them to cloud storage."""
    # Instantiate a standalone database connection
    db = SessionLocal()

    # ── Internal Conversion Logic ──
    def process_url(folder_name: str, url: str) -> str:
        """Helper to convert a local URL into a cloud URL by reading, uploading, and updating the reference."""
        # Only process paths currently pointing to the local '/uploads/' endpoint
        if not url or not url.startswith("/uploads/"):
            return url
            
        # Extract the relative path within the uploads directory
        local_rel_path = url.removeprefix("/uploads/")
        # Reconstruct the absolute path on the server's disk
        local_file_path = os.path.join(UPLOADS_DIR, *local_rel_path.split("/"))

        # Clean check: ensure the physical file actually exists before trying to migrate it
        if not os.path.exists(local_file_path):
            print(f"File missing on disk: Skipping {url}")
            return url

        # Read binary payload from disk
        with open(local_file_path, "rb") as f:
            data = f.read()

        # Isolate filename and determine the safe content type (e.g., 'image/png')
        filename = os.path.basename(local_file_path)
        content_type, _ = mimetypes.guess_type(local_file_path)
        # Fallback to binary stream if unknown
        content_type = content_type or "application/octet-stream"

        try:
            # Trigger the upload via the utility (which now targets cloud storage)
            new_url = upload_file(folder_name, filename, data, content_type)
            print(f"Migration Success: {filename} -> {new_url}")
            return new_url
        except Exception as e:
            # Gracefully handle network or permission errors during upload
            print(f"Migration Failed for {url}: {e}")
            return url

    # ── Database Batch Processing ──

    print("Phase 1: Migrating Society Expenses...")
    # Update document_url field for filtered records
    for item in db.query(SocietyExpense).filter(SocietyExpense.document_url.like("/uploads/%")).all():
        item.document_url = process_url("expenses", item.document_url)

    print("Phase 2: Migrating Society Documents...")
    # Update file_url field for filtered records
    for item in db.query(SocietyDocument).filter(SocietyDocument.file_url.like("/uploads/%")).all():
        item.file_url = process_url("documents", item.file_url)

    print("Phase 3: Migrating Announcements...")
    # Update attachment_url field for filtered records
    for item in db.query(Announcement).filter(Announcement.attachment_url.like("/uploads/%")).all():
        item.attachment_url = process_url("announcements", item.attachment_url)

    print("Phase 4: Migrating Reimbursements...")
    # Update receipt_path field for filtered records
    for item in db.query(ReimbursementRequest).filter(ReimbursementRequest.receipt_path.like("/uploads/%")).all():
        item.receipt_path = process_url("reimbursements", item.receipt_path)

    print("Phase 5: Migrating Bill Payments...")
    # Update receipt_path field for filtered records
    for item in db.query(BillPayment).filter(BillPayment.receipt_path.like("/uploads/%")).all():
        item.receipt_path = process_url("bill-receipts", item.receipt_path)

    print("Phase 6: Migrating Complaint Attachments (JSON List)...")
    # Complaints use a list of URLs, requiring iterative element processing
    for item in db.query(Complaint).all():
        if item.images:
            new_images = []
            changed = False
            for img_url in item.images:
                # Process each individual URL inside the array
                if img_url and img_url.startswith("/uploads/"):
                    new_url = process_url("complaints", img_url)
                    new_images.append(new_url)
                    changed = True
                else:
                    new_images.append(img_url)
            # Reassign and trigger SQLAlchemy change detection if any URLs were updated
            if changed:
                item.images = new_images

    # ── Completion ──
    # Commit all record updates to the database
    db.commit()
    # Close session
    db.close()
    print("Full migration cycle complete.")

# Entry point execution guard
if __name__ == "__main__":
    migrate_local_to_supabase()
