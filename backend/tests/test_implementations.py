"""Tests for /api/v1/implementations endpoints."""
import pytest
from app.dependencies import get_current_user
from app.main import app
from app.models.user import UserRole
from app.models.venue_implementation import ImplementationStatus
from tests.factories import make_implementation, make_user


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    # ensure auth override is cleaned up even if test fails
    app.dependency_overrides.pop(get_current_user, None)


async def _create_users(db_session):
    dm = make_user(db_session, role=UserRole.delivery_manager)
    pm = make_user(db_session, role=UserRole.product_manager)
    admin = make_user(db_session, role=UserRole.admin)
    await db_session.commit()
    await db_session.refresh(dm)
    await db_session.refresh(pm)
    await db_session.refresh(admin)
    return dm, pm, admin


def auth_as(user):
    app.dependency_overrides[get_current_user] = lambda: user


# ──────────────────────────── LIST ────────────────────────────

@pytest.mark.asyncio
async def test_list_implementations_returns_200(client, db_session):
    dm, _, _ = await _create_users(db_session)
    auth_as(dm)
    r = await client.get("/api/v1/implementations/")
    assert r.status_code == 200
    body = r.json()
    assert "items" in body
    assert "total" in body


@pytest.mark.asyncio
async def test_list_implementations_filter_by_status(client, db_session):
    dm, _, _ = await _create_users(db_session)
    make_implementation(db_session, dm.id, dm.id, status=ImplementationStatus.blocked)
    make_implementation(db_session, dm.id, dm.id, status=ImplementationStatus.in_progress)
    await db_session.commit()
    auth_as(dm)

    r = await client.get("/api/v1/implementations/", params={"status": "blocked"})
    assert r.status_code == 200
    items = r.json()["items"]
    assert all(i["status"] == "blocked" for i in items)


# ──────────────────────────── CREATE ────────────────────────────

@pytest.mark.asyncio
async def test_create_implementation_as_delivery_manager(client, db_session):
    dm, _, _ = await _create_users(db_session)
    auth_as(dm)

    payload = {
        "iwo_number": "IWO-TEST-001",
        "venue_name": "Test Golf Club",
        "product_name": "POS System",
        "assigned_to_id": dm.id,
        "start_date": "2026-01-01",
        "target_date": "2026-06-01",
        "status": "not_started",
    }
    r = await client.post("/api/v1/implementations/", json=payload)
    assert r.status_code == 201
    body = r.json()
    assert body["iwo_number"] == "IWO-TEST-001"
    assert body["venue_name"] == "Test Golf Club"


@pytest.mark.asyncio
async def test_create_implementation_as_product_manager_forbidden(client, db_session):
    _, pm, _ = await _create_users(db_session)
    auth_as(pm)

    payload = {
        "iwo_number": "IWO-TEST-002",
        "venue_name": "Venue",
        "product_name": "POS",
        "assigned_to_id": pm.id,
        "start_date": "2026-01-01",
        "target_date": "2026-06-01",
        "status": "not_started",
    }
    r = await client.post("/api/v1/implementations/", json=payload)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_create_implementation_duplicate_iwo_returns_409(client, db_session):
    dm, _, _ = await _create_users(db_session)
    make_implementation(db_session, dm.id, dm.id, iwo_number="IWO-DUPE")
    await db_session.commit()
    auth_as(dm)

    payload = {
        "iwo_number": "IWO-DUPE",
        "venue_name": "Venue",
        "product_name": "POS",
        "assigned_to_id": dm.id,
        "start_date": "2026-01-01",
        "target_date": "2026-06-01",
        "status": "not_started",
    }
    r = await client.post("/api/v1/implementations/", json=payload)
    assert r.status_code == 409


# ──────────────────────────── GET ────────────────────────────

