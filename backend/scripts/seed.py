"""
Seed script: populates the database with realistic demo data and uploads
real images from Unsplash to MinIO.
Run with: make seed
"""

import asyncio
import io
import math
import struct
import uuid
import wave

import httpx
from sqlalchemy import text

import app.shared.models  # noqa: F401
from app.core.database import async_session, engine
from app.core.security import hash_password
from app.features.auth.models import User, UserRole
from app.features.projects.models import Project
from app.features.submissions.models import ProcessingStatus, Submission
from app.features.tasks.models import Task, TaskStatus, TaskType
from app.shared.base_model import Base
from app.shared.storage import s3_client, ensure_bucket
from app.core.config import settings

# Unsplash images (free, no API key needed with direct URLs)
UNSPLASH_IMAGES = {
    "product": [
        ("product_watch.jpg", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80"),
        ("product_headphones.jpg", "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80"),
        ("product_camera.jpg", "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80"),
        ("product_sunglasses.jpg", "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80"),
        ("product_shoe.jpg", "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80"),
    ],
    "medical": [
        ("lab_report_scan.jpg", "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=80"),
        ("medical_document.jpg", "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80"),
    ],
}

SAMPLE_TEXT_FILES = [
    ("transcript_001.txt", "Customer: Hi, I'd like to return the headphones I purchased last week.\nAgent: Of course! May I have your order number?\nCustomer: It's ORD-2847391. The sound quality wasn't as expected.\nAgent: I understand. I'll process the return right away. You'll receive a prepaid shipping label within 24 hours.\nCustomer: That's great, thank you for the quick help!\nAgent: You're welcome! Is there anything else I can help with?"),
    ("transcript_002.txt", "Customer: I'm having trouble setting up my new smart speaker.\nAgent: I'd be happy to help! Have you connected it to your Wi-Fi network?\nCustomer: Yes, but the app keeps showing 'device not found'.\nAgent: Let's try resetting the device. Hold the top button for 10 seconds until the light turns orange.\nCustomer: Okay, done. Oh wait, it's showing up now!\nAgent: Perfect! Sometimes a quick reset does the trick. Anything else?"),
    ("report_data.csv", "id,product_name,category,sentiment,confidence\n1,Wireless Earbuds Pro,electronics,positive,0.94\n2,Organic Cotton T-Shirt,clothing,neutral,0.72\n3,Stainless Steel Water Bottle,accessories,positive,0.88\n4,Bluetooth Speaker Mini,electronics,positive,0.91\n5,Running Shoes Lite,footwear,mixed,0.65\n6,Laptop Stand Adjustable,electronics,positive,0.87\n7,Canvas Backpack,accessories,neutral,0.69\n8,LED Desk Lamp,home,positive,0.93"),
]


def _download_image(url: str) -> tuple[bytes, int, int] | None:
    """Download an image and return (bytes, width, height)."""
    try:
        resp = httpx.get(url, follow_redirects=True, timeout=15)
        resp.raise_for_status()
        data = resp.content

        # Get dimensions using Pillow
        try:
            from PIL import Image
            img = Image.open(io.BytesIO(data))
            w, h = img.size
            return data, w, h
        except ImportError:
            return data, 800, 600  # fallback dimensions
    except Exception as e:
        print(f"    Warning: Failed to download {url}: {e}")
        return None


def _generate_wav(duration_sec: float, frequency: float = 440.0, sample_rate: int = 16000) -> bytes:
    """Generate a simple WAV audio file with a sine wave tone."""
    buf = io.BytesIO()
    n_samples = int(sample_rate * duration_sec)
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        for i in range(n_samples):
            # Fade in/out to avoid clicks
            t = i / sample_rate
            envelope = min(t * 10, 1.0, (duration_sec - t) * 10)
            sample = int(16000 * envelope * math.sin(2 * math.pi * frequency * t))
            wf.writeframes(struct.pack("<h", sample))
    return buf.getvalue()


def _upload_to_minio(file_key: str, data: bytes, content_type: str):
    """Upload bytes to MinIO."""
    s3_client.put_object(
        Bucket=settings.MINIO_BUCKET,
        Key=file_key,
        Body=data,
        ContentType=content_type,
    )


async def seed():
    # Ensure tables + bucket exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        ensure_bucket()
    except Exception:
        print("Warning: MinIO not available, skipping file uploads")

    async with async_session() as db:
        # Check if already seeded
        result = await db.execute(text("SELECT count(*) FROM users"))
        count = result.scalar()
        if count and count > 0:
            print(f"Database already has {count} users. Skipping seed.")
            print("Run 'make seed-reset' to clear and re-seed.")
            return

        print("Seeding database...")

        # ── Users ──
        admin = User(
            id=uuid.uuid4(), email="admin@annotateflow.dev",
            hashed_password=hash_password("admin123"),
            full_name="Sarah Chen", role=UserRole.ADMIN,
        )
        contributors = [
            User(id=uuid.uuid4(), email=f"contributor{i}@annotateflow.dev",
                 hashed_password=hash_password("demo123"),
                 full_name=name, role=UserRole.CONTRIBUTOR)
            for i, name in enumerate([
                "Alex Rivera", "Priya Sharma", "Marcus Johnson",
                "Yuki Tanaka", "Elena Popov",
            ], 1)
        ]
        all_users = [admin] + contributors
        db.add_all(all_users)
        await db.flush()
        print(f"  Created {len(all_users)} users")

        # ── Projects ──
        projects_data = [
            ("Product Image Classification", "Classify e-commerce product images into 12 categories for the recommendation engine"),
            ("Customer Support Audio", "Transcribe and categorize customer support calls for sentiment analysis"),
            ("Medical Document Extraction", "Extract structured data from scanned medical forms and lab reports"),
        ]
        projects = []
        for name, desc in projects_data:
            p = Project(id=uuid.uuid4(), name=name, description=desc, owner_id=admin.id)
            projects.append(p)
        db.add_all(projects)
        await db.flush()
        print(f"  Created {len(projects)} projects")

        # ── Tasks ──
        tasks_data = [
            (0, "Label product photos - Batch 1", "Tag each image with primary category", TaskType.IMAGE, TaskStatus.COMPLETED, 3),
            (0, "Label product photos - Batch 2", "Tag each image with primary category", TaskType.IMAGE, TaskStatus.IN_PROGRESS, 2),
            (0, "Verify edge cases", "Review images flagged by ML model as ambiguous", TaskType.IMAGE, TaskStatus.OPEN, 1),
            (0, "Extract text from product labels", "OCR validation for product packaging", TaskType.TEXT, TaskStatus.OPEN, 0),
            (1, "Transcribe support calls - Week 1", "Convert audio recordings to text", TaskType.AUDIO, TaskStatus.COMPLETED, 2),
            (1, "Transcribe support calls - Week 2", "Convert audio recordings to text", TaskType.AUDIO, TaskStatus.IN_PROGRESS, 1),
            (1, "Sentiment labeling", "Tag each transcript with positive/negative/neutral", TaskType.TEXT, TaskStatus.OPEN, 0),
            (2, "Scan lab reports", "Upload scanned lab report images", TaskType.IMAGE, TaskStatus.IN_PROGRESS, 2),
            (2, "Extract patient data", "Parse structured fields from forms", TaskType.TEXT, TaskStatus.OPEN, 1),
            (2, "Audio notes from doctors", "Record and transcribe doctor notes", TaskType.AUDIO, TaskStatus.OPEN, 0),
        ]
        tasks = []
        for proj_idx, title, desc, task_type, status, priority in tasks_data:
            t = Task(
                id=uuid.uuid4(), title=title, description=desc,
                task_type=task_type, status=status, priority=priority,
                project_id=projects[proj_idx].id,
            )
            tasks.append(t)
        db.add_all(tasks)
        await db.flush()
        print(f"  Created {len(tasks)} tasks")

        # ── Download images from Unsplash ──
        print("  Downloading images from Unsplash...")
        image_cache: dict[str, tuple[bytes, int, int]] = {}
        for category, images in UNSPLASH_IMAGES.items():
            for fname, url in images:
                result = _download_image(url)
                if result:
                    image_cache[fname] = result
                    print(f"    Downloaded {fname} ({len(result[0]) // 1024} KB)")

        # ── Create Submissions with real files ──
        submissions = []
        uploaded = 0

        for task in tasks:
            if task.status not in (TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS):
                continue

            contributor = contributors[hash(str(task.id)) % len(contributors)]
            proj_slug = "product_image_classification" if task.project_id == projects[0].id else \
                        "customer_support_audio" if task.project_id == projects[1].id else \
                        "medical_document_extraction"
            proj_folder = f"{proj_slug}_{str(task.project_id)[:8]}"
            type_folder = task.task_type.value

            if task.task_type == TaskType.IMAGE:
                # Use Unsplash images
                img_set = "product" if task.project_id == projects[0].id else "medical"
                files_to_use = UNSPLASH_IMAGES[img_set]
                num = len(files_to_use) if task.status == TaskStatus.COMPLETED else min(2, len(files_to_use))

                for i in range(num):
                    fname = files_to_use[i][0]
                    file_key = f"submissions/{proj_folder}/{type_folder}/{fname}"
                    status = ProcessingStatus.COMPLETED
                    if task.status == TaskStatus.IN_PROGRESS and i == num - 1:
                        status = ProcessingStatus.PROCESSING

                    processing_result = None
                    file_size = 0
                    if fname in image_cache:
                        img_data, w, h = image_cache[fname]
                        file_size = len(img_data)
                        if status == ProcessingStatus.COMPLETED:
                            processing_result = {
                                "type": "image", "width": w, "height": h,
                                "format": "JPEG", "mode": "RGB",
                                "file_size_bytes": file_size,
                                "processed_at": "2026-04-03T12:00:00Z",
                            }
                        try:
                            _upload_to_minio(file_key, img_data, "image/jpeg")
                            uploaded += 1
                        except Exception as e:
                            print(f"    Warning: Upload failed for {fname}: {e}")

                    s = Submission(
                        id=uuid.uuid4(), task_id=task.id,
                        contributor_id=contributor.id,
                        file_key=file_key, file_name=fname,
                        file_size=file_size, content_type="image/jpeg",
                        processing_status=status,
                        processing_result=processing_result,
                        celery_task_id=str(uuid.uuid4()) if status == ProcessingStatus.COMPLETED else None,
                    )
                    submissions.append(s)

            elif task.task_type == TaskType.TEXT:
                # Use sample text files
                num = len(SAMPLE_TEXT_FILES) if task.status == TaskStatus.COMPLETED else min(2, len(SAMPLE_TEXT_FILES))
                for i in range(num):
                    fname, content = SAMPLE_TEXT_FILES[i]
                    file_key = f"submissions/{proj_folder}/{type_folder}/{fname}"
                    file_data = content.encode("utf-8")
                    file_size = len(file_data)
                    content_type = "text/csv" if fname.endswith(".csv") else "text/plain"
                    words = content.split()

                    status = ProcessingStatus.COMPLETED
                    if task.status == TaskStatus.IN_PROGRESS and i == num - 1:
                        status = ProcessingStatus.PROCESSING

                    processing_result = None
                    if status == ProcessingStatus.COMPLETED:
                        processing_result = {
                            "type": "text",
                            "character_count": len(content),
                            "word_count": len(words),
                            "line_count": content.count("\n") + 1,
                            "preview": content[:500],
                            "processed_at": "2026-04-03T12:00:00Z",
                        }

                    try:
                        _upload_to_minio(file_key, file_data, content_type)
                        uploaded += 1
                    except Exception as e:
                        print(f"    Warning: Upload failed for {fname}: {e}")

                    s = Submission(
                        id=uuid.uuid4(), task_id=task.id,
                        contributor_id=contributor.id,
                        file_key=file_key, file_name=fname,
                        file_size=file_size, content_type=content_type,
                        processing_status=status,
                        processing_result=processing_result,
                        celery_task_id=str(uuid.uuid4()) if status == ProcessingStatus.COMPLETED else None,
                    )
                    submissions.append(s)

            elif task.task_type == TaskType.AUDIO:
                # Generate real WAV audio files with different tones
                audio_specs = [
                    ("call_recording_001.wav", 3.0, 440.0),   # A4 note, 3 seconds
                    ("call_recording_002.wav", 2.5, 523.25),  # C5 note, 2.5 seconds
                    ("call_recording_003.wav", 4.0, 329.63),  # E4 note, 4 seconds
                ]
                num = len(audio_specs) if task.status == TaskStatus.COMPLETED else min(2, len(audio_specs))
                for i in range(num):
                    fname, duration, freq = audio_specs[i]
                    file_key = f"submissions/{proj_folder}/audio/{fname}"
                    status = ProcessingStatus.COMPLETED
                    if task.status == TaskStatus.IN_PROGRESS and i == num - 1:
                        status = ProcessingStatus.PROCESSING

                    audio_data = _generate_wav(duration, freq)
                    fsize = len(audio_data)

                    processing_result = None
                    if status == ProcessingStatus.COMPLETED:
                        processing_result = {
                            "type": "audio", "file_size_bytes": fsize,
                            "note": "Audio file received and stored",
                            "processed_at": "2026-04-03T12:00:00Z",
                        }

                    try:
                        _upload_to_minio(file_key, audio_data, "audio/wav")
                        uploaded += 1
                    except Exception as e:
                        print(f"    Warning: Upload failed for {fname}: {e}")

                    s = Submission(
                        id=uuid.uuid4(), task_id=task.id,
                        contributor_id=contributor.id,
                        file_key=file_key, file_name=fname,
                        file_size=fsize, content_type="audio/wav",
                        processing_status=status,
                        processing_result=processing_result,
                        celery_task_id=str(uuid.uuid4()) if status == ProcessingStatus.COMPLETED else None,
                    )
                    submissions.append(s)

        db.add_all(submissions)
        await db.commit()
        print(f"  Created {len(submissions)} submissions ({uploaded} files uploaded to MinIO)")
        print()
        print("Seed complete! Login credentials:")
        print(f"  Admin:       admin@annotateflow.dev / admin123")
        print(f"  Contributor: contributor1@annotateflow.dev / demo123")
        print(f"               (contributor1-5 all use demo123)")


async def reset():
    # Clean MinIO
    try:
        from app.shared.storage import delete_objects_by_prefix
        deleted = delete_objects_by_prefix("submissions/")
        print(f"Cleaned {deleted} files from MinIO.")
    except Exception:
        print("Warning: Could not clean MinIO.")

    # Clean DB
    async with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(text(f"TRUNCATE TABLE {table.name} CASCADE"))
    print("Database cleared.")
    await seed()


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--reset":
        asyncio.run(reset())
    else:
        asyncio.run(seed())
