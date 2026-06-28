import logging
from datetime import datetime
from typing import Optional

from sqlalchemy import or_, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.venue_implementation import VenueImplementation
from app.models.change_request import ChangeRequest
from app.models.product_update import ProductUpdate
from app.schemas.search import (
    ChangeRequestSearchResult,
    ImplementationSearchResult,
    ProductUpdateSearchResult,
    SearchResult,
)

logger = logging.getLogger(__name__)


def _parse_date(date_str: str | None):
    """Parse a YYYY-MM-DD string into a date object, or return None."""
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        logger.warning("Invalid date string ignored: %s", date_str)
        return None


async def _search_implementations(
    db: AsyncSession,
    q: str | None,
    status: str | None,
    venue: str | None,
    assigned_to_id: int | None,
    date_from: str | None,
    date_to: str | None,
) -> list[ImplementationSearchResult]:
    stmt = select(VenueImplementation).options(
        selectinload(VenueImplementation.assigned_to)
    )

    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                VenueImplementation.iwo_number.ilike(pattern),
                VenueImplementation.venue_name.ilike(pattern),
                VenueImplementation.product_name.ilike(pattern),
            )
        )
    if status:
        stmt = stmt.where(VenueImplementation.status == status)
    if venue:
        stmt = stmt.where(VenueImplementation.venue_name.ilike(f"%{venue}%"))
    if assigned_to_id:
        stmt = stmt.where(VenueImplementation.assigned_to_id == assigned_to_id)

    d_from = _parse_date(date_from)
    d_to = _parse_date(date_to)
    if d_from:
        stmt = stmt.where(VenueImplementation.created_at >= d_from)
    if d_to:
        stmt = stmt.where(VenueImplementation.created_at <= d_to)

    rows = (await db.execute(stmt)).scalars().all()

    return [
        ImplementationSearchResult(
            id=item.id,
            item_type="implementation",
            title=f"{item.iwo_number} – {item.venue_name}",
            status=item.status.value,
            last_updated_at=item.last_updated_at,
            created_at=item.created_at,
            assigned_to_name=(
                item.assigned_to.full_name if item.assigned_to else None
            ),
            iwo_number=item.iwo_number,
            venue_name=item.venue_name,
        )
        for item in rows
    ]


async def _search_change_requests(
    db: AsyncSession,
    q: str | None,
    status: str | None,
    product: str | None,
    assigned_to_id: int | None,
    date_from: str | None,
    date_to: str | None,
) -> list[ChangeRequestSearchResult]:
    stmt = select(ChangeRequest).options(
        selectinload(ChangeRequest.assigned_to)
    )

    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                ChangeRequest.cr_number.ilike(pattern),
                ChangeRequest.request_title.ilike(pattern),
                ChangeRequest.venue_name.ilike(pattern),
                ChangeRequest.product.ilike(pattern),
            )
        )
    if status:
        stmt = stmt.where(ChangeRequest.status == status)
    if product:
        stmt = stmt.where(ChangeRequest.product.ilike(f"%{product}%"))
    if assigned_to_id:
        stmt = stmt.where(ChangeRequest.assigned_to_id == assigned_to_id)

    d_from = _parse_date(date_from)
    d_to = _parse_date(date_to)
    if d_from:
        stmt = stmt.where(ChangeRequest.created_at >= d_from)
    if d_to:
        stmt = stmt.where(ChangeRequest.created_at <= d_to)

    rows = (await db.execute(stmt)).scalars().all()

    return [
        ChangeRequestSearchResult(
            id=item.id,
            item_type="change_request",
            title=item.request_title,
            status=item.status.value,
            last_updated_at=item.last_updated_at,
            created_at=item.created_at,
            assigned_to_name=(
                item.assigned_to.full_name if item.assigned_to else None
            ),
            cr_number=item.cr_number,
            priority=item.priority.value,
        )
        for item in rows
    ]


async def _search_product_updates(
    db: AsyncSession,
    q: str | None,
    status: str | None,
    product: str | None,
    assigned_to_id: int | None,
    date_from: str | None,
    date_to: str | None,
) -> list[ProductUpdateSearchResult]:
    stmt = select(ProductUpdate).options(
        selectinload(ProductUpdate.assigned_to)
    )

    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                ProductUpdate.update_name.ilike(pattern),
                ProductUpdate.product.ilike(pattern),
                ProductUpdate.version_number.ilike(pattern),
            )
        )
    if status:
        stmt = stmt.where(ProductUpdate.status == status)
    if product:
        stmt = stmt.where(ProductUpdate.product.ilike(f"%{product}%"))
    if assigned_to_id:
        stmt = stmt.where(ProductUpdate.assigned_to_id == assigned_to_id)

    d_from = _parse_date(date_from)
    d_to = _parse_date(date_to)
    if d_from:
        stmt = stmt.where(ProductUpdate.created_at >= d_from)
    if d_to:
        stmt = stmt.where(ProductUpdate.created_at <= d_to)

    rows = (await db.execute(stmt)).scalars().all()

    return [
        ProductUpdateSearchResult(
            id=item.id,
            item_type="product_update",
            title=item.update_name,
            status=item.status.value,
            last_updated_at=item.last_updated_at,
            created_at=item.created_at,
            assigned_to_name=(
                item.assigned_to.full_name if item.assigned_to else None
            ),
            product=item.product,
            version_number=item.version_number,
        )
        for item in rows
    ]


async def search(
    db: AsyncSession,
    q: str | None,
    item_type: str | None,
    status: str | None,
    venue: str | None,
    product: str | None,
    assigned_to_id: int | None,
    date_from: str | None,
    date_to: str | None,
    page: int,
    per_page: int,
) -> tuple[list, int]:
    """Search across implementations, change requests, and product updates.

    Returns (paginated_results, total_count).
    """
    all_results: list[SearchResult] = []

    if item_type is None or item_type == "implementation":
        all_results.extend(
            await _search_implementations(
                db, q, status, venue, assigned_to_id, date_from, date_to
            )
        )

    if item_type is None or item_type == "change_request":
        all_results.extend(
            await _search_change_requests(
                db, q, status, product, assigned_to_id, date_from, date_to
            )
        )

    if item_type is None or item_type == "product_update":
        all_results.extend(
            await _search_product_updates(
                db, q, status, product, assigned_to_id, date_from, date_to
            )
        )

    # Sort combined results by last_updated_at descending
    all_results.sort(key=lambda x: x.last_updated_at, reverse=True)

    total = len(all_results)
    start = (page - 1) * per_page
    return all_results[start : start + per_page], total
