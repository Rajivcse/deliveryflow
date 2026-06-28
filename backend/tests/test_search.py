"""Tests for /api/v1/search endpoint."""
import pytest
from app.dependencies import get_current_user
from app.main import app
from app.models.user import UserRole
from app.models.venue_implementation import ImplementationStatus
from tests.factories import make_cr, make_implementation, make_product_update, make_user


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


def get_items(response):
    """Search may return paginated or flat list — handle both."""
    body = response.json()
    return body.get("items", body) if isinstance(body, dict) else body


@pytest.mark.asyncio
async def test_search_returns_200(client, db_session):
    dm = await _create_dm(db_session)
    auth_as(dm)
    r = await client.get("/api/v1/search/", params={"q": "test"})
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_search_type_filter_implementations_only(client, db_session):
    dm = await _create_dm(db_session)
    make_implementation(db_session, dm.id, dm.id)
    make_cr(db_session, dm.id, dm.id)
    await db_session.commit()
    auth_as(dm)

    r = await client.get("/api/v1/search/", params={"type": "implementation"})
    assert r.status_code == 200
    items = get_items(r)
    assert all(i["item_type"] == "implementation" for i in items)


@pytest.mark.asyncio
async def test_search_type_filter_change_requests_only(client, db_session):
    dm = await _create_dm(db_session)
    make_implementation(db_session, dm.id, dm.id)
    make_cr(db_session, dm.id, dm.id)
    await db_session.commit()
    auth_as(dm)

    r = await client.get("/api/v1/search/", params={"type": "change_request"})
    assert r.status_code == 200
    items = get_items(r)
    assert all(i["item_type"] == "change_request" for i in items)


@pytest.mark.asyncio
async def test_search_status_filter(client, db_session):
    dm = await _create_dm(db_session)
    make_implementation(db_session, dm.id, dm.id, status=ImplementationStatus.blocked)
    make_implementation(db_session, dm.id, dm.id, status=ImplementationStatus.in_progress)
    await db_session.commit()
    auth_as(dm)

    r = await client.get("/api/v1/search/", params={"status": "blocked", "type": "implementation"})
    assert r.status_code == 200
    items = get_items(r)
    assert all(i["status"] == "blocked" for i in items)


@pytest.mark.asyncio
async def test_search_empty_query_with_type_returns_results(client, db_session):
    dm = await _create_dm(db_session)
    make_product_update(db_session, dm.id, dm.id)
    await db_session.commit()
    auth_as(dm)

    r = await client.get("/api/v1/search/", params={"type": "product_update"})
    assert r.status_code == 200
    items = get_items(r)
    assert any(i["item_type"] == "product_update" for i in items)


@pytest.mark.asyncio
async def test_search_no_params_returns_all(client, db_session):
    dm = await _create_dm(db_session)
    make_implementation(db_session, dm.id, dm.id)
    make_cr(db_session, dm.id, dm.id)
    await db_session.commit()
    auth_as(dm)

    r = await client.get("/api/v1/search/")
    assert r.status_code == 200
    items = get_items(r)
    types = {i["item_type"] for i in items}
    assert "implementation" in types
    assert "change_request" in types
