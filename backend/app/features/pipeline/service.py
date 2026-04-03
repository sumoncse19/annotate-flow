from sqlalchemy import case, cast, func, select, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import User
from app.features.projects.models import Project
from app.features.submissions.models import ProcessingStatus, Submission
from app.features.tasks.models import Task, TaskStatus


async def get_pipeline_status(db: AsyncSession) -> dict:
    query = select(
        Submission.processing_status, func.count(Submission.id)
    ).group_by(Submission.processing_status)
    result = await db.execute(query)
    counts = {row[0].value: row[1] for row in result.all()}
    return {
        "pending": counts.get("pending", 0),
        "processing": counts.get("processing", 0),
        "completed": counts.get("completed", 0),
        "failed": counts.get("failed", 0),
        "total": sum(counts.values()),
    }


async def get_recent_jobs(db: AsyncSession, limit: int) -> list[dict]:
    query = (
        select(Submission)
        .order_by(Submission.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    return [
        {
            "id": str(s.id),
            "file_name": s.file_name,
            "content_type": s.content_type,
            "processing_status": s.processing_status.value,
            "processing_result": s.processing_result,
            "celery_task_id": s.celery_task_id,
            "created_at": s.created_at.isoformat(),
        }
        for s in result.scalars().all()
    ]


async def get_analytics(db: AsyncSession) -> dict:
    """Aggregated analytics across all projects, tasks, and submissions."""

    # Project stats
    project_count = await db.execute(select(func.count(Project.id)))

    # Task stats by status
    task_stats_q = select(
        Task.status, func.count(Task.id)
    ).group_by(Task.status)
    task_stats = await db.execute(task_stats_q)
    task_by_status = {row[0].value: row[1] for row in task_stats.all()}

    # Task stats by type
    task_type_q = select(
        cast(Task.task_type, String), func.count(Task.id)
    ).group_by(Task.task_type)
    task_type_result = await db.execute(task_type_q)
    task_by_type = {row[0]: row[1] for row in task_type_result.all()}

    # Submission stats
    sub_stats_q = select(
        Submission.processing_status, func.count(Submission.id)
    ).group_by(Submission.processing_status)
    sub_stats = await db.execute(sub_stats_q)
    sub_by_status = {row[0].value: row[1] for row in sub_stats.all()}

    # Top contributors (by completed submissions)
    top_contributors_q = (
        select(
            User.full_name,
            User.email,
            func.count(Submission.id).label("total"),
            func.count(
                case((Submission.processing_status == ProcessingStatus.COMPLETED, 1))
            ).label("completed"),
        )
        .join(Submission, Submission.contributor_id == User.id)
        .group_by(User.id)
        .order_by(func.count(Submission.id).desc())
        .limit(10)
    )
    top_result = await db.execute(top_contributors_q)
    contributors = [
        {
            "name": row.full_name,
            "email": row.email,
            "total_submissions": row.total,
            "completed_submissions": row.completed,
        }
        for row in top_result.all()
    ]

    # Per-project summary
    project_summary_q = (
        select(
            Project.name,
            func.count(func.distinct(Task.id)).label("task_count"),
            func.count(Submission.id).label("submission_count"),
            func.count(
                case((Task.status == TaskStatus.COMPLETED, Task.id))
            ).label("completed_tasks"),
        )
        .outerjoin(Task, Task.project_id == Project.id)
        .outerjoin(Submission, Submission.task_id == Task.id)
        .group_by(Project.id)
        .order_by(Project.created_at.desc())
    )
    proj_result = await db.execute(project_summary_q)
    project_summaries = [
        {
            "name": row.name,
            "task_count": row.task_count,
            "submission_count": row.submission_count,
            "completed_tasks": row.completed_tasks,
            "completion_rate": round(row.completed_tasks / max(row.task_count, 1) * 100),
        }
        for row in proj_result.all()
    ]

    total_tasks = sum(task_by_status.values())
    total_subs = sum(sub_by_status.values())

    return {
        "overview": {
            "projects": project_count.scalar() or 0,
            "tasks": total_tasks,
            "submissions": total_subs,
            "completion_rate": round(
                task_by_status.get("completed", 0) / max(total_tasks, 1) * 100
            ),
        },
        "tasks_by_status": task_by_status,
        "tasks_by_type": task_by_type,
        "submissions_by_status": sub_by_status,
        "top_contributors": contributors,
        "projects": project_summaries,
    }
