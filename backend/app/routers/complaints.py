# Import standard OS module for file path operations
import os
# Import uuid for generating unique complaint and comment IDs
import uuid
# Import datetime for timestamping updates and comments
from datetime import datetime
# Import Optional for type hinting nullable query parameters
from typing import Optional
# Import FastAPI routing and dependency injection tools
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
# Import SQLAlchemy Session for database transactions
from sqlalchemy.orm import Session
# Import database session utility
from app.database import get_db
# Import core models for Users and Complaints
from app.models.user import User
from app.models.complaint import Complaint, ComplaintStatus, ComplaintCategory
# Import nested comment model for complaint discourse
from app.models.comment import ComplaintComment
# Import Pydantic schemas for data validation and output formatting
from app.schemas.complaint import ComplaintCreate, ComplaintUpdate, ComplaintOut
from app.schemas.comment import CommentCreate, CommentOut
# Import authentication utilities for session and role verification
from app.utils.auth import get_current_user, require_role
# Import cloud storage utility for handling image uploads
from app.utils.storage import upload_file
# Import notification service for real-time alerting
from app.services.notification_service import create_notification
# Import notification type enum
from app.models.notification import NotificationType

# Initialize router with relevant prefix and tag
router = APIRouter(prefix="/api/complaints", tags=["Complaints"])


# ── Complaint Lifecycle Endpoints ──

# POST endpoint for residents to lodge a new complaint
@router.post("", response_model=ComplaintOut, status_code=201)
def create_complaint(
    data: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Initialize a new Complaint record
    complaint = Complaint(
        # Generate a unique tracking ID
        id=str(uuid.uuid4()),
        # Link to the user's specific society
        society_id=current_user.society_id,
        # Link to the filing user
        user_id=current_user.id,
        # Cast category input to internal Enum
        category=ComplaintCategory(data.category),
        # Descriptive title and detailed body
        title=data.title,
        description=data.description,
        # Set initial status to OPEN
        status=ComplaintStatus.OPEN,
    )
    # stage and commit the record
    db.add(complaint)
    db.commit()
    # reload and return the created object
    db.refresh(complaint)
    return complaint


# GET endpoint to retrieve a list of complaints (context-aware)
@router.get("", response_model=list[ComplaintOut])
def list_complaints(
    status: Optional[str] = Query(None, description="Filter by status: open, in_progress, resolved"),
    category: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Base query initialization
    query = db.query(Complaint)

    # Filter all complaints belonging to the user's society
    query = query.filter(Complaint.society_id == current_user.society_id)

    # Apply status filter if provided (e.g., show only 'resolved' issues)
    if status:
        query = query.filter(Complaint.status == ComplaintStatus(status))

    # Apply category filter if provided (e.g., show only 'plumbing' issues)
    if category:
        query = query.filter(Complaint.category == ComplaintCategory(category))

    # Return results sorted by newest first
    return query.order_by(Complaint.created_at.desc()).all()


# GET endpoint to fetch details of one specific complaint
@router.get("/{complaint_id}", response_model=ComplaintOut)
def get_complaint(complaint_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # retrieve complaint by ID
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    # error if missing or outside society
    if not complaint or complaint.society_id != current_user.society_id:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint


# PATCH endpoint for admins to manage complaint status and resolution
@router.patch("/{complaint_id}", response_model=ComplaintOut)
def update_complaint(
    complaint_id: str,
    data: ComplaintUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    # locate record
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # update status if provided in the patch payload
    if data.status:
        complaint.status = ComplaintStatus(data.status)
    # apply admin-only internal resolution notes
    if data.admin_notes is not None:
        complaint.admin_notes = data.admin_notes
    # refresh the updated_at timestamp
    complaint.updated_at = datetime.utcnow()

    # save changes
    db.commit()
    db.refresh(complaint)

    # notify the resident about the progress/resolution of their issue
    create_notification(
        db, complaint.user_id,
        f"Complaint Update: {complaint.title}",
        f"Status changed to: {complaint.status.value}",
        NotificationType.COMPLAINT, complaint.id,
    )

    return complaint


# ── Dynamic Discourse & Communication ──

# GET endpoint to fetch all messages/replies on a complaint
@router.get("/{complaint_id}/comments", response_model=list[CommentOut])
def list_comments(complaint_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # verify parent complaint exists
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint or complaint.society_id != current_user.society_id:
        raise HTTPException(status_code=404, detail="Complaint record not found")
    
    # fetch chronologically
    comments = (
        db.query(ComplaintComment)
        .filter(ComplaintComment.complaint_id == complaint_id)
        .order_by(ComplaintComment.created_at.asc())
        .all()
    )
    
    # post-process for frontend-friendly meta info
    results = []
    for c in comments:
        out = CommentOut.model_validate(c)
        # inject sender information
        out.user_name = c.user.name if c.user else "Deleted User"
        out.user_role = c.user.role.value if c.user else "N/A"
        results.append(out)
    return results


# POST endpoint to reply to a complaint thread
@router.post("/{complaint_id}/comments", response_model=CommentOut, status_code=201)
def add_comment(
    complaint_id: str,
    data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # verify target entity
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint or complaint.society_id != current_user.society_id:
        raise HTTPException(status_code=404, detail="Parent entity missing")

    # initialize the internal message record
    comment = ComplaintComment(
        id=str(uuid.uuid4()),
        complaint_id=complaint_id,
        user_id=current_user.id,
        message=data.message,
    )
    # save to database
    db.add(comment)
    db.commit()
    db.refresh(comment)

    # ── Intelligent Cross-Notification ──
    if current_user.role.value == "admin":
        # If admin replies, notify the resident
        create_notification(
            db, complaint.user_id,
            f"New reply from Admin on: {complaint.title}",
            data.message[:80],
            NotificationType.COMPLAINT, complaint.id,
        )
    else:
        # If resident replies, broadcast alert to all society admins
        from app.models.user import UserRole
        admins = db.query(User).filter(User.role == UserRole.ADMIN, User.society_id == current_user.society_id).all()
        for admin in admins:
            create_notification(
                db, admin.id,
                f"Resident response on: {complaint.title}",
                data.message[:80],
                NotificationType.COMPLAINT, complaint.id,
            )

    # return formatted output with sender meta
    out = CommentOut.model_validate(comment)
    out.user_name = current_user.name
    out.user_role = current_user.role.value
    return out


# ── Multimedia Support ──

# POST endpoint to attach photographic evidence to a complaint
@router.post("/{complaint_id}/upload-image")
async def upload_complaint_image(
    complaint_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # locate target entity
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Target entity not found")
    
    # Ensure only permitted users can modify the evidence gallery
    if complaint.user_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized attempt to modify complaint assets")

    # isolate and clean file metadata
    ext = os.path.splitext(file.filename)[1]
    # generate cloud-friendly unique key
    filename = f"comp_{complaint_id}_{uuid.uuid4().hex[:8]}{ext}"
    content_type = file.content_type or "application/octet-stream"
    # buffer the binary payload
    data = await file.read()
    # execute cloud write
    image_url = upload_file("complaints", filename, data, content_type)

    # Logic to track multiple images in a JSON/List column
    images = complaint.images or []
    images.append(image_url)
    complaint.images = images
    
    # Finalize state
    db.commit()
    # return the access URL
    return {"image_path": image_url}
