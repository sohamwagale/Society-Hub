from fastapi import APIRouter
from app.api.complaints.complaints import router as complaints_router
from app.api.complaints.comments import router as comments_router
from app.api.complaints.attachments import router as attachments_router

router = APIRouter(prefix="/api/complaints", tags=["Complaints"])

# Comments and attachments must be included before general parameter patterns
router.include_router(comments_router)
router.include_router(attachments_router)
router.include_router(complaints_router)

__all__ = ["router"]
