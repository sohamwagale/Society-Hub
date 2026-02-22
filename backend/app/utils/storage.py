import os
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
SUPABASE_BUCKET = os.environ.get("SUPABASE_BUCKET", "society-uploads")

_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _client


def upload_file(folder: str, filename: str, data: bytes, content_type: str) -> str:
    """Upload a file to Supabase Storage and return the public URL."""
    client = get_supabase()
    path = f"{folder}/{filename}"
    client.storage.from_(SUPABASE_BUCKET).upload(
        path=path,
        file=data,
        file_options={"content-type": content_type, "upsert": "true"},
    )
    public_url = client.storage.from_(SUPABASE_BUCKET).get_public_url(path)
    return public_url


def delete_file(public_url: str) -> None:
    """Delete a file from Supabase Storage given its public URL."""
    if not public_url:
        return
    try:
        # Extract path after bucket name from public URL
        # e.g. https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
        marker = f"/object/public/{SUPABASE_BUCKET}/"
        idx = public_url.find(marker)
        if idx == -1:
            return
        path = public_url[idx + len(marker):]
        get_supabase().storage.from_(SUPABASE_BUCKET).remove([path])
    except Exception:
        pass  # Best-effort deletion; don't fail the request if delete fails
