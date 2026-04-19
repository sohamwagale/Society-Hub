# Import standard OS module for file path and extension operations
import os
# Import uuid for generating unique document identifiers and filenames
import uuid
# Import Optional for type hinting nullable fields
from typing import Optional
# Import FastAPI components for routing, dependencies, errors, and multi-part data handling
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
# Import SQLAlchemy Session for database transactions
from sqlalchemy.orm import Session
# Import the database session utility
from app.database import get_db
# Import User and Role models for context-aware filtering
from app.models.user import User, UserRole
# Import SocietyDocument model for DB operations
from app.models.society_document import SocietyDocument
# Import Pydantic schema for output validation
from app.schemas.society_document import SocietyDocumentOut
# Import authentication utilities for session and role verification
from app.utils.auth import get_current_user, require_role
# Import cloud storage utilities for managing binary files
from app.utils.storage import upload_file, delete_file

# Initialize the router with relevant prefix and grouping tags
router = APIRouter(prefix="/api/documents", tags=["Society Documents"])

# Allowed extensions for categorizing visual versus textual files
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


# ── Internal Helpers ──

def _to_out(doc: SocietyDocument) -> SocietyDocumentOut:
    """Helper to transform the DB model into a validated Pydantic output, injecting uploader info."""
    out = SocietyDocumentOut.model_validate(doc)
    # Manual injection of user metadata for UI display
    out.uploader_name = doc.uploader.name if doc.uploader else "System"
    return out


# ── Document Management ──

# POST endpoint for residents/admins to contribute documents to the repository
@router.post("", response_model=SocietyDocumentOut, status_code=201)
async def upload_document(
    # Fields extracted from multi-part form data
    title: str = Form(...),
    description: Optional[str] = Form(None),
    # Mandatory binary file payload
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Generate unique ID for this instance
    doc_id = str(uuid.uuid4())
    # Isolate original extension or fallback
    ext = os.path.splitext(file.filename or "")[1].lower()
    # Construct cloud-safe filename
    filename = f"doc_{doc_id}{ext}"
    content_type = file.content_type or "application/octet-stream"
    # Read file stream
    data = await file.read()
    # Upload to 'documents' bucket
    file_url = upload_file("documents", filename, data, content_type)

    # Automatically tag file type for frontend iconography
    file_type = "image" if ext in IMAGE_EXTENSIONS else "pdf"
    # Business logic check
    is_admin = current_user.role == UserRole.ADMIN

    # Initialize record
    doc = SocietyDocument(
        id=doc_id,
        # Scope to current society
        society_id=current_user.society_id,
        title=title,
        description=description,
        file_url=file_url,
        file_type=file_type,
        # Trust factor: Admin uploads are auto-approved; Residents await review
        is_approved=is_admin,
        uploaded_by=current_user.id,
        # Track approval audit trail if applicable
        approved_by=current_user.id if is_admin else None,
    )
    # save
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return _to_out(doc)


# GET endpoint to list available society documents
@router.get("", response_model=list[SocietyDocumentOut])
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Determine visibility scope
    is_admin = current_user.role == UserRole.ADMIN
    # Base query filters only for the relevant society
    base_query = (
        db.query(SocietyDocument)
        .filter(SocietyDocument.society_id == current_user.society_id)
        # Order by newest uploads
        .order_by(SocietyDocument.created_at.desc())
    )

    if is_admin:
        # Admins see everything (pending + approved) for management
        docs = base_query.all()
    else:
        # Residents only see community-wide approved docs OR their own pending submissions
        docs = base_query.filter(
            (SocietyDocument.is_approved == True)
            | (SocietyDocument.uploaded_by == current_user.id)
        ).all()

    # format and return
    return [_to_out(d) for d in docs]


# GET endpoint to fetch specific details of a document
@router.get("/{doc_id}", response_model=SocietyDocumentOut)
def get_document(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # retrieve by primary key
    doc = db.query(SocietyDocument).filter(SocietyDocument.id == doc_id).first()
    # early exit if missing
    if not doc:
        raise HTTPException(status_code=404, detail="Document entry not found")
    
    # ── Permission Enforcement ──
    # Residents are blocked from viewing unapproved files that don't belong to them
    if current_user.role != UserRole.ADMIN:
        if not doc.is_approved and doc.uploaded_by != current_user.id:
            raise HTTPException(status_code=404, detail="Access Denied: Record not available")
    
    return _to_out(doc)


# PATCH endpoint for admins to approve resident-uploaded files
@router.patch("/{doc_id}/approve", response_model=SocietyDocumentOut)
def approve_document(
    doc_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    # locate record
    doc = db.query(SocietyDocument).filter(SocietyDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Target document missing")
    
    # Update status and log the approver
    doc.is_approved = True
    doc.approved_by = admin.id
    
    # commit changes
    db.commit()
    db.refresh(doc)
    return _to_out(doc)


# DELETE endpoint for admins to remove files permanently
@router.delete("/{doc_id}")
def delete_document(
    doc_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    # locate record
    doc = db.query(SocietyDocument).filter(SocietyDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # ── Cleanup ──
    # Permanently delete the binary file from cloud bucket
    if doc.file_url:
        delete_file(doc.file_url)
    
    # Remove database record
    db.delete(doc)
    # finalize
    db.commit()
    return {"detail": "Document and associated assets successfully purged"}
