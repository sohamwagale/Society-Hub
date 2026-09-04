import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.complaint import Complaint
from app.core.deps import get_current_user
from app.services.storage_service import upload_file

router = APIRouter()


@router.post("/{complaint_id}/upload-image")
async def upload_complaint_image(
    complaint_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Target entity not found")

    if complaint.user_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized attempt to modify complaint assets")

    ext = os.path.splitext(file.filename)[1]
    filename = f"comp_{complaint_id}_{uuid.uuid4().hex[:8]}{ext}"
    content_type = file.content_type or "application/octet-stream"
    data = await file.read()
    image_url = upload_file("complaints", filename, data, content_type)

    images = complaint.images or []
    images.append(image_url)
    complaint.images = images

    db.commit()
    return {"image_path": image_url}
