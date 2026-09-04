from fastapi import APIRouter
from app.api.billing.reports import router as reports_router
from app.api.billing.payments import router as payments_router
from app.api.billing.razorpay import router as razorpay_router
from app.api.billing.residents import router as residents_router
from app.api.billing.manage import router as manage_router
from app.api.billing.bills import router as bills_router

router = APIRouter(prefix="/api/bills", tags=["Billing"])

# Mount specific static endpoints before parameterized path endpoints
router.include_router(reports_router)
router.include_router(payments_router)
router.include_router(razorpay_router)
router.include_router(residents_router)
router.include_router(manage_router)
router.include_router(bills_router)

__all__ = ["router"]
