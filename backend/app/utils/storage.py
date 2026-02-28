"""
Local file storage utility.
Files are saved to the backend's `uploads/` directory and served via the
static files mount at /uploads (configured in main.py).

On EC2, the uploads/ directory lives alongside the backend code on the 8 GB EBS
volume — no Supabase or external storage dependency.
"""
import os

# Root of the backend project (one level above app/)
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS_DIR = os.path.join(_BASE_DIR, "uploads")


def upload_file(folder: str, filename: str, data: bytes, content_type: str) -> str:
    """
    Save a file to the local uploads directory and return its URL path.
    The returned path is relative, e.g. /uploads/documents/uuid.pdf
    This path is directly accessible via the /uploads static mount.
    """
    dest_dir = os.path.join(UPLOADS_DIR, folder)
    os.makedirs(dest_dir, exist_ok=True)

    file_path = os.path.join(dest_dir, filename)
    with open(file_path, "wb") as f:
        f.write(data)

    # Return the relative URL path — the frontend prepends the base URL
    return f"/uploads/{folder}/{filename}"


def delete_file(path: str) -> None:
    """Delete a locally-stored upload file given its URL path (/uploads/...)."""
    if not path:
        return
    try:
        if path.startswith("/uploads/"):
            file_path = os.path.join(UPLOADS_DIR, path[len("/uploads/"):])
            if os.path.exists(file_path):
                os.remove(file_path)
    except Exception:
        pass  # Best-effort deletion; don't fail the request
