from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.announcement import Announcement, AnnouncementPriority
from app.schemas.announcement import AnnouncementUpdate
from app.core.deps import require_role
from app.services.storage_service import delete_file

router = APIRouter()


@router.delete("/{announcement_id}", status_code=204)
def delete_announcement(
    announcement_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    ann = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement record not found")

    if ann.attachment_url is not None:
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
        raise HTTPException(status_code=404, detail="Announcement not found")

    ann.pinned = not ann.pinned
    db.commit()
    return {"pinned_status": ann.pinned}


@router.put("/{announcement_id}")
def update_announcement(
    announcement_id: str,
    payload: AnnouncementUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    ann = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Target announcement missing")

    for field, value in payload.model_dump(exclude_none=True).items():
        if field == "priority":
            setattr(ann, field, AnnouncementPriority(value))
        else:
            setattr(ann, field, value)

    db.commit()
    db.refresh(ann)
    return ann