@pytest.mark.asyncio
async def test_get_implementation_detail(client, db_session):
    dm, _, _ = await _create_users(db_session)
    item = make_implementation(db_session, dm.id, dm.id)
    await db_session.commit()
    await db_session.refresh(item)
    auth_as(dm)

    r = await client.get(f"/api/v1/implementations/{item.id}")
    assert r.status_code == 200
    assert r.json()["id"] == item.id
    assert r.json()["iwo_number"] == item.iwo_number


@pytest.mark.asyncio
async def test_get_implementation_not_found(client, db_session):
    dm, _, _ = await _create_users(db_session)
    auth_as(dm)
    r = await client.get("/api/v1/implementations/999999")
    assert r.status_code == 404


# ──────────────────────────── UPDATE ────────────────────────────

@pytest.mark.asyncio
async def test_update_implementation(client, db_session):
    dm, _, _ = await _create_users(db_session)
    item = make_implementation(db_session, dm.id, dm.id)
    await db_session.commit()
    await db_session.refresh(item)
    auth_as(dm)

    r = await client.put(f"/api/v1/implementations/{item.id}", json={"venue_name": "Updated Venue"})
    assert r.status_code == 200
    assert r.json()["venue_name"] == "Updated Venue"


@pytest.mark.asyncio
async def test_update_status(client, db_session):
    dm, _, _ = await _create_users(db_session)
    item = make_implementation(db_session, dm.id, dm.id, status=ImplementationStatus.not_started)
    await db_session.commit()
    await db_session.refresh(item)
    auth_as(dm)

    r = await client.patch(
        f"/api/v1/implementations/{item.id}/status",
        json={"status": "in_progress"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "in_progress"


# ──────────────────────────── DELETE ────────────────────────────

@pytest.mark.asyncio
async def test_delete_as_admin_returns_204(client, db_session):
    dm, _, admin = await _create_users(db_session)
    item = make_implementation(db_session, dm.id, dm.id)
    await db_session.commit()
    await db_session.refresh(item)
    auth_as(admin)

    r = await client.delete(f"/api/v1/implementations/{item.id}")
    assert r.status_code == 204


@pytest.mark.asyncio
async def test_delete_as_delivery_manager_forbidden(client, db_session):
    dm, _, _ = await _create_users(db_session)
    item = make_implementation(db_session, dm.id, dm.id)
    await db_session.commit()
    await db_session.refresh(item)
    auth_as(dm)

    r = await client.delete(f"/api/v1/implementations/{item.id}")
    assert r.status_code == 403


# ──────────────────────────── COMMENTS ────────────────────────────

@pytest.mark.asyncio
async def test_add_comment_returns_201(client, db_session):
    dm, _, _ = await _create_users(db_session)
    item = make_implementation(db_session, dm.id, dm.id)
    await db_session.commit()
    await db_session.refresh(item)
    auth_as(dm)

    r = await client.post(
        f"/api/v1/implementations/{item.id}/comments",
        json={"body": "This is a test comment"},
    )
    assert r.status_code == 201
    assert r.json()["body"] == "This is a test comment"


@pytest.mark.asyncio
async def test_add_comment_as_product_manager_forbidden(client, db_session):
    dm, pm, _ = await _create_users(db_session)
    item = make_implementation(db_session, dm.id, dm.id)
    await db_session.commit()
    await db_session.refresh(item)
    auth_as(pm)

    r = await client.post(
        f"/api/v1/implementations/{item.id}/comments",
        json={"body": "PM should not comment"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_list_comments(client, db_session):
    dm, _, _ = await _create_users(db_session)
    item = make_implementation(db_session, dm.id, dm.id)
    await db_session.commit()
    await db_session.refresh(item)
    auth_as(dm)

    await client.post(
        f"/api/v1/implementations/{item.id}/comments",
        json={"body": "First comment"},
    )
    r = await client.get(f"/api/v1/implementations/{item.id}/comments")
    assert r.status_code == 200
    assert len(r.json()) >= 1
