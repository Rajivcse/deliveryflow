import logging
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.exceptions import NotFoundError
from app.models.notification import ItemType, NotificationType
from app.models.venue_implementation import (
    ImplementationComment,
    ImplementationStatus,
    VenueImplementation,
)
from app.schemas.venue_implementation import ImplementationCreate, ImplementationUpdate

logger = logging.getLogger(__name__)


def _compute_attention_required(item: VenueImplementation) -> bool:
    """Return True when the item has not been updated within STALE_DAYS_THRESHOLD days."""
    threshold = datetime.now(timezone.utc) - timedelta(days=settings.STALE_DAYS_THRESHOLD)
    last_updated = item.last_updated_at
    if last_updated.tzinfo is None:
        last_updated = last_updated.replace(tzinfo=timezone.utc)
    return last_updated < threshold


async def get_list(
    db: AsyncSession,
    status: Optional[str] = None,
    venue: Optional[str] = None,
    assigned_to_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    q: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
) -> tuple[list[VenueImplementation], int]:
    filters = []

    if status:
        try:
            filters.append(VenueImplementation.status == ImplementationStatus(status))
        except ValueError:
            pass  # skip unknown status values rather than raising

    if venue:
        filters.append(VenueImplementation.venue_name.ilike(f"%{venue}%"))

    if assigned_to_id is not None:
        filters.append(VenueImplementation.assigned_to_id == assigned_to_id)

    if date_from:
        filters.append(VenueImplementation.target_date >= date.fromisoformat(date_from))

    if date_to:
        filters.append(VenueImplementation.target_date <= date.fromisoformat(date_to))

    if q:
        filters.append(
            or_(
                VenueImplementation.venue_name.ilike(f"%{q}%"),
                VenueImplementation.iwo_number.ilike(f"%{q}%"),
                VenueImplementation.product_name.ilike(f"%{q}%"),
            )
        )

    where_clause = and_(*filters)

    # Total count
    count_result = await db.execute(
        select(func.count(VenueImplementation.id)).where(where_clause)
    )
    total = count_result.scalar_one()

    # Paginated data ordered by most recently updated first
    result = await db.execute(
        select(VenueImplementation)
        .where(where_clause)
        .order_by(VenueImplementation.last_updated_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    items = list(result.scalars().all())

    # Attach computed flag; the router re-validates the same threshold for responses
    for item in items:
        item.attention_required = _compute_attention_required(item)  # type: ignore[attr-defined]

    return items, total


async def get_by_id(db: AsyncSession, item_id: int) -> VenueImplementation | None:
    result = await db.execute(
        select(VenueImplementation).where(VenueImplementation.id == item_id)
    )
    item = result.scalar_one_or_none()
    if item:
        item.attention_required = _compute_attention_required(item)  # type: ignore[attr-defined]
    return item


async def create(
    db: AsyncSession,
    data: ImplementationCreate,
    created_by_id: int,
) -> VenueImplementation:
    item = VenueImplementation(
        iwo_number=data.iwo_number,
        venue_name=data.venue_name,
        product_name=data.product_name,
        assigned_to_id=data.assigned_to_id,
        created_by_id=created_by_id,
        start_date=data.start_date,
        target_date=data.target_date,
        status=data.status,
        notes=data.notes,
        last_updated_at=datetime.now(timezone.utc),
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)

    if data.assigned_to_id:
        try:
            from app.services.notification_service import create_notification  # noqa: PLC0415

            await create_notification(
                db,
                user_id=data.assigned_to_id,
                notification_type=NotificationType.new_assignment,
                item_type=ItemType.implementation,
                item_id=item.id,
                message=(
                    f"You have been assigned to implementation"
                    f" '{item.iwo_number}' – {item.venue_name}."
                ),
            )
        except Exception:
            logger.warning("Failed to send new_assignment notification", exc_info=True)

    item.attention_required = _compute_attention_required(item)  # type: ignore[attr-defined]
    return item


async def update(
    db: AsyncSession,
    item_id: int,
    data: ImplementationUpdate,
    current_user,
) -> VenueImplementation:
    result = await db.execute(
        select(VenueImplementation).where(VenueImplementation.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise NotFoundError("Implementation")

    old_assigned_to_id = item.assigned_to_id

    if data.venue_name is not None:
        item.venue_name = data.venue_name
    if data.product_name is not None:
        item.product_name = data.product_name
    if data.assigned_to_id is not None:
        item.assigned_to_id = data.assigned_to_id
    if data.start_date is not None:
        item.start_date = data.start_date
    if data.target_date is not None:
        item.target_date = data.target_date
    if data.status is not None:
        item.status = data.status
    if data.notes is not None:
        item.notes = data.notes

    item.last_updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(item)

    # Notify new assignee only when the assignee actually changed
    if data.assigned_to_id is not None and data.assigned_to_id != old_assigned_to_id:
        try:
            from app.services.notification_service import create_notification  # noqa: PLC0415

            await create_notification(
                db,
                user_id=data.assigned_to_id,
                notification_type=NotificationType.new_assignment,
                item_type=ItemType.implementation,
                item_id=item.id,
                message=(
                    f"You have been assigned to implementation"
                    f" '{item.iwo_number}' – {item.venue_name}."
                ),
            )
        except Exception:
            logger.warning("Failed to send new_assignment notification", exc_info=True)

    item.attention_required = _compute_attention_required(item)  # type: ignore[attr-defined]
    return item


async def update_status(
    db: AsyncSession,
    item_id: int,
    new_status: ImplementationStatus,
    current_user,
    notes: Optional[str] = None,
) -> VenueImplementation:
    result = await db.execute(
        select(VenueImplementation).where(VenueImplementation.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise NotFoundError("Implementation")

    old_status = item.status.value

    item.status = new_status
    if notes is not None:
        item.notes = notes
    item.last_updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(item)

    from app.services import status_history_service  # noqa: PLC0415

    await status_history_service.record(
        db,
        item_type="implementation",
        item_id=item.id,
        old_status=old_status,
        new_status=new_status.value,
        changed_by_id=current_user.id,
        notes=notes,
    )

    if new_status == ImplementationStatus.blocked and item.assigned_to_id:
        try:
            from app.services.notification_service import create_notification  # noqa: PLC0415

            await create_notification(
                db,
                user_id=item.assigned_to_id,
                notification_type=NotificationType.item_blocked,
                item_type=ItemType.implementation,
                item_id=item.id,
                message=(
                    f"Implementation '{item.iwo_number}' – {item.venue_name}"
                    f" has been marked as Blocked."
                ),
            )
        except Exception:
            logger.warning("Failed to send item_blocked notification", exc_info=True)

    item.attention_required = _compute_attention_required(item)  # type: ignore[attr-defined]
    return item


async def delete(db: AsyncSession, item_id: int) -> None:
    result = await db.execute(
        select(VenueImplementation).where(VenueImplementation.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise NotFoundError("Implementation")
    await db.delete(item)
    await db.flush()


async def add_comment(
    db: AsyncSession,
    item_id: int,
    body: str,
    author_id: int,
) -> ImplementationComment:
    # Verify the parent implementation exists before attaching a comment
    exists = await db.execute(
        select(VenueImplementation).where(VenueImplementation.id == item_id)
    )
    if not exists.scalar_one_or_none():
        raise NotFoundError("Implementation")

    comment = ImplementationComment(
        implementation_id=item_id,
        author_id=author_id,
        body=body,
    )
    db.add(comment)
    await db.flush()
    await db.refresh(comment)
    return comment


async def get_comments(
    db: AsyncSession,
    item_id: int,
) -> list[ImplementationComment]:
    result = await db.execute(
        select(ImplementationComment)
        .where(ImplementationComment.implementation_id == item_id)
        .order_by(ImplementationComment.created_at)
    )
    return list(result.scalars().all())
