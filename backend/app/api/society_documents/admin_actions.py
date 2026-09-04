from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.society_document import SocietyDocument
from app.schemas.society_document import SocietyDocumentOut
from app.core.deps import require_role
from app.services.storage_service import delete_file

router = APIRouter()


def to_out(doc: SocietyDocument) -> SocietyDocumentOut:
    out = SocietyDocumentOut.model_validate(doc)
    out.uploader_name = doc.uploader.name if doc.uploader else "System"
    return out


@router.patch("/{doc_id}/approve", response_model=SocietyDocumentOut)
def approve_document(
    doc_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    doc = db.query(SocietyDocument).filter(SocietyDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Target document missing")

    doc.is_approved = True
    doc.approved_by = admin.id
    db.commit()
    db.refresh(doc)
    return to_out(doc)


@router.delete("/{doc_id}")
def delete_document(
    doc_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    doc = db.query(SocietyDocument).filter(SocietyDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.file_url:
        delete_file(doc.file_url)

    db.delete(doc)
    db.commit()
    return {"detail": "Document and associated assets successfully purged"}
