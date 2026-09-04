from app.api.auth import router as auth_router
from app.api.billing import router as billing_router
from app.api.complaints import router as complaints_router
from app.api.polls import router as polls_router
from app.api.reimbursements import router as reimbursements_router
from app.api.notifications import router as notifications_router
from app.api.announcements import router as announcements_router
from app.api.residents import router as residents_router
from app.api.dashboard import router as dashboard_router
from app.api.society import router as society_router
from app.api.activity_log import router as activity_log_router
from app.api.onboarding import router as onboarding_router
from app.api.society_expenses import router as society_expenses_router
from app.api.society_documents import router as society_documents_router

__all__ = [
    "auth_router",
    "billing_router",
    "complaints_router",
    "polls_router",
    "reimbursements_router",
    "notifications_router",
    "announcements_router",
    "residents_router",
    "dashboard_router",
    "society_router",
    "activity_log_router",
    "onboarding_router",
    "society_expenses_router",
    "society_documents_router",
]
