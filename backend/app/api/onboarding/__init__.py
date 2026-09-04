from fastapi import APIRouter
from app.api.onboarding.join import router as join_router
from app.api.onboarding.societies import router as societies_router
from app.api.onboarding.approvals import router as approvals_router
from app.api.onboarding.renters import router as renters_router

router = APIRouter(prefix="/api/onboarding", tags=["Onboarding"])
router.include_router(join_router)
router.include_router(societies_router)
router.include_router(approvals_router)
router.include_router(renters_router)

__all__ = ["router"]
