from fastapi import APIRouter
from app.api.activity_log.routes import router as routes_router
from app.api.activity_log.export import router as export_router

router = APIRouter(prefix="/api/activity-log", tags=["Activity Log"])
router.include_router(routes_router)
router.include_router(export_router)

__all__ = ["router"]
