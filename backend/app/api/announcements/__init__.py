from fastapi import APIRouter
from app.api.announcements.routes import router as routes_router
from app.api.announcements.actions import router as actions_router

router = APIRouter(prefix="/api/announcements", tags=["Announcements"])
router.include_router(routes_router)
router.include_router(actions_router)

__all__ = ["router"]
