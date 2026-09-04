import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.reimbursement import ReimbursementRequest
from app.core.deps import get_current_user
from app.services.storage_service import upload_file

router = APIRouter()


@router.post("/{request_id}/upload-receipt")
async def upload_receipt(
    request_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = db.query(ReimbursementRequest).filter(ReimbursementRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if req.user_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Permission Denied")

    ext = os.path.splitext(file.filename)[1]
    filename = f"reimb_{request_id}_{uuid.uuid4().hex[:6]}{ext}"
    content_type = file.content_type or "application/octet-stream"
    data = await file.read()
    req.receipt_path = upload_file("reimbursements", filename, data, content_type)
    db.commit()
    return {"receipt_path": req.receipt_path}
