import os
import boto3
from botocore.exceptions import ClientError
from app.core.config import (
    UPLOADS_DIR,
    AWS_REGION,
    AWS_S3_BUCKET_NAME,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_S3_CUSTOM_DOMAIN,
)

# Initialize S3 client if credentials and bucket name are configured
s3_client = None
if AWS_S3_BUCKET_NAME and AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
    try:
        s3_client = boto3.client(
            "s3",
            region_name=AWS_REGION,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        )
    except Exception as e:
        print(f"Warning: Failed to initialize AWS S3 client: {e}")
        s3_client = None


def upload_file(folder: str, filename: str, data: bytes, content_type: str) -> str:
    """
    Persists binary data either to AWS S3 (if configured) or to local disk.
    :param folder: Sub-directory category (e.g., 'documents', 'complaints', 'expenses').
    :param filename: Cleaned, unique filename for the asset.
    :param data: The binary payload retrieved from a multi-part upload.
    :param content_type: MIME type of the file.
    :return: An HTTPS S3 URL or a relative local URL path.
    """
    clean_folder = folder.strip("/")
    clean_filename = filename.strip("/")
    key = f"{clean_folder}/{clean_filename}"

    if s3_client and AWS_S3_BUCKET_NAME:
        extra_args = {}
        if content_type:
            extra_args["ContentType"] = content_type

        s3_client.put_object(
            Bucket=AWS_S3_BUCKET_NAME,
            Key=key,
            Body=data,
            **extra_args,
        )

        if AWS_S3_CUSTOM_DOMAIN:
            return f"https://{AWS_S3_CUSTOM_DOMAIN}/{key}"
        elif AWS_REGION == "us-east-1":
            return f"https://{AWS_S3_BUCKET_NAME}.s3.amazonaws.com/{key}"
        else:
            return f"https://{AWS_S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{key}"

    # Fallback to local storage
    dest_dir = os.path.join(UPLOADS_DIR, clean_folder)
    os.makedirs(dest_dir, exist_ok=True)

    file_path = os.path.join(dest_dir, clean_filename)
    with open(file_path, "wb") as f:
        f.write(data)

    return f"/uploads/{clean_folder}/{clean_filename}"


def delete_file(path: str) -> None:
    """
    Removes a file from AWS S3 or local storage given its URL path.
    """
    if not path:
        return

    try:
        if s3_client and AWS_S3_BUCKET_NAME:
            if AWS_S3_BUCKET_NAME in path or (AWS_S3_CUSTOM_DOMAIN and AWS_S3_CUSTOM_DOMAIN in path):
                parts = path.split(".amazonaws.com/")
                if len(parts) > 1:
                    key = parts[1].lstrip("/")
                elif AWS_S3_CUSTOM_DOMAIN and AWS_S3_CUSTOM_DOMAIN in path:
                    key = path.split(AWS_S3_CUSTOM_DOMAIN)[1].lstrip("/")
                else:
                    key = "/".join(path.split("/")[-2:])

                s3_client.delete_object(Bucket=AWS_S3_BUCKET_NAME, Key=key)
                return

        if path.startswith("/uploads/"):
            file_path = os.path.join(UPLOADS_DIR, path[len("/uploads/"):])
            if os.path.exists(file_path):
                os.remove(file_path)
    except Exception as e:
        print(f"Warning: Failed to delete file {path}: {e}")
