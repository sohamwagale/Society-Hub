import os
from app.core.config import UPLOADS_DIR


def upload_file(folder: str, filename: str, data: bytes, content_type: str) -> str:
    """
    Persists binary data to the local disk and generates a public-facing URL path.
    :param folder: Sub-directory category (e.g., 'documents', 'complaints').
    :param filename: Cleaned, unique filename for the asset.
    :param data: The binary payload retrieved from a multi-part upload.
    :param content_type: MIME type of the file.
    :return: A relative URL path consumable by the frontend (e.g., /uploads/folder/filename).
    """
    dest_dir = os.path.join(UPLOADS_DIR, folder)
    os.makedirs(dest_dir, exist_ok=True)

    file_path = os.path.join(dest_dir, filename)
    with open(file_path, "wb") as f:
        f.write(data)

    return f"/uploads/{folder}/{filename}"


def delete_file(path: str) -> None:
    """
    Removes a file from local storage given its relative URL path.
    """
    if not path:
        return
    try:
        if path.startswith("/uploads/"):
            file_path = os.path.join(UPLOADS_DIR, path[len("/uploads/"):])
            if os.path.exists(file_path):
                os.remove(file_path)
    except Exception:
        pass
