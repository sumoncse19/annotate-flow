import boto3
from botocore.config import Config

from app.core.config import settings

s3_client = boto3.client(
    "s3",
    endpoint_url=f"http{'s' if settings.MINIO_USE_SSL else ''}://{settings.MINIO_ENDPOINT}",
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    config=Config(signature_version="s3v4"),
    region_name="us-east-1",
)


def ensure_bucket():
    try:
        s3_client.head_bucket(Bucket=settings.MINIO_BUCKET)
    except Exception:
        s3_client.create_bucket(Bucket=settings.MINIO_BUCKET)


def generate_presigned_upload_url(key: str, content_type: str, expires_in: int = 3600) -> str:
    return s3_client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.MINIO_BUCKET,
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=expires_in,
    )


def generate_presigned_download_url(key: str, expires_in: int = 3600) -> str:
    return s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.MINIO_BUCKET, "Key": key},
        ExpiresIn=expires_in,
    )
