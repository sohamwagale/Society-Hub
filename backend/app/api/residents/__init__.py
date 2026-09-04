from fastapi import APIRouter
from app.api.residents.stats import router as stats_router
from app.api.residents.committee import router as committee_router
from app.api.residents.directory import router as directory_router

router = APIRouter(prefix="/api/residents", tags=["Residents"])
router.include_router(stats_router)
router.include_router(committee_router)
router.include_router(directory_router)

__all__ = ["router"]
