import logging
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy import and_, case, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import NotFoundError
from app.models.change_request import (
    ChangeRequest,
    ChangeRequestComment,
    CRSource,
    CRStatus,
    Priority,
)
from app.models.notification import ItemType, NotificationType
from app.services.notification_service import create_notification

logger = logging.getLogger(__name__)

_PRIORITY_ORDER = case(
    (ChangeRequest.priority == Priority.high, 1),
    (ChangeRequest.priority == Priority.medium, 2),
    (ChangeRequest.priority == Priority.low, 3),
    else_=4,
)


async def get_list(
    db: AsyncSession,
    status: Optional[CRStatus] = None,
    priority: Optional[Priority] = None,
    product: Optional[str] = None,
    venue: Optional[str] = None,
    source: Optional[CRSource] = None,
    assigned_to_id: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    q: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
) -> Tuple[List[ChangeRequest], int]:
    conditions = []

    if status is not None:
        conditions.append(ChangeRequest.status == status)
    if priority is not None:
        conditions.append(ChangeRequest.priority == priority)
    if product is not None:
        conditions.append(ChangeRequest.product.ilike(f"%{product}%"))
    if venue is not None:
        conditions.append(ChangeRequest.venue_name.ilike(f"%{venue}%"))
    if source is not None:
        conditions.append(ChangeRequest.source == source)
    if assigned_to_id is not None:
        conditions.append(ChangeRequest.assigned_to_id == assigned_to_id)
    if date_from is not None:
        conditions.append(ChangeRequest.created_at >= date_from)
    if date_to is not None:
        conditions.append(ChangeRequest.created_at <= date_to)
    if q is not None:
        term = f"%{q}%"
        conditions.append(
            or_(
                ChangeRequest.request_title.ilike(term),
                ChangeRequest.venue_name.ilike(term),
                ChangeRequest.cr_number.ilike(term),
                ChangeRequest.product.ilike(term),
            )
        )

    where_clause = and_(*conditions) if conditions else True

    count_stmt = select(func.count()).select_from(ChangeRequest).where(where_clause)
    total_result = await db.execute(count_stmt)
    total = total_result.scalar_one()

    offset = (page - 1) * per_page
    items_stmt = (
        select(ChangeRequest)
        .where(where_clause)
        .order_by(_PRIORITY_ORDER, desc(ChangeRequest.created_at))
        .offset(offset)
        .limit(per_page)
    )
    items_result = await db.execute(items_stmt)
    items = list(items_result.scalars().all())

    return items, total


async def get_by_id(db: AsyncSession, item_id: int) -> Optional[ChangeRequest]:
    result = await db.execute(select(ChangeRequest).where(ChangeRequest.id == item_id))
    return result.scalar_one_or_none()


async def create(
    db: AsyncSession,
    data,
    created_by_id: int,
) -> ChangeRequest:
    now = datetime.now(timezone.utc)
    item = ChangeRequest(
        **data.model_dump(),
        created_by_id=created_by_id,
        last_updated_at=now,
    )
    db.add(item)
    await db.flush()

    if item.assigned_to_id:
        await create_notification(
            db=db,
            user_id=item.assigned_to_id,
            notification_type=NotificationType.new_assignment,
            item_type=ItemType.change_request,
            item_id=item.id,
            message=f"You have been assigned to change request {item.cr_number}: {item.request_title}",
        )

    await db.flush()
    await db.refresh(item)
    return item


async def update(
    db: AsyncSession,
    item_id: int,
    data,
    current_user,
) -> ChangeRequest:
    item = await get_by_id(db, item_id)
    if item is None:
        raise NotFoundError("ChangeRequest")

    old_assigned_to_id = item.assigned_to_id
    update_data = data.model_dump(exclude_none=True)

    for field, value in update_data.items():
        setattr(item, field, value)

    item.last_updated_at = datetime.now(timezone.utc)

    new_assigned_to_id = update_data.get("assigned_to_id")
    if new_assigned_to_id is not None and new_assigned_to_id != old_assigned_to_id:
        await create_notification(
            db=db,
            user_id=new_assigned_to_id,
            notification_type=NotificationType.new_assignment,
            item_type=ItemType.change_request,
            item_id=item.id,
            message=f"You have been assigned to change request {item.cr_number}: {item.request_title}",
        )

    await db.flush()
    await db.refresh(item)
    return item


async def update_status(
    db: AsyncSession,
    item_id: int,
    new_status: CRStatus,
    current_user,
    notes: Optional[str] = None,
) -> ChangeRequest:
    item = await get_by_id(db, item_id)
    if item is None:
        raise NotFoundError("ChangeRequest")

    item.status = new_status
    if notes is not None:
        item.notes = notes
    item.last_updated_at = datetime.now(timezone.utc)

    if item.assigned_to_id:
        if new_status == CRStatus.blocked:
            await create_notification(
                db=db,
                user_id=item.assigned_to_id,
                notification_type=NotificationType.item_blocked,
                item_type=ItemType.change_request,
                item_id=item.id,
                message=f"Change request {item.cr_number} has been marked as blocked.",
            )
        elif new_status == CRStatus.delayed:
            await create_notification(
                db=db,
                user_id=item.assigned_to_id,
                notification_type=NotificationType.item_delayed,
                item_type=ItemType.change_request,
                item_id=item.id,
                message=f"Change request {item.cr_number} has been marked as delayed.",
            )

    await db.flush()
    await db.refresh(item)
    return item


async def delete(db: AsyncSession, item_id: int) -> None:
    item = await get_by_id(db, item_id)
    if item is None:
        raise NotFoundError("ChangeRequest")
    await db.delete(item)


async def add_comment(
    db: AsyncSession,
    item_id: int,
    body: str,
    author_id: int,
) -> ChangeRequestComment:
    item = await get_by_id(db, item_id)
    if item is None:
        raise NotFoundError("ChangeRequest")

    comment = ChangeRequestComment(
        change_request_id=item_id,
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
) -> List[ChangeRequestComment]:
    result = await db.execute(
        select(ChangeRequestComment)
        .where(ChangeRequestComment.change_request_id == item_id)
        .order_by(ChangeRequestComment.created_at.asc())
    )
    return list(result.scalars().all())
