"""Tests for /api/v1/change-requests endpoints."""
import pytest
from app.dependencies import get_current_user
from app.main import app
from app.models.change_request import CRStatus, Priority
from app.models.user import UserRole
from tests.factories import make_cr, make_user


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
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
async def test_list_change_requests_returns_200(client, db_session):
    dm, _, _ = await _create_users(db_session)
    auth_as(dm)
    r = await client.get("/api/v1/change-requests/")
    assert r.status_code == 200
    assert "items" in r.json()


@pytest.mark.asyncio
async def test_list_high_priority_first(client, db_session):
    dm, _, _ = await _create_users(db_session)
    make_cr(db_session, dm.id, dm.id, priority=Priority.low)
    make_cr(db_session, dm.id, dm.id, priority=Priority.high)
    make_cr(db_session, dm.id, dm.id, priority=Priority.medium)
    await db_session.commit()
    auth_as(dm)

    r = await client.get("/api/v1/change-requests/")
    items = r.json()["items"]
    priorities = [i["priority"] for i in items]
    high_idx = priorities.index("high")
    medium_idx = priorities.index("medium")
    low_idx = priorities.index("low")
    assert high_idx < medium_idx < low_idx


@pytest.mark.asyncio
async def test_list_filter_by_status(client, db_session):
    dm, _, _ = await _create_users(db_session)
    make_cr(db_session, dm.id, dm.id, status=CRStatus.blocked)
    make_cr(db_session, dm.id, dm.id, status=CRStatus.new)
    await db_session.commit()
    auth_as(dm)

    r = await client.get("/api/v1/change-requests/", params={"status": "blocked"})
    items = r.json()["items"]
    assert all(i["status"] == "blocked" for i in items)


# ──────────────────────────── CREATE ────────────────────────────

@pytest.mark.asyncio
async def test_create_cr_as_delivery_manager(client, db_session):
    dm, _, _ = await _create_users(db_session)
    auth_as(dm)

    payload = {
        "cr_number": "CR-TEST-001",
        "venue_name": "Test Venue",
        "product": "Test Product",
        "request_title": "New Feature Request",
        "requested_by": "John Doe",
        "assigned_to_id": dm.id,
        "source": "venue_request",
        "priority": "high",
        "status": "new",
    }
    r = await client.post("/api/v1/change-requests/", json=payload)
    assert r.status_code == 201
    assert r.json()["cr_number"] == "CR-TEST-001"
    assert r.json()["priority"] == "high"


@pytest.mark.asyncio
async def test_create_cr_as_product_manager_forbidden(client, db_session):
    dm, pm, _ = await _create_users(db_session)
    auth_as(pm)

    payload = {
        "cr_number": "CR-PM-001",
        "venue_name": "Venue",
        "product": "Product",
        "request_title": "Title",
        "requested_by": "PM",
        "assigned_to_id": dm.id,
        "source": "venue_request",
        "priority": "medium",
        "status": "new",
    }
    r = await client.post("/api/v1/change-requests/", json=payload)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_create_cr_duplicate_number_returns_409(client, db_session):
    dm, _, _ = await _create_users(db_session)
    make_cr(db_session, dm.id, dm.id, cr_number="CR-DUPE")
    await db_session.commit()
    auth_as(dm)

    payload = {
        "cr_number": "CR-DUPE",
        "venue_name": "V",
        "product": "P",
        "request_title": "T",
        "requested_by": "R",
        "assigned_to_id": dm.id,
        "source": "venue_request",
        "priority": "low",
        "status": "new",
    }
    r = await client.post("/api/v1/change-requests/", json=payload)
    assert r.status_code == 409


# ──────────────────────────── GET ────────────────────────────

@pytest.mark.asyncio
async def test_get_cr_detail(client, db_session):
    dm, _, _ = await _create_users(db_session)
    cr = make_cr(db_session, dm.id, dm.id)
    await db_session.commit()
    await db_session.refresh(cr)
    auth_as(dm)

    r = await client.get(f"/api/v1/change-requests/{cr.id}")
    assert r.status_code == 200
    assert r.json()["id"] == cr.id


@pytest.mark.asyncio
async def test_get_cr_not_found(client, db_session):
    dm, _, _ = await _create_users(db_session)
    auth_as(dm)
    r = await client.get("/api/v1/change-requests/999999")
    assert r.status_code == 404


# ──────────────────────────── UPDATE ────────────────────────────

@pytest.mark.asyncio
async def test_update_cr(client, db_session):
    dm, _, _ = await _create_users(db_session)
    cr = make_cr(db_session, dm.id, dm.id)
    await db_session.commit()
    await db_session.refresh(cr)
    auth_as(dm)

    r = await client.put(f"/api/v1/change-requests/{cr.id}", json={"request_title": "Updated Title"})
    assert r.status_code == 200
    assert r.json()["request_title"] == "Updated Title"


@pytest.mark.asyncio
async def test_update_cr_status(client, db_session):
    dm, _, _ = await _create_users(db_session)
    cr = make_cr(db_session, dm.id, dm.id, status=CRStatus.new)
    await db_session.commit()
    await db_session.refresh(cr)
    auth_as(dm)

    r = await client.patch(
        f"/api/v1/change-requests/{cr.id}/status",
        json={"status": "analysis"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "analysis"


# ──────────────────────────── DELETE ────────────────────────────

@pytest.mark.asyncio
async def test_delete_cr_as_admin(client, db_session):
    dm, _, admin = await _create_users(db_session)
    cr = make_cr(db_session, dm.id, dm.id)
    await db_session.commit()
    await db_session.refresh(cr)
    auth_as(admin)

    r = await client.delete(f"/api/v1/change-requests/{cr.id}")
    assert r.status_code == 204


@pytest.mark.asyncio
async def test_delete_cr_as_delivery_manager_forbidden(client, db_session):
    dm, _, _ = await _create_users(db_session)
    cr = make_cr(db_session, dm.id, dm.id)
    await db_session.commit()
    await db_session.refresh(cr)
    auth_as(dm)

    r = await client.delete(f"/api/v1/change-requests/{cr.id}")
    assert r.status_code == 403


# ──────────────────────────── COMMENTS ────────────────────────────

@pytest.mark.asyncio
async def test_add_cr_comment(client, db_session):
    dm, _, _ = await _create_users(db_session)
    cr = make_cr(db_session, dm.id, dm.id)
    await db_session.commit()
    await db_session.refresh(cr)
    auth_as(dm)

    r = await client.post(
        f"/api/v1/change-requests/{cr.id}/comments",
        json={"body": "CR comment body"},
    )
    assert r.status_code == 201
    assert r.json()["body"] == "CR comment body"


@pytest.mark.asyncio
async def test_list_cr_comments(client, db_session):
    dm, _, _ = await _create_users(db_session)
    cr = make_cr(db_session, dm.id, dm.id)
    await db_session.commit()
    await db_session.refresh(cr)
    auth_as(dm)

    await client.post(f"/api/v1/change-requests/{cr.id}/comments", json={"body": "First"})
    r = await client.get(f"/api/v1/change-requests/{cr.id}/comments")
    assert r.status_code == 200
    assert len(r.json()) >= 1
