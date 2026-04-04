import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_pipeline_status(auth_client: tuple[AsyncClient, str]):
    client, _ = auth_client
    resp = await client.get("/api/pipeline/status")
    assert resp.status_code == 200
    data = resp.json()
    for key in ("pending", "processing", "completed", "failed", "total"):
        assert key in data


@pytest.mark.asyncio
async def test_pipeline_recent(auth_client: tuple[AsyncClient, str]):
    client, _ = auth_client
    resp = await client.get("/api/pipeline/recent")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_pipeline_analytics(auth_client: tuple[AsyncClient, str]):
    client, _ = auth_client
    resp = await client.get("/api/pipeline/analytics")
    assert resp.status_code == 200
    data = resp.json()
    assert "overview" in data
    assert "top_contributors" in data
    assert "projects" in data


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["service"] == "annotateflow"
    assert data["status"] in ("healthy", "degraded")
    assert "dependencies" in data
