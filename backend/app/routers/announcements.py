# Import standard OS module for file path and extension operations
import os
# Import uuid for generating unique identifier keys for announcements and files
import uuid
# Import Optional for type hinting nullable fields
from typing import Optional
# Import FastAPI components for routing, dependencies, and complex form handling
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
# Import SQLAlchemy Session for database connectivity
from sqlalchemy.orm import Session
# Import the database session utility
from app.database import get_db
# Import User model for authentication and authorization logic
from app.models.user import User
# Import Announcement models and priority enums
from app.models.announcement import Announcement, AnnouncementPriority
# Import Pydantic schemas for data validation
from app.schemas.announcement import AnnouncementUpdate, AnnouncementOut
# Import authentication utilities for role-based access control
from app.utils.auth import get_current_user, require_role
# Import cloud storage utilities for managing binary attachments
from app.utils.storage import upload_file, delete_file
# Import notification service to broadcast society-wide alerts
from app.services.notification_service import notify_all_residents
# Import notification type enum
from app.models.notification import NotificationType

# Initialize router with relevant prefix and tag grouping
router = APIRouter(prefix="/api/announcements", tags=["Announcements"])

# Set of allowed extensions for automatic visual indicator tagging
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


# ── Announcement Creation ──

# POST endpoint for admins to publish society-wide notices (uses Form data for file support)
@router.post("", response_model=AnnouncementOut, status_code=201)
async def create_announcement(
    # Extract fields from multi-part form data
    title: str = Form(...),
    body: str = Form(...),
    priority: str = Form("normal"),
    pinned: bool = Form(False),
    # Optional file attachment (notice PDF or image)
    attachment: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    # Restricted to Admin role
    admin: User = Depends(require_role("admin")),
):
    # Initialize attachment metadata
    attachment_url = None
    attachment_type = None

    # ── Attachment Processing ──
    if attachment and attachment.filename:
        # Generate a stable unique ID for the file name
        att_id = str(uuid.uuid4())
        # Isolate the original file extension
        ext = os.path.splitext(attachment.filename)[1].lower()
        # Construct the final cloud storage filename
        filename = f"{att_id}{ext}"
        # Determine MIME type or fallback to binary stream
        content_type = attachment.content_type or "application/octet-stream"
        # Buffer the file stream payload
        data = await attachment.read()
        # Upload to 'announcements' bucket in cloud storage
        attachment_url = upload_file("announcements", filename, data, content_type)
        # Identify type for frontend icon display (Image vs PDF fallback)
        attachment_type = "image" if ext in IMAGE_EXTENSIONS else "pdf"

    # ── Database Initialization ──
    ann = Announcement(
        # Generate primary key
        id=str(uuid.uuid4()),
        # Scope to the admin's society
        society_id=admin.society_id,
        # Content fields
        title=title,
        body=body,
        # Cast priority from string to internal Enum
        priority=AnnouncementPriority(priority),
        # Pinned notices stay at the top of the feed
        pinned=pinned,
        # Attachment references
        attachment_url=attachment_url,
        attachment_type=attachment_type,
        # Audit field: track who published this
        created_by=admin.id,
    )
    # Stage record
    db.add(ann)
    # Commit transaction
    db.commit()
    # Refresh to load timestamps
    db.refresh(ann)

    # ── Notification Broadcast ──
    # Push notification to all active residents in the society immediately
    notify_all_residents(
        db, f"📢 {ann.title}",
        # Send a snippet of the body in the notification payload
        ann.body[:100] + ("..." if len(ann.body) > 100 else ""),
        NotificationType.GENERAL, ann.id,
        society_id=admin.society_id,
    )

    # ── Response Formatting ──
    out = AnnouncementOut.model_validate(ann)
    # Inject creator name manually for UI display
    out.creator_name = admin.name
    return out


# ── Announcement Discovery ──

# GET endpoint to fetch all bulletins for the user's community
@router.get("", response_model=list[AnnouncementOut])
def list_announcements(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Query notices belonging only to the user's society
    anns = (
        db.query(Announcement)
        .filter(Announcement.society_id == current_user.society_id)
        # Order by Pinned status (top) then by date (newest)
        .order_by(Announcement.pinned.desc(), Announcement.created_at.desc())
        .all()
    )
    
    # Unified output processing
    results = []
    for a in anns:
        out = AnnouncementOut.model_validate(a)
        # Eagerly load or manually map the creator's name
        out.creator_name = a.creator.name if a.creator else "System"
        results.append(out)
    return results


# ── Bulletin Management ──

# DELETE endpoint to remove a notice (Admin only)
@router.delete("/{announcement_id}", status_code=204)
def delete_announcement(
    announcement_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    # Locate notice
    ann = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    # verify existence
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement record not found")
    
    # ── Cleanup ──
    # Permanently delete the associated file from cloud storage if active
    if ann.attachment_url:
        delete_file(ann.attachment_url)
    
    # delete from DB
    db.delete(ann)
    # Finalize transaction
    db.commit()


# PATCH endpoint to pin/unpin a notice from the top of the feed
@router.patch("/{announcement_id}/pin")
def toggle_pin(
    announcement_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    # find record
    ann = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    # performs logical inversion on pinned state
    ann.pinned = not ann.pinned
    # save
    db.commit()
    return {"pinned_status": ann.pinned}


# PUT endpoint for minor textual updates to a notice
@router.put("/{announcement_id}")
def update_announcement(
    announcement_id: str,
    payload: AnnouncementUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    # retrieve bulletin
    ann = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Target announcement missing")
    
    # map all provided fields from the update schema to the model
    for field, value in payload.model_dump(exclude_none=True).items():
        if field == "priority":
            # ensure value matches enum type
            setattr(ann, field, AnnouncementPriority(value))
        else:
            # apply standard update fields
            setattr(ann, field, value)
    
    # persist changes
    db.commit()
    # reload
    db.refresh(ann)
    # return updated state
    return ann
