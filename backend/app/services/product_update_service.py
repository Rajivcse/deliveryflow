import logging
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import ItemType, NotificationType
from app.models.product_update import (
    ProductUpdate,
    ProductUpdateComment,
    ProductUpdateStatus,
)
from app.services.notification_service import create_notification

logger = logging.getLogger(__name__)


def _set_approaching_release(item: ProductUpdate, today: date) -> None:
    """Compute and attach the approaching_release flag to a ProductUpdate instance."""
    item.approaching_release = (  # type: ignore[attr-defined]
        item.planned_release_date is not None
        and item.status != ProductUpdateStatus.completed
        and 0 <= (item.planned_release_date - today).days <= 3
    )


def _approaching_case():
    """SQLAlchemy CASE expression: 1 if item approaches release within 3 days, else 0."""
    today = date.today()
    tomorrow_plus_3 = today + timedelta(days=3)
    return case(
        (
            (ProductUpdate.planned_release_date.isnot(None))
            & (ProductUpdate.status != ProductUpdateStatus.completed)
            & (ProductUpdate.planned_release_date >= today)
            & (ProductUpdate.planned_release_date <= tomorrow_plus_3),
            1,
        ),
        else_=0,
    )


async def get_list(
    db: AsyncSession,
    status: Optional[ProductUpdateStatus] = None,
    product: Optional[str] = None,
    assigned_to_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    q: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
) -> tuple[list[ProductUpdate], int]:
    """Return a paginated list of product updates and the total count."""
    stmt = select(ProductUpdate)
    count_stmt = select(func.count(ProductUpdate.id))

    filters = []
    if status is not None:
        filters.append(ProductUpdate.status == status)
    if product is not None:
        filters.append(ProductUpdate.product.ilike(f"%{product}%"))
    if assigned_to_id is not None:
        filters.append(ProductUpdate.assigned_to_id == assigned_to_id)
    if date_from is not None:
        filters.append(ProductUpdate.created_at >= date_from)
    if date_to is not None:
        filters.append(ProductUpdate.created_at <= date_to)
    if q is not None and q.strip():
        like_q = f"%{q.strip()}%"
        filters.append(
            or_(
                ProductUpdate.update_name.ilike(like_q),
                ProductUpdate.product.ilike(like_q),
                ProductUpdate.version_number.ilike(like_q),
            )
        )

    if filters:
        stmt = stmt.where(*filters)
        count_stmt = count_stmt.where(*filters)

    count_result = await db.execute(count_stmt)
    total: int = count_result.scalar_one()

    approaching = _approaching_case()
    stmt = stmt.order_by(approaching.desc(), ProductUpdate.created_at.desc())

    offset = (page - 1) * per_page
    stmt = stmt.offset(offset).limit(per_page)

    result = await db.execute(stmt)
    items = list(result.scalars().all())

    today = date.today()
    for item in items:
        _set_approaching_release(item, today)

    return items, total


async def get_by_id(db: AsyncSession, item_id: int) -> Optional[ProductUpdate]:
    """Fetch a single product update by primary key."""
    result = await db.execute(select(ProductUpdate).where(ProductUpdate.id == item_id))
    return result.scalar_one_or_none()


async def create(
    db: AsyncSession,
    data,  # ProductUpdateCreate schema
    created_by_id: int,
) -> ProductUpdate:
    """Create a new product update and optionally notify the assignee."""
    now = datetime.now(tz=timezone.utc)
    item = ProductUpdate(
        update_name=data.update_name,
        version_number=data.version_number,
        product=data.product,
        assigned_to_id=data.assigned_to_id,
        created_by_id=created_by_id,
        start_date=data.start_date,
        planned_release_date=data.planned_release_date,
        last_updated_at=now,
    )
    db.add(item)
    await db.flush()  # populate item.id before notification

    if data.assigned_to_id:
        await create_notification(
            db=db,
            user_id=data.assigned_to_id,
            notification_type=NotificationType.new_assignment,
            item_type=ItemType.product_update,
            item_id=item.id,
            message=f"You have been assigned to product update: {item.update_name}",
        )

    logger.info("Created product update id=%d by user=%d", item.id, created_by_id)
    return item


async def update(
    db: AsyncSession,
    item_id: int,
    data,  # ProductUpdateUpdate schema
    current_user,
) -> Optional[ProductUpdate]:
    """Apply partial updates to a product update and notify on assignment change."""
    item = await get_by_id(db, item_id)
    if item is None:
        return None

    previous_assignee = item.assigned_to_id

    update_fields = data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(item, field, value)

    item.last_updated_at = datetime.now(tz=timezone.utc)

    new_assignee = item.assigned_to_id
    if new_assignee and new_assignee != previous_assignee:
        await create_notification(
            db=db,
            user_id=new_assignee,
            notification_type=NotificationType.new_assignment,
            item_type=ItemType.product_update,
            item_id=item.id,
            message=f"You have been assigned to product update: {item.update_name}",
        )

    logger.info("Updated product update id=%d by user=%d", item.id, current_user.id)
    return item


async def update_status(
    db: AsyncSession,
    item_id: int,
    new_status: ProductUpdateStatus,
    current_user,
) -> Optional[ProductUpdate]:
    """Update the status field and notify the assignee when blocked."""
    item = await get_by_id(db, item_id)
    if item is None:
        return None

    item.status = new_status
    item.last_updated_at = datetime.now(tz=timezone.utc)

    if new_status == ProductUpdateStatus.blocked and item.assigned_to_id:
        await create_notification(
            db=db,
            user_id=item.assigned_to_id,
            notification_type=NotificationType.item_blocked,
            item_type=ItemType.product_update,
            item_id=item.id,
            message=f"Product update '{item.update_name}' has been marked as blocked.",
        )

    logger.info(
        "Status of product update id=%d changed to %s by user=%d",
        item.id,
        new_status.value,
        current_user.id,
    )
    return item


async def delete(db: AsyncSession, item_id: int) -> None:
    """Delete a product update by id (no-op if not found)."""
    item = await get_by_id(db, item_id)
    if item is not None:
        await db.delete(item)
        logger.info("Deleted product update id=%d", item_id)


async def add_comment(
    db: AsyncSession,
    item_id: int,
    body: str,
    author_id: int,
) -> ProductUpdateComment:
    """Append a comment to a product update."""
    comment = ProductUpdateComment(
        product_update_id=item_id,
        author_id=author_id,
        body=body,
    )
    db.add(comment)
    await db.flush()
    logger.info("Added comment id=%d to product update id=%d", comment.id, item_id)
    return comment


async def get_comments(db: AsyncSession, item_id: int) -> list[ProductUpdateComment]:
    """Return all comments for a product update, oldest first."""
    result = await db.execute(
        select(ProductUpdateComment)
        .where(ProductUpdateComment.product_update_id == item_id)
        .order_by(ProductUpdateComment.created_at.asc())
    )
    return list(result.scalars().all())
