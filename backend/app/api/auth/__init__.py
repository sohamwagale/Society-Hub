from fastapi import APIRouter
from app.api.auth.auth import router as auth_router
from app.api.auth.profile import router as profile_router
from app.api.auth.flats import router as flats_router

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
router.include_router(auth_router)
router.include_router(profile_router)
router.include_router(flats_router)

__all__ = ["router"]
