import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db

from app.models.user import User
from app.models.announcement import Announcement, AnnouncementPriority
from app.schemas.announcement import AnnouncementUpdate, AnnouncementOut

from app.utils.auth import get_current_user, require_role
from app.utils.storage import upload_file, delete_file

from app.services.notification_service import notify_all_residents
from app.models.notification import NotificationType


router = APIRouter(prefix="/api/announcements", tags=["Announcements"])

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
    attachment: Optional[UploadFile] = File(None),

    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    # Initialize attachment metadata
    attachment_url = None
    attachment_type = None

    # ── Attachment Processing ──
    if attachment and attachment.filename:
        att_id = str(uuid.uuid4())
        ext = os.path.splitext(attachment.filename)[1].lower()
        filename = f"{att_id}{ext}"
        content_type = attachment.content_type or "application/octet-stream"

        data = await attachment.read()

        attachment_url = upload_file("announcements", filename, data, content_type)
        attachment_type = "image" if ext in IMAGE_EXTENSIONS else "pdf" # Type for frontend icon display

    # ── Database Initialization ──
    ann = Announcement(
        id=str(uuid.uuid4()),
        society_id=admin.society_id,
        created_by=admin.id,

        title=title,
        body=body,
        priority=AnnouncementPriority(priority), # Cast priority from string to internal Enum
        pinned=pinned,

        attachment_url=attachment_url,
        attachment_type=attachment_type,
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)


    notify_all_residents(
        db = db,
        title = ann.title, #type:ignore
        body = ann.body[:100] + ("..." if len(ann.body) > 100 else ""), #type:ignore
        notification_type = NotificationType.GENERAL,
        reference_id = ann.id, #type:ignore
        society_id = admin.society_id, #type:ignore
    )
    out = AnnouncementOut.model_validate(ann)
    out.creator_name = admin.name # For UI display
    return out


# ── Announcement Discovery ──

# GET endpoint to fetch all bulletins for the user's community
@router.get("", response_model=list[AnnouncementOut])
def list_announcements(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    anns = (
        db.query(Announcement)
        .filter(Announcement.society_id == current_user.society_id)
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
    ann = (
        db.query(Announcement)
        .filter(Announcement.id == announcement_id)
        .first()
    )

    if not ann:
        raise HTTPException(status_code=404, detail="Announcement record not found")
    
    if ann.attachment_url is not None:
        delete_file(ann.attachment_url)
    
    db.delete(ann)
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
    ann = (
        db.query(Announcement)
        .filter(Announcement.id == announcement_id)
        .first()
    )
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
