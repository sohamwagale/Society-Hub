from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum  # type: ignore[import-untyped]  # Installed in requirements.txt, available in Lambda

from app.database import engine, Base
from app.routers import auth, billing, complaints, polls, reimbursements, notifications
from app.routers import announcements, residents, dashboard, society, activity_log, onboarding, society_expenses, society_documents


# Initialize FastAPI at root level - no prefixes
app = FastAPI(
    title="Apartment Society Management API",
    version="2.0",
    servers=[
        {"url": "https://vu4rynvvc2p2dlulccufo7vbti0vraom.lambda-url.ap-south-1.on.aws"}
    ],
    redirect_slashes=False   # 👈 ADD THIS
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

handler = Mangum(
    app,
    lifespan="off",
    api_gateway_base_path=""
)


# Middleware to strip API Gateway stage prefixes (e.g., /default/SocietyBackend)



# Include all routers
app.include_router(auth.router)
app.include_router(billing.router)
app.include_router(complaints.router)
app.include_router(polls.router)
app.include_router(reimbursements.router)
app.include_router(notifications.router)
app.include_router(announcements.router)
app.include_router(residents.router)
app.include_router(dashboard.router)
app.include_router(society.router)
app.include_router(activity_log.router)
app.include_router(onboarding.router)
app.include_router(society_expenses.router)
app.include_router(society_documents.router)


# Root endpoint - handle both with and without trailing slash
@app.get("")
def root():
    return {
        "message": "Apartment Society Management API",
        "version": "2.0",
        "docs": "/docs",
        "endpoints": {
            "auth": "/api/auth",
            "billing": "/api/bills",
            "complaints": "/api/complaints",
            "polls": "/api/polls",
            "reimbursements": "/api/reimbursements",
            "notifications": "/api/notifications",
            "announcements": "/api/announcements",
            "residents": "/api/residents",
            "dashboard": "/api/dashboard",
            "society": "/api/society",
            "activity_log": "/api/activity-log",
            "onboarding": "/api/onboarding",
            "expenses": "/api/expenses",
            "documents": "/api/documents"
        }
    }
