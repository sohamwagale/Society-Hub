from fastapi import APIRouter
from app.api.society_expenses.export import router as export_router
from app.api.society_expenses.expenses import router as expenses_router

router = APIRouter(prefix="/api/expenses", tags=["Society Expenses"])
router.include_router(export_router)
router.include_router(expenses_router)

__all__ = ["router"]
