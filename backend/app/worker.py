import io
import time

from celery import Celery
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

sync_db_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")

celery_app = Celery("annotateflow", broker=settings.REDIS_URL, backend=settings.REDIS_URL)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
)

sync_engine = create_engine(sync_db_url)
SyncSession = sessionmaker(sync_engine)


def _get_s3_client():
    import boto3
    from botocore.config import Config

    return boto3.client(
        "s3",
        endpoint_url=f"http://{settings.MINIO_ENDPOINT}",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name="us-east-1",
    )


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def process_submission(self, submission_id: str):
    from app.features.submissions.models import ProcessingStatus, Submission

    with SyncSession() as db:
        submission = db.get(Submission, submission_id)
        if not submission:
            return {"error": "Submission not found"}

        submission.processing_status = ProcessingStatus.PROCESSING
        db.commit()

        try:
            s3 = _get_s3_client()
            result = {}

            response = s3.get_object(
                Bucket=settings.MINIO_BUCKET, Key=submission.file_key
            )
            file_bytes = response["Body"].read()
            result["file_size_bytes"] = len(file_bytes)
            result["content_type"] = submission.content_type or "unknown"

            content_type = (submission.content_type or "").lower()

            if content_type.startswith("image/"):
                result.update(_process_image(file_bytes, s3, submission))
            elif content_type.startswith("audio/"):
                result.update(_process_audio(file_bytes))
            elif content_type.startswith("text/"):
                result.update(_process_text(file_bytes))
            else:
                result["processing_note"] = "File stored successfully, no specific processing applied"

            result["processed_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            submission.processing_status = ProcessingStatus.COMPLETED
            submission.processing_result = result
            db.commit()
            return result

        except Exception as exc:
            submission.processing_status = ProcessingStatus.FAILED
            submission.processing_result = {"error": str(exc)}
            db.commit()
            raise self.retry(exc=exc)


def _process_image(file_bytes: bytes, s3, submission):
    try:
        from PIL import Image

        img = Image.open(io.BytesIO(file_bytes))
        width, height = img.size
        result = {
            "type": "image",
            "width": width,
            "height": height,
            "format": img.format,
            "mode": img.mode,
        }

        img.thumbnail((200, 200))
        thumb_buffer = io.BytesIO()
        img.save(thumb_buffer, format="PNG")
        thumb_buffer.seek(0)
        thumb_key = submission.file_key.rsplit("/", 1)[0] + "/thumbnail.png"
        s3.put_object(
            Bucket=settings.MINIO_BUCKET,
            Key=thumb_key,
            Body=thumb_buffer.getvalue(),
            ContentType="image/png",
        )
        result["thumbnail_key"] = thumb_key
        return result
    except ImportError:
        return {"type": "image", "note": "Pillow not installed, metadata extraction skipped"}


def _process_audio(file_bytes: bytes):
    return {
        "type": "audio",
        "file_size_bytes": len(file_bytes),
        "note": "Audio file received and stored",
    }


def _process_text(file_bytes: bytes):
    text = file_bytes.decode("utf-8", errors="replace")
    words = text.split()
    return {
        "type": "text",
        "character_count": len(text),
        "word_count": len(words),
        "line_count": text.count("\n") + 1,
        "preview": text[:500],
    }
