from fastapi import APIRouter
from app.api.society_documents.documents import router as documents_router
from app.api.society_documents.admin_actions import router as admin_actions_router

router = APIRouter(prefix="/api/documents", tags=["Society Documents"])
router.include_router(admin_actions_router)
router.include_router(documents_router)

__all__ = ["router"]
