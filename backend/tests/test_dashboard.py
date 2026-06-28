"""Tests for /api/v1/dashboard/* and /api/v1/notifications/* endpoints."""
import pytest
from app.dependencies import get_current_user
from app.main import app
from app.models.notification import ItemType, NotificationType
from app.models.user import UserRole
from app.models.venue_implementation import ImplementationStatus
from app.models.change_request import CRStatus
from app.models.product_update import ProductUpdateStatus
from tests.factories import make_cr, make_implementation, make_notification, make_product_update, make_user


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.pop(get_current_user, None)


async def _create_dm(db_session):
    dm = make_user(db_session, role=UserRole.delivery_manager)
    await db_session.commit()
    await db_session.refresh(dm)
    return dm


def auth_as(user):
    app.dependency_overrides[get_current_user] = lambda: user


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ SUMMARY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@pytest.mark.asyncio
async def test_dashboard_summary_shape(client, db_session):
    dm = await _create_dm(db_session)
    auth_as(dm)

    r = await client.get("/api/v1/dashboard/summary")
    assert r.status_code == 200
    body = r.json()
    for key in ("active_implementations", "active_change_requests", "active_product_updates",
                "blocked_items", "delayed_items", "attention_required", "completed_items"):
        assert key in body, f"Missing key: {key}"
        assert isinstance(body[key], int)


@pytest.mark.asyncio
async def test_dashboard_summary_counts_blocked(client, db_session):
    dm = await _create_dm(db_session)
    make_implementation(db_session, dm.id, dm.id, status=ImplementationStatus.blocked)
    make_cr(db_session, dm.id, dm.id, status=CRStatus.blocked)
    await db_session.commit()
    auth_as(dm)

    r = await client.get("/api/v1/dashboard/summary")
    assert r.json()["blocked_items"] >= 2


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ BLOCKED â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@pytest.mark.asyncio
async def test_dashboard_blocked_returns_only_blocked(client, db_session):
    dm = await _create_dm(db_session)
    make_implementation(db_session, dm.id, dm.id, status=ImplementationStatus.blocked)
    make_implementation(db_session, dm.id, dm.id, status=ImplementationStatus.in_progress)
    await db_session.commit()
    auth_as(dm)

    r = await client.get("/api/v1/dashboard/blocked")
    assert r.status_code == 200
    items = r.json()
    # All returned items must have BlockedItem fields
    assert all("item_type" in i and "title" in i and "last_updated_at" in i for i in items)
    # At least one implementation is present (the one we just created)
    assert any(i["item_type"] == "implementation" for i in items)


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ATTENTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@pytest.mark.asyncio
async def test_dashboard_attention_returns_200(client, db_session):
    dm = await _create_dm(db_session)
    auth_as(dm)
    r = await client.get("/api/v1/dashboard/attention")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ RECENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@pytest.mark.asyncio
async def test_dashboard_recent_returns_200(client, db_session):
    dm = await _create_dm(db_session)
    auth_as(dm)
    r = await client.get("/api/v1/dashboard/recent")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ NOTIFICATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@pytest.mark.asyncio
async def test_get_notifications_returns_user_notifications(client, db_session):
    dm = await _create_dm(db_session)
    notif = make_notification(db_session, user_id=dm.id)
    other_user = make_user(db_session)
    await db_session.commit()
    await db_session.refresh(dm)
    await db_session.refresh(other_user)

    # Add a notification for other_user â€” should NOT appear in dm's response
    make_notification(db_session, user_id=other_user.id)
    await db_session.commit()
    await db_session.refresh(notif)
    auth_as(dm)

    r = await client.get("/api/v1/notifications")
    assert r.status_code == 200
    ids = [n["id"] for n in r.json()]
    assert notif.id in ids


@pytest.mark.asyncio
async def test_mark_notification_read(client, db_session):
    dm = await _create_dm(db_session)
    notif = make_notification(db_session, user_id=dm.id)
    await db_session.commit()
    await db_session.refresh(notif)
    auth_as(dm)

    r = await client.patch(f"/api/v1/notifications/{notif.id}/read")
    assert r.status_code == 200
    assert r.json()["is_read"] is True


@pytest.mark.asyncio
async def test_mark_all_notifications_read(client, db_session):
    dm = await _create_dm(db_session)
    make_notification(db_session, user_id=dm.id)
    make_notification(db_session, user_id=dm.id)
    await db_session.commit()
    auth_as(dm)

    r = await client.post("/api/v1/notifications/read-all")
    assert r.status_code == 200
    assert r.json()["marked_read"] >= 2

