"""
Scale seed: generates 1000+ submissions for realistic EXPLAIN ANALYZE output.
Run after: make seed
Usage: cd backend && venv/bin/python -m scripts.seed_scale
"""

import asyncio
import random
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

NAMES = [
    "Aisha Khan", "Chen Wei", "Dmitri Volkov", "Eva Johansson", "Felix Nguyen",
    "Grace Okafor", "Hiroshi Sato", "Ingrid Berg", "Jamal Brown", "Katya Petrov",
    "Liam Murphy", "Maria Garcia", "Nikos Papadopoulos", "Olivia Santos", "Piotr Kowalski",
    "Riya Patel", "Samuel Lee", "Tanya Ivanova", "Umar Hassan", "Victoria Reed",
]

PROJECT_NAMES = [
    "E-Commerce Product Labels", "Autonomous Vehicle Training", "Medical Image Segmentation",
    "Voice Command Recognition", "Document OCR Pipeline", "Satellite Image Analysis",
    "Social Media Sentiment", "Legal Contract Review", "Wildlife Camera Traps",
    "Manufacturing QA Inspection",
]

TASK_TITLES = {
    TaskType.IMAGE: [
        "Classify objects in frame", "Label bounding boxes", "Segment foreground",
        "Verify auto-labels", "Flag low quality images", "Tag color attributes",
    ],
    TaskType.AUDIO: [
        "Transcribe speech", "Label speaker segments", "Classify ambient sounds",
        "Verify auto-transcription", "Tag language dialect",
    ],
    TaskType.TEXT: [
        "Extract named entities", "Classify sentiment", "Summarize paragraphs",
        "Label PII fields", "Verify auto-classification",
    ],
}

IMAGE_FNAMES = [f"img_{i:04d}.jpg" for i in range(200)]
AUDIO_FNAMES = [f"audio_{i:03d}.wav" for i in range(100)]
TEXT_FNAMES = [f"doc_{i:03d}.txt" for i in range(100)]


async def seed_scale():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        # Check if already scaled
        result = await db.execute(text("SELECT count(*) FROM submissions"))
        count = result.scalar()
        if count and count > 500:
            print(f"Already have {count} submissions. Skipping scale seed.")
            return

        print("Generating scale data...")

        # Create 20 contributors
        contributors = []
        for i, name in enumerate(NAMES):
            u = User(
                id=uuid.uuid4(),
                email=f"scale-{i}@annotateflow.dev",
                hashed_password=hash_password("scale123"),
                full_name=name,
                role=UserRole.CONTRIBUTOR,
            )
            contributors.append(u)
        db.add_all(contributors)
        await db.flush()
        print(f"  Created {len(contributors)} contributors")

        # Create admin for projects
        admin = User(
            id=uuid.uuid4(), email="scale-admin@annotateflow.dev",
            hashed_password=hash_password("admin123"),
            full_name="Scale Admin", role=UserRole.ADMIN,
        )
        db.add(admin)
        await db.flush()

        # Create 10 projects
        projects = []
        for name in PROJECT_NAMES:
            p = Project(id=uuid.uuid4(), name=name, description=f"Large-scale {name.lower()} annotation project", owner_id=admin.id)
            projects.append(p)
        db.add_all(projects)
        await db.flush()
        print(f"  Created {len(projects)} projects")

        # Create ~50 tasks across projects
        tasks = []
        for project in projects:
            task_type = random.choice(list(TaskType))
            num_tasks = random.randint(3, 7)
            for j in range(num_tasks):
                tt = random.choice(list(TaskType))
                titles = TASK_TITLES[tt]
                t = Task(
                    id=uuid.uuid4(),
                    title=f"{random.choice(titles)} - Batch {j + 1}",
                    description=f"Process batch {j + 1} of {tt.value} data",
                    task_type=tt,
                    status=random.choice(list(TaskStatus)),
                    priority=random.randint(0, 3),
                    project_id=project.id,
                )
                tasks.append(t)
        db.add_all(tasks)
        await db.flush()
        print(f"  Created {len(tasks)} tasks")

        # Create 1200+ submissions
        submissions = []
        statuses = [ProcessingStatus.COMPLETED] * 8 + [ProcessingStatus.PROCESSING] + [ProcessingStatus.PENDING] + [ProcessingStatus.FAILED]

        for task in tasks:
            num_subs = random.randint(10, 40)
            for k in range(num_subs):
                contributor = random.choice(contributors)
                status = random.choice(statuses)

                if task.task_type == TaskType.IMAGE:
                    fname = random.choice(IMAGE_FNAMES)
                    ctype = "image/jpeg"
                    fsize = random.randint(50_000, 800_000)
                    result = {
                        "type": "image",
                        "width": random.choice([640, 800, 1024, 1920, 3840]),
                        "height": random.choice([480, 600, 768, 1080, 2160]),
                        "format": "JPEG", "mode": "RGB",
                        "file_size_bytes": fsize,
                    } if status == ProcessingStatus.COMPLETED else None
                elif task.task_type == TaskType.AUDIO:
                    fname = random.choice(AUDIO_FNAMES)
                    ctype = "audio/wav"
                    fsize = random.randint(500_000, 10_000_000)
                    result = {
                        "type": "audio",
                        "file_size_bytes": fsize,
                        "note": "Audio file received and stored",
                    } if status == ProcessingStatus.COMPLETED else None
                else:
                    fname = random.choice(TEXT_FNAMES)
                    ctype = "text/plain"
                    fsize = random.randint(1_000, 50_000)
                    wc = random.randint(100, 5000)
                    result = {
                        "type": "text",
                        "character_count": fsize,
                        "word_count": wc,
                        "line_count": wc // 10,
                        "preview": "Sample text content for annotation...",
                    } if status == ProcessingStatus.COMPLETED else None

                s = Submission(
                    id=uuid.uuid4(), task_id=task.id,
                    contributor_id=contributor.id,
                    file_key=f"submissions/scale/{task.id}/{fname}",
                    file_name=fname, file_size=fsize,
                    content_type=ctype,
                    processing_status=status,
                    processing_result=result,
                    celery_task_id=str(uuid.uuid4()) if status == ProcessingStatus.COMPLETED else None,
                )
                submissions.append(s)

        db.add_all(submissions)
        await db.commit()
        print(f"  Created {len(submissions)} submissions")
        print(f"\nScale seed complete! Total: {len(contributors)} contributors, {len(projects)} projects, {len(tasks)} tasks, {len(submissions)} submissions")


if __name__ == "__main__":
    asyncio.run(seed_scale())
