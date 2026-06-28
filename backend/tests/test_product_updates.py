"""Tests for /api/v1/product-updates endpoints."""
from datetime import date, timedelta

import pytest
from app.dependencies import get_current_user
from app.main import app
from app.models.product_update import ProductUpdateStatus
from app.models.user import UserRole
from tests.factories import make_product_update, make_user


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
async def test_list_product_updates_returns_200(client, db_session):
    dm, _, _ = await _create_users(db_session)
    auth_as(dm)
    r = await client.get("/api/v1/product-updates/")
    assert r.status_code == 200
    assert "items" in r.json()


@pytest.mark.asyncio
async def test_approaching_release_flagged(client, db_session):
    dm, _, _ = await _create_users(db_session)
    # planned_release_date within 2 days, status not completed
    approaching = make_product_update(
        db_session, dm.id, dm.id,
        status=ProductUpdateStatus.development,
        planned_release_date=date.today() + timedelta(days=2),
    )
    far = make_product_update(
        db_session, dm.id, dm.id,
        planned_release_date=date.today() + timedelta(days=30),
    )
    await db_session.commit()
    await db_session.refresh(approaching)
    auth_as(dm)

    r = await client.get(f"/api/v1/product-updates/{approaching.id}")
    assert r.status_code == 200
    assert r.json()["approaching_release"] is True

    r2 = await client.get(f"/api/v1/product-updates/{far.id}")
    assert r2.json()["approaching_release"] is False


@pytest.mark.asyncio
async def test_approaching_release_not_flagged_when_completed(client, db_session):
    dm, _, _ = await _create_users(db_session)
    item = make_product_update(
        db_session, dm.id, dm.id,
        status=ProductUpdateStatus.completed,
        planned_release_date=date.today() + timedelta(days=1),
    )
    await db_session.commit()
    await db_session.refresh(item)
    auth_as(dm)

    r = await client.get(f"/api/v1/product-updates/{item.id}")
    assert r.json()["approaching_release"] is False


# ──────────────────────────── CREATE ────────────────────────────

@pytest.mark.asyncio
async def test_create_product_update_as_delivery_manager(client, db_session):
    dm, _, _ = await _create_users(db_session)
    auth_as(dm)

    payload = {
        "update_name": "v2.0 Rollout",
        "version_number": "2.0.0",
        "product": "Android App",
        "assigned_to_id": dm.id,
        "start_date": "2026-01-01",
        "planned_release_date": "2026-06-01",
        "status": "planned",
    }
    r = await client.post("/api/v1/product-updates/", json=payload)
    assert r.status_code == 201
    assert r.json()["update_name"] == "v2.0 Rollout"


@pytest.mark.asyncio
async def test_create_product_update_as_product_manager_forbidden(client, db_session):
    _, pm, _ = await _create_users(db_session)
    auth_as(pm)

    payload = {
        "update_name": "PM Update",
        "version_number": "1.0.0",
        "product": "iOS App",
        "assigned_to_id": pm.id,
        "start_date": "2026-01-01",
        "planned_release_date": "2026-06-01",
        "status": "planned",
    }
    r = await client.post("/api/v1/product-updates/", json=payload)
    assert r.status_code == 403


# ──────────────────────────── GET ────────────────────────────

@pytest.mark.asyncio
async def test_get_product_update_detail(client, db_session):
    dm, _, _ = await _create_users(db_session)
    item = make_product_update(db_session, dm.id, dm.id)
    await db_session.commit()
    await db_session.refresh(item)
    auth_as(dm)

    r = await client.get(f"/api/v1/product-updates/{item.id}")
    assert r.status_code == 200
    assert r.json()["id"] == item.id


@pytest.mark.asyncio
async def test_get_product_update_not_found(client, db_session):
    dm, _, _ = await _create_users(db_session)
    auth_as(dm)
    r = await client.get("/api/v1/product-updates/999999")
    assert r.status_code == 404


# ──────────────────────────── UPDATE ────────────────────────────

@pytest.mark.asyncio
async def test_update_product_update(client, db_session):
    dm, _, _ = await _create_users(db_session)
    item = make_product_update(db_session, dm.id, dm.id)
    await db_session.commit()
    await db_session.refresh(item)
    auth_as(dm)

    r = await client.put(f"/api/v1/product-updates/{item.id}", json={"update_name": "Renamed Update"})
    assert r.status_code == 200
    assert r.json()["update_name"] == "Renamed Update"


@pytest.mark.asyncio
async def test_update_product_update_status(client, db_session):
    dm, _, _ = await _create_users(db_session)
    item = make_product_update(db_session, dm.id, dm.id, status=ProductUpdateStatus.planned)
    await db_session.commit()
    await db_session.refresh(item)
    auth_as(dm)

    r = await client.patch(
        f"/api/v1/product-updates/{item.id}/status",
        json={"status": "development"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "development"


# ──────────────────────────── DELETE ────────────────────────────

@pytest.mark.asyncio
async def test_delete_product_update_as_admin(client, db_session):
    dm, _, admin = await _create_users(db_session)
    item = make_product_update(db_session, dm.id, dm.id)
    await db_session.commit()
    await db_session.refresh(item)
    auth_as(admin)

    r = await client.delete(f"/api/v1/product-updates/{item.id}")
    assert r.status_code == 204


@pytest.mark.asyncio
async def test_delete_product_update_as_delivery_manager_forbidden(client, db_session):
    dm, _, _ = await _create_users(db_session)
    item = make_product_update(db_session, dm.id, dm.id)
    await db_session.commit()
    await db_session.refresh(item)
    auth_as(dm)

    r = await client.delete(f"/api/v1/product-updates/{item.id}")
    assert r.status_code == 403


# ──────────────────────────── COMMENTS ────────────────────────────

@pytest.mark.asyncio
async def test_add_product_update_comment(client, db_session):
    dm, _, _ = await _create_users(db_session)
    item = make_product_update(db_session, dm.id, dm.id)
    await db_session.commit()
    await db_session.refresh(item)
    auth_as(dm)

    r = await client.post(
        f"/api/v1/product-updates/{item.id}/comments",
        json={"body": "Release is on track"},
    )
    assert r.status_code == 201
    assert r.json()["body"] == "Release is on track"


@pytest.mark.asyncio
async def test_list_product_update_comments(client, db_session):
    dm, _, _ = await _create_users(db_session)
    item = make_product_update(db_session, dm.id, dm.id)
    await db_session.commit()
    await db_session.refresh(item)
    auth_as(dm)

    await client.post(f"/api/v1/product-updates/{item.id}/comments", json={"body": "Note 1"})
    r = await client.get(f"/api/v1/product-updates/{item.id}/comments")
    assert r.status_code == 200
    assert len(r.json()) >= 1
