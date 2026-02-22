import os
import sys
import mimetypes

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.utils.storage import upload_file
from app.models.society_expense import SocietyExpense
from app.models.society_document import SocietyDocument
from app.models.announcement import Announcement
from app.models.reimbursement import ReimbursementRequest
from app.models.complaint import Complaint
from app.models.billing import BillPayment

UPLOADS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'uploads'))

def migrate_local_to_supabase():
    db = SessionLocal()

    def process_url(folder_name: str, url: str) -> str:
        if not url or not url.startswith("/uploads/"):
            return url
            
        local_rel_path = url.removeprefix("/uploads/")
        local_file_path = os.path.join(UPLOADS_DIR, *local_rel_path.split("/"))

        if not os.path.exists(local_file_path):
            print(f"Skipping {url}, file not found")
            return url

        with open(local_file_path, "rb") as f:
            data = f.read()

        filename = os.path.basename(local_file_path)
        content_type, _ = mimetypes.guess_type(local_file_path)
        content_type = content_type or "application/octet-stream"

        try:
            new_url = upload_file(folder_name, filename, data, content_type)
            print(f"Uploaded {filename} -> {new_url}")
            return new_url
        except Exception as e:
            print(f"Failed to upload {url}: {e}")
            return url

    print("Migrating Society Expenses...")
    for item in db.query(SocietyExpense).filter(SocietyExpense.document_url.like("/uploads/%")).all():
        item.document_url = process_url("expenses", item.document_url)

    print("Migrating Documents...")
    for item in db.query(SocietyDocument).filter(SocietyDocument.file_url.like("/uploads/%")).all():
        item.file_url = process_url("documents", item.file_url)

    print("Migrating Announcements...")
    for item in db.query(Announcement).filter(Announcement.attachment_url.like("/uploads/%")).all():
        item.attachment_url = process_url("announcements", item.attachment_url)

    print("Migrating Reimbursements...")
    for item in db.query(ReimbursementRequest).filter(ReimbursementRequest.receipt_path.like("/uploads/%")).all():
        item.receipt_path = process_url("reimbursements", item.receipt_path)

    print("Migrating Bill Payments...")
    for item in db.query(BillPayment).filter(BillPayment.receipt_path.like("/uploads/%")).all():
        item.receipt_path = process_url("bill-receipts", item.receipt_path)

    print("Migrating Complaints...")
    for item in db.query(Complaint).all():
        if item.images:
            new_images = []
            changed = False
            for img_url in item.images:
                if img_url and img_url.startswith("/uploads/"):
                    new_url = process_url("complaints", img_url)
                    new_images.append(new_url)
                    changed = True
                else:
                    new_images.append(img_url)
            if changed:
                item.images = new_images

    db.commit()
    db.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate_local_to_supabase()
