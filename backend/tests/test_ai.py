import pytest
from unittest.mock import patch
from httpx import AsyncClient


async def _setup_project_task_submission(client: AsyncClient) -> tuple[str, str, str]:
    """Create a project, task, and submission for testing."""
    proj = await client.post("/api/projects/", json={"name": "AI Test"})
    pid = proj.json()["id"]
    task = await client.post(f"/api/projects/{pid}/tasks/", json={
        "title": "Test task", "task_type": "image",
    })
    tid = task.json()["id"]
    sub = await client.post(f"/api/tasks/{tid}/submissions/", json={
        "file_name": "test.png", "file_size": 1024, "content_type": "image/png",
    })
    sid = sub.json()["submission_id"]
    return pid, tid, sid


@pytest.mark.asyncio
async def test_analyze_requires_completed_submission(auth_client: tuple[AsyncClient, str]):
    """Analyze should reject submissions that haven't been processed."""
    client, _ = auth_client
    _, tid, sid = await _setup_project_task_submission(client)
    resp = await client.post(f"/api/tasks/{tid}/submissions/{sid}/analyze")
    assert resp.status_code == 404
    assert "processed" in resp.json()["message"].lower()


@pytest.mark.asyncio
async def test_analyze_success_with_mock(auth_client: tuple[AsyncClient, str]):
    """Analyze should return AI analysis for a completed submission."""
    client, _ = auth_client
    _, tid, sid = await _setup_project_task_submission(client)

    # Manually mark submission as completed with processing result
    from tests.conftest import TestSessionLocal
    from app.features.submissions.models import ProcessingStatus, Submission
    import app.shared.models  # noqa: F401

    async with TestSessionLocal() as db:
        from sqlalchemy import select
        result = await db.execute(select(Submission).where(Submission.id == sid))
        sub = result.scalar_one()
        sub.processing_status = ProcessingStatus.COMPLETED
        sub.processing_result = {
            "type": "image", "width": 1920, "height": 1080,
            "format": "PNG", "mode": "RGB", "file_size_bytes": 1024,
        }
        await db.commit()

    mock_analysis = {
        "summary": "Test image analysis",
        "sentiment": "neutral",
        "tags": ["image", "test"],
        "quality_score": 7,
        "recommendations": "Good quality image.",
        "provider": "groq",
    }

    with patch("app.features.submissions.ai_service.analyze_submission", return_value=mock_analysis):
        resp = await client.post(f"/api/tasks/{tid}/submissions/{sid}/analyze")
        assert resp.status_code == 200
        data = resp.json()
        assert data["sentiment"] == "neutral"
        assert data["quality_score"] == 7
        assert "tags" in data


@pytest.mark.asyncio
async def test_analyze_caches_result(auth_client: tuple[AsyncClient, str]):
    """Second analyze call should return cached result without hitting AI."""
    client, _ = auth_client
    _, tid, sid = await _setup_project_task_submission(client)

    # Set up completed submission with cached analysis
    from tests.conftest import TestSessionLocal
    from app.features.submissions.models import ProcessingStatus, Submission
    import app.shared.models  # noqa: F401

    cached = {
        "summary": "Cached result",
        "sentiment": "positive",
        "tags": ["cached"],
        "quality_score": 9,
        "recommendations": "Already analyzed.",
        "provider": "groq",
    }

    async with TestSessionLocal() as db:
        from sqlalchemy import select
        result = await db.execute(select(Submission).where(Submission.id == sid))
        sub = result.scalar_one()
        sub.processing_status = ProcessingStatus.COMPLETED
        sub.processing_result = {
            "type": "image", "width": 100, "height": 100,
            "ai_analysis": cached,
        }
        await db.commit()

    # Should return cached without calling Groq
    resp = await client.post(f"/api/tasks/{tid}/submissions/{sid}/analyze")
    assert resp.status_code == 200
    data = resp.json()
    assert data["summary"] == "Cached result"
    assert data["sentiment"] == "positive"
