from fastapi import APIRouter
from app.api.dashboard.stats import router as stats_router

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])
router.include_router(stats_router)

__all__ = ["router"]
