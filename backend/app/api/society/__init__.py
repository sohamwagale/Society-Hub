from fastapi import APIRouter
from app.api.society.info import router as info_router
from app.api.society.emergency_contacts import router as emergency_contacts_router
from app.api.society.societies import router as societies_router

router = APIRouter(prefix="/api/society", tags=["Society"])
router.include_router(info_router)
router.include_router(emergency_contacts_router)
router.include_router(societies_router)

__all__ = ["router"]
