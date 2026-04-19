# Import the FastAPI class for building the web application
from fastapi import FastAPI
# Import CORSMiddleware to handle Cross-Origin Resource Sharing (CORS) security
from fastapi.middleware.cors import CORSMiddleware
# Import StaticFiles to serve files (like images/uploads) from a local directory
from fastapi.staticfiles import StaticFiles
# Import os for operating system related operations like path manipulation
import os

# Import the database engine and Base class for database connectivity and modeling
from app.database import engine, Base
# Import all routers for different functional modules of the application
from app.routers import auth, billing, complaints, polls, reimbursements, notifications
from app.routers import announcements, residents, dashboard, society, activity_log, onboarding, society_expenses, society_documents

# Initialize the FastAPI application with a custom title and version
app = FastAPI(title="Apartment Society Management API", version="2.0")

# Configure Cross-Origin Resource Sharing (CORS) to allow requests from any origin
# This is useful during development and for mobile app integrations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],            # Allow all origins to access the API
    allow_credentials=True,         # Allow cookies and authentication headers
    allow_methods=["*"],            # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],            # Allow all HTTP headers
)

# Register the authentication router (login, register, etc.)
app.include_router(auth.router)
# Register the billing router (maintenance bills, payments)
app.include_router(billing.router)
# Register the complaints router (resident complaints handling)
app.include_router(complaints.router)
# Register the polls router (voting and opinion gathering)
app.include_router(polls.router)
# Register the reimbursements router (managing expense claims)
app.include_router(reimbursements.router)
# Register the notifications router (push and internal alerts)
app.include_router(notifications.router)
# Register the announcements router (society-wide broadcasts)
app.include_router(announcements.router)
# Register the residents router (member directory and management)
app.include_router(residents.router)
# Register the dashboard router (overview statistics)
app.include_router(dashboard.router)
# Register the society router (general society configuration)
app.include_router(society.router)
# Register the activity log router (tracking system actions)
app.include_router(activity_log.router)
# Register the onboarding router (handling new society/user setup)
app.include_router(onboarding.router)
# Register the society expenses router (tracking society-level spending)
app.include_router(society_expenses.router)
# Register the society documents router (managing official society files)
app.include_router(society_documents.router)

# Serve locally-stored uploads (backward compatibility for files saved before migrating to Supabase)
# New uploads go directly to Supabase Storage and don't use this local path
# Construct the absolute path to the 'uploads' directory
_uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'uploads')
# Ensure the uploads directory exists on the server
os.makedirs(_uploads_dir, exist_ok=True)
# Mount the local uploads directory to the '/uploads' URL path
app.mount('/uploads', StaticFiles(directory=_uploads_dir), name='uploads')

# Root endpoint to verify if the API is running correctly
@app.get("/")
def root():
    # Return a basic JSON response with API information
    return {"message": "Apartment Society Management API", "version": "2.0", "docs": "/docs"}



