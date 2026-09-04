from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

import app.models  # Register all SQLAlchemy models for metadata creation
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


@app.on_event("startup")
def on_startup():
    """Ensure database tables exist on application startup."""
    Base.metadata.create_all(bind=engine)


# Configure Cross-Origin Resource Sharing (CORS) with credentials support
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://sohamwagale.github.io"
]
env_origins = os.getenv("CORS_ORIGINS")
if env_origins:
    allowed_origins.extend([origin.strip() for origin in env_origins.split(",") if origin.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
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
