"""
Seed script: populates the database with realistic demo data.
Run with: make seed
"""

import asyncio
import uuid

from sqlalchemy import text

import app.shared.models  # noqa: F401
from app.core.database import async_session, engine
from app.core.security import hash_password
from app.features.auth.models import User, UserRole
from app.features.projects.models import Project
from app.features.submissions.models import ProcessingStatus, Submission
from app.features.tasks.models import Task, TaskStatus, TaskType
from app.shared.base_model import Base


async def seed():
    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

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
            # Project 0: Image Classification
            (0, "Label product photos - Batch 1", "Tag each image with primary category", TaskType.IMAGE, TaskStatus.COMPLETED, 3),
            (0, "Label product photos - Batch 2", "Tag each image with primary category", TaskType.IMAGE, TaskStatus.IN_PROGRESS, 2),
            (0, "Verify edge cases", "Review images flagged by ML model as ambiguous", TaskType.IMAGE, TaskStatus.OPEN, 1),
            (0, "Extract text from product labels", "OCR validation for product packaging", TaskType.TEXT, TaskStatus.OPEN, 0),
            # Project 1: Audio
            (1, "Transcribe support calls - Week 1", "Convert audio recordings to text", TaskType.AUDIO, TaskStatus.COMPLETED, 2),
            (1, "Transcribe support calls - Week 2", "Convert audio recordings to text", TaskType.AUDIO, TaskStatus.IN_PROGRESS, 1),
            (1, "Sentiment labeling", "Tag each transcript with positive/negative/neutral", TaskType.TEXT, TaskStatus.OPEN, 0),
            # Project 2: Medical
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

        # ── Submissions (for completed/in-progress tasks) ──
        submissions = []
        sample_files = {
            TaskType.IMAGE: [
                ("product_001.jpg", "image/jpeg", 245_000),
                ("product_002.png", "image/png", 312_000),
                ("product_003.jpg", "image/jpeg", 198_000),
                ("product_004.jpg", "image/jpeg", 267_000),
                ("product_005.png", "image/png", 401_000),
            ],
            TaskType.AUDIO: [
                ("call_recording_001.mp3", "audio/mpeg", 2_400_000),
                ("call_recording_002.mp3", "audio/mpeg", 1_800_000),
                ("call_recording_003.wav", "audio/wav", 5_200_000),
            ],
            TaskType.TEXT: [
                ("transcript_001.txt", "text/plain", 4_500),
                ("transcript_002.txt", "text/plain", 6_200),
                ("report_data.csv", "text/csv", 12_800),
            ],
        }
        sample_results = {
            TaskType.IMAGE: lambda f: {
                "type": "image", "width": 1920, "height": 1080,
                "format": "JPEG" if f.endswith(".jpg") else "PNG",
                "mode": "RGB", "file_size_bytes": 245000,
                "processed_at": "2026-04-03T12:00:00Z",
            },
            TaskType.AUDIO: lambda f: {
                "type": "audio", "file_size_bytes": 2400000,
                "note": "Audio file received and stored",
                "processed_at": "2026-04-03T12:00:00Z",
            },
            TaskType.TEXT: lambda f: {
                "type": "text", "character_count": 4500,
                "word_count": 820, "line_count": 45,
                "preview": "Patient presented with symptoms of...",
                "processed_at": "2026-04-03T12:00:00Z",
            },
        }

        for task in tasks:
            if task.status in (TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS):
                files = sample_files[task.task_type]
                num = len(files) if task.status == TaskStatus.COMPLETED else min(2, len(files))
                contributor = contributors[hash(str(task.id)) % len(contributors)]
                for i in range(num):
                    fname, ctype, fsize = files[i]
                    status = ProcessingStatus.COMPLETED
                    if task.status == TaskStatus.IN_PROGRESS and i == num - 1:
                        status = ProcessingStatus.PROCESSING

                    slug = task.title.lower().replace(" ", "_").replace("-", "")[:20]
                    s = Submission(
                        id=uuid.uuid4(), task_id=task.id,
                        contributor_id=contributor.id,
                        file_key=f"submissions/demo/{slug}/{fname}",
                        file_name=fname, file_size=fsize,
                        content_type=ctype,
                        processing_status=status,
                        processing_result=sample_results[task.task_type](fname) if status == ProcessingStatus.COMPLETED else None,
                        celery_task_id=str(uuid.uuid4()) if status != ProcessingStatus.PROCESSING else None,
                    )
                    submissions.append(s)

        db.add_all(submissions)
        await db.commit()
        print(f"  Created {len(submissions)} submissions")
        print()
        print("Seed complete! Login credentials:")
        print(f"  Admin:       admin@annotateflow.dev / admin123")
        print(f"  Contributor: contributor1@annotateflow.dev / demo123")
        print(f"               (contributor1-5 all use demo123)")


async def reset():
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
