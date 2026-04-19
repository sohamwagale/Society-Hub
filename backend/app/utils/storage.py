"""
Local File Storage Subsystem — Manages individual and bulk file persistence within the server environment.
Operating Context: Files are managed within a local 'uploads/' directory and exposed via FastAPI's static mount.
"""
# Import OS for filesystem path manipulation and IO operations
import os

# ── Filesystem Mapping ──
# Identify the absolute path of the backend relative to this file
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Define the centralized directory where all binary assets (images, PDFs) will reside
UPLOADS_DIR = os.path.join(_BASE_DIR, "uploads")


# ── File Orchestration ──

def upload_file(folder: str, filename: str, data: bytes, content_type: str) -> str:
    """
    Persists binary data to the local disk and generates a public-facing URL path.
    :param folder: Sub-directory category (e.g., 'documents', 'complaints').
    :param filename: Cleaned, unique filename for the asset.
    :param data: The binary payload retrieved from a multi-part upload.
    :param content_type: MIME type of the file (stored for metadata if needed).
    :return: A relative URL path consumable by the frontend (e.g., /uploads/folder/filename).
    """
    # Calculate the targeted subdirectory on disk
    dest_dir = os.path.join(UPLOADS_DIR, folder)
    # Ensure the target directory exists; create it recursively if missing
    os.makedirs(dest_dir, exist_ok=True)

    # Define the absolute target path for the file
    file_path = os.path.join(dest_dir, filename)
    # Open the file in 'write-binary' mode to preserve data integrity
    with open(file_path, "wb") as f:
        # Commit the data to the storage medium
        f.write(data)

    # Return the URI path — this is mapped to the public static server in main.py
    return f"/uploads/{folder}/{filename}"


def delete_file(path: str) -> None:
    """
    Removes a file from local storage given its relative URL path.
    Designed as a best-effort operation to maintain storage cleanliness during record deletion.
    """
    # Guard against empty paths
    if not path:
        return
    try:
        # Verify the path belongs to our managed /uploads space
        if path.startswith("/uploads/"):
            # Map the URL path back to an absolute filesystem path
            # strip the leading '/uploads/' prefix and join with base UPLOADS_DIR
            file_path = os.path.join(UPLOADS_DIR, path[len("/uploads/"):])
            # Check for physical existence on the volume
            if os.path.exists(file_path):
                # Permanently remove the file from the disk
                os.remove(file_path)
    except Exception:
        # Suppress exceptions — file cleanup failure should NOT stop a primary DB transaction or API response
        pass
