import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.society_document import SocietyDocument
from app.schemas.society_document import SocietyDocumentOut
from app.utils.auth import get_current_user, require_role
from app.utils.storage import upload_file, delete_file

router = APIRouter(prefix="/api/documents", tags=["Society Documents"])

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


def _to_out(doc: SocietyDocument) -> SocietyDocumentOut:
    out = SocietyDocumentOut.model_validate(doc)
    out.uploader_name = doc.uploader.name if doc.uploader else None
    return out


@router.post("", response_model=SocietyDocumentOut, status_code=201)
async def upload_document(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename or "")[1].lower()
    filename = f"{doc_id}{ext}"
    content_type = file.content_type or "application/octet-stream"
    data = await file.read()
    file_url = upload_file("documents", filename, data, content_type)

    file_type = "image" if ext in IMAGE_EXTENSIONS else "pdf"
    is_admin = current_user.role == UserRole.ADMIN

    doc = SocietyDocument(
        id=doc_id,
        title=title,
        description=description,
        file_url=file_url,
        file_type=file_type,
        is_approved=is_admin,  # auto-approve for admins
        uploaded_by=current_user.id,
        approved_by=current_user.id if is_admin else None,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return _to_out(doc)


@router.get("", response_model=list[SocietyDocumentOut])
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    is_admin = current_user.role == UserRole.ADMIN
    query = db.query(SocietyDocument).order_by(SocietyDocument.created_at.desc())

    if is_admin:
        docs = query.all()
    else:
        # Residents see approved docs + their own pending uploads
        docs = query.filter(
            (SocietyDocument.is_approved == True)
            | (SocietyDocument.uploaded_by == current_user.id)
        ).all()

    return [_to_out(d) for d in docs]


@router.get("/{doc_id}", response_model=SocietyDocumentOut)
def get_document(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(SocietyDocument).filter(SocietyDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    # Residents can only see approved docs or their own
    if current_user.role != UserRole.ADMIN:
        if not doc.is_approved and doc.uploaded_by != current_user.id:
            raise HTTPException(status_code=404, detail="Document not found")
    return _to_out(doc)


@router.patch("/{doc_id}/approve", response_model=SocietyDocumentOut)
def approve_document(
    doc_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    doc = db.query(SocietyDocument).filter(SocietyDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.is_approved = True
    doc.approved_by = admin.id
    db.commit()
    db.refresh(doc)
    return _to_out(doc)


@router.delete("/{doc_id}")
def delete_document(
    doc_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    doc = db.query(SocietyDocument).filter(SocietyDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    # Remove file from storage
    if doc.file_url:
        delete_file(doc.file_url)
    db.delete(doc)
    db.commit()
    return {"detail": "Document deleted"}
