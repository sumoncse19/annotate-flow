import pytest
from httpx import AsyncClient


async def _create_project(client: AsyncClient) -> str:
    resp = await client.post("/api/projects/", json={"name": "Task Project"})
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_create_task(auth_client: tuple[AsyncClient, str]):
    client, _ = auth_client
    pid = await _create_project(client)
    resp = await client.post(f"/api/projects/{pid}/tasks/", json={
        "title": "Label images", "task_type": "image",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Label images"
    assert data["task_type"] == "image"
    assert data["status"] == "open"
    assert data["submission_count"] == 0


@pytest.mark.asyncio
async def test_list_tasks(auth_client: tuple[AsyncClient, str]):
    client, _ = auth_client
    pid = await _create_project(client)
    await client.post(f"/api/projects/{pid}/tasks/", json={"title": "T1", "task_type": "image"})
    await client.post(f"/api/projects/{pid}/tasks/", json={"title": "T2", "task_type": "audio"})
    resp = await client.get(f"/api/projects/{pid}/tasks/")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_update_task_status(auth_client: tuple[AsyncClient, str]):
    client, _ = auth_client
    pid = await _create_project(client)
    create = await client.post(f"/api/projects/{pid}/tasks/", json={
        "title": "Update me", "task_type": "text",
    })
    tid = create.json()["id"]
    resp = await client.patch(f"/api/projects/{pid}/tasks/{tid}", json={
        "status": "in_progress",
    })
    assert resp.status_code == 200
    assert resp.json()["status"] == "in_progress"


@pytest.mark.asyncio
async def test_update_task_type_when_no_submissions(auth_client: tuple[AsyncClient, str]):
    client, _ = auth_client
    pid = await _create_project(client)
    create = await client.post(f"/api/projects/{pid}/tasks/", json={
        "title": "Change type", "task_type": "image",
    })
    tid = create.json()["id"]
    resp = await client.patch(f"/api/projects/{pid}/tasks/{tid}", json={
        "task_type": "audio",
    })
    assert resp.status_code == 200
    assert resp.json()["task_type"] == "audio"


@pytest.mark.asyncio
async def test_delete_task(auth_client: tuple[AsyncClient, str]):
    client, _ = auth_client
    pid = await _create_project(client)
    create = await client.post(f"/api/projects/{pid}/tasks/", json={
        "title": "Delete me", "task_type": "image",
    })
    tid = create.json()["id"]
    resp = await client.delete(f"/api/projects/{pid}/tasks/{tid}")
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_create_task_invalid_project(auth_client: tuple[AsyncClient, str]):
    client, _ = auth_client
    resp = await client.post(
        "/api/projects/00000000-0000-0000-0000-000000000000/tasks/",
        json={"title": "Orphan", "task_type": "image"},
    )
    assert resp.status_code == 404
