from fastapi import APIRouter
from app.api.polls.polls import router as polls_router
from app.api.polls.votes import router as votes_router
from app.api.polls.actions import router as actions_router

router = APIRouter(prefix="/api/polls", tags=["Polls"])
router.include_router(votes_router)
router.include_router(actions_router)
router.include_router(polls_router)

__all__ = ["router"]
