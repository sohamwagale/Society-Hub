from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.database import engine, Base
from app.routers import auth, billing, complaints, polls, reimbursements, notifications
from app.routers import announcements, residents, dashboard, society, activity_log, onboarding, society_expenses, society_documents

app = FastAPI(title="Apartment Society Management API", version="2.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
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

# Serve locally-stored uploads (backward compat for files saved before Supabase).
# New uploads go directly to Supabase Storage and don't use this path.
_uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'uploads')
os.makedirs(_uploads_dir, exist_ok=True)
app.mount('/uploads', StaticFiles(directory=_uploads_dir), name='uploads')



@app.get("/")
def root():
    return {"message": "Apartment Society Management API", "version": "2.0", "docs": "/docs"}


