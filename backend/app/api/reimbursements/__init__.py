from fastapi import APIRouter
from app.api.reimbursements.payments import router as payments_router
from app.api.reimbursements.receipts import router as receipts_router
from app.api.reimbursements.requests import router as requests_router

router = APIRouter(prefix="/api/reimbursements", tags=["Reimbursements"])
router.include_router(payments_router)
router.include_router(receipts_router)
router.include_router(requests_router)

__all__ = ["router"]
