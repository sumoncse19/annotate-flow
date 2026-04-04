import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_project(auth_client: tuple[AsyncClient, str]):
    client, _ = auth_client
    resp = await client.post("/api/projects/", json={
        "name": "Test Project", "description": "A test project",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Test Project"
    assert data["task_count"] == 0


@pytest.mark.asyncio
async def test_list_projects(auth_client: tuple[AsyncClient, str]):
    client, _ = auth_client
    await client.post("/api/projects/", json={"name": "P1"})
    await client.post("/api/projects/", json={"name": "P2"})
    resp = await client.get("/api/projects/")
    assert resp.status_code == 200
    assert resp.json()["total"] == 2
    assert len(resp.json()["items"]) == 2


@pytest.mark.asyncio
async def test_get_project(auth_client: tuple[AsyncClient, str]):
    client, _ = auth_client
    create = await client.post("/api/projects/", json={"name": "GetMe"})
    pid = create.json()["id"]
    resp = await client.get(f"/api/projects/{pid}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "GetMe"


@pytest.mark.asyncio
async def test_delete_project(auth_client: tuple[AsyncClient, str]):
    client, _ = auth_client
    create = await client.post("/api/projects/", json={"name": "DeleteMe"})
    pid = create.json()["id"]
    resp = await client.delete(f"/api/projects/{pid}")
    assert resp.status_code == 204
    resp = await client.get(f"/api/projects/{pid}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_project_requires_auth(client: AsyncClient):
    resp = await client.get("/api/projects/")
    assert resp.status_code == 401
