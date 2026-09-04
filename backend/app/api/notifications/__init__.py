from fastapi import APIRouter
from app.api.notifications.routes import router as routes_router
from app.api.notifications.actions import router as actions_router

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])
router.include_router(routes_router)
router.include_router(actions_router)

__all__ = ["router"]
