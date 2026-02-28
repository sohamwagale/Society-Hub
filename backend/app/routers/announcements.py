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


@router.post("", response_model=AnnouncementOut, status_code=201)
async def create_announcement(
    title: str = Form(...),
    body: str = Form(...),
    priority: str = Form("normal"),
    pinned: bool = Form(False),
    attachment: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    attachment_url = None
    attachment_type = None

    if attachment and attachment.filename:
        att_id = str(uuid.uuid4())
        ext = os.path.splitext(attachment.filename)[1].lower()
        filename = f"{att_id}{ext}"
        content_type = attachment.content_type or "application/octet-stream"
        data = await attachment.read()
        attachment_url = upload_file("announcements", filename, data, content_type)
        attachment_type = "image" if ext in IMAGE_EXTENSIONS else "pdf"

    ann = Announcement(
        id=str(uuid.uuid4()),
        society_id=admin.society_id,
        title=title,
        body=body,
        priority=AnnouncementPriority(priority),
        pinned=pinned,
        attachment_url=attachment_url,
        attachment_type=attachment_type,
        created_by=admin.id,
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)

    notify_all_residents(
        db, f"📢 {ann.title}",
        ann.body[:100] + ("..." if len(ann.body) > 100 else ""),
        NotificationType.GENERAL, ann.id,
        society_id=admin.society_id,
    )

    out = AnnouncementOut.model_validate(ann)
    out.creator_name = admin.name
    return out


@router.get("", response_model=list[AnnouncementOut])
def list_announcements(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    anns = (
        db.query(Announcement)
        .filter(Announcement.society_id == current_user.society_id)
        .order_by(Announcement.pinned.desc(), Announcement.created_at.desc())
        .all()
    )
    results = []
    for a in anns:
        out = AnnouncementOut.model_validate(a)
        out.creator_name = a.creator.name if a.creator else None
        results.append(out)
    return results


@router.delete("/{announcement_id}", status_code=204)
def delete_announcement(
    announcement_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    ann = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Not found")
    # Remove attachment file if exists
    if ann.attachment_url:
        delete_file(ann.attachment_url)
    db.delete(ann)
    db.commit()


@router.patch("/{announcement_id}/pin")
def toggle_pin(
    announcement_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    ann = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Not found")
    ann.pinned = not ann.pinned
    db.commit()
    return {"pinned": ann.pinned}


@router.put("/{announcement_id}")
def update_announcement(
    announcement_id: str,
    payload: AnnouncementUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    ann = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        if field == "priority":
            setattr(ann, field, AnnouncementPriority(value))
        else:
            setattr(ann, field, value)
    db.commit()
    db.refresh(ann)
    return ann
