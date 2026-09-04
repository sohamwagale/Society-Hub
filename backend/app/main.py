from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.database import engine, Base
from app.core.config import UPLOADS_DIR
from app.api import (
    auth_router,
    billing_router,
    complaints_router,
    polls_router,
    reimbursements_router,
    notifications_router,
    announcements_router,
    residents_router,
    dashboard_router,
    society_router,
    activity_log_router,
    onboarding_router,
    society_expenses_router,
    society_documents_router,
)

app = FastAPI(title="Apartment Society Management API", version="2.0")

# Configure Cross-Origin Resource Sharing (CORS) to allow requests from any origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(billing_router)
app.include_router(complaints_router)
app.include_router(polls_router)
app.include_router(reimbursements_router)
app.include_router(notifications_router)
app.include_router(announcements_router)
app.include_router(residents_router)
app.include_router(dashboard_router)
app.include_router(society_router)
app.include_router(activity_log_router)
app.include_router(onboarding_router)
app.include_router(society_expenses_router)
app.include_router(society_documents_router)

os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount('/uploads', StaticFiles(directory=UPLOADS_DIR), name='uploads')


@app.get("/")
def root():
    return {
        "message": "Apartment Society Management API",
        "version": "2.0",
        "docs": "/docs"
    }
