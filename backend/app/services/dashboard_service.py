import logging
from datetime import datetime, timezone, timedelta, date
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.venue_implementation import (
    VenueImplementation,
    ImplementationComment,
    ImplementationStatus,
)
from app.models.change_request import (
    ChangeRequest,
    ChangeRequestComment,
    CRStatus,
)
from app.models.product_update import (
    ProductUpdate,
    ProductUpdateComment,
    ProductUpdateStatus,
)
from app.models.notification import Notification
from app.schemas.dashboard import (
    DashboardSummary,
    BlockedItem,
    AttentionItem,
    RecentActivity,
)

logger = logging.getLogger(__name__)

# Status groups used across multiple functions
_VI_ACTIVE_EXCLUDED = [ImplementationStatus.completed]
_CR_ACTIVE_EXCLUDED = [CRStatus.completed]
_PU_ACTIVE_EXCLUDED = [ProductUpdateStatus.completed]

_VI_STALE_EXCLUDED = [ImplementationStatus.completed, ImplementationStatus.blocked]
_CR_STALE_EXCLUDED = [CRStatus.completed, CRStatus.blocked]
_PU_STALE_EXCLUDED = [ProductUpdateStatus.completed, ProductUpdateStatus.blocked]

_VI_WAITING = [
    ImplementationStatus.waiting_for_venue,
    ImplementationStatus.waiting_for_internal_team,
]
_CR_WAITING = [CRStatus.waiting_for_review]


def _date_to_dt(d: Optional[date]) -> Optional[datetime]:
    """Convert a date to a naive datetime at midnight."""
    if d is None:
        return None
    return datetime(d.year, d.month, d.day)


async def get_summary(db: AsyncSession, stale_threshold_days: int) -> DashboardSummary:
    stale_cutoff = datetime.now(timezone.utc) - timedelta(days=stale_threshold_days)

    # active_implementations: not completed
    r = await db.execute(
        select(func.count()).select_from(VenueImplementation).where(
            VenueImplementation.status.notin_(_VI_ACTIVE_EXCLUDED)
        )
    )
    active_implementations = r.scalar() or 0

    # active_change_requests: not completed
    r = await db.execute(
        select(func.count()).select_from(ChangeRequest).where(
            ChangeRequest.status.notin_(_CR_ACTIVE_EXCLUDED)
        )
    )
    active_change_requests = r.scalar() or 0

    # active_product_updates: not completed
    r = await db.execute(
        select(func.count()).select_from(ProductUpdate).where(
            ProductUpdate.status.notin_(_PU_ACTIVE_EXCLUDED)
        )
    )
    active_product_updates = r.scalar() or 0

    # blocked_items: sum across all three tables
    r1 = await db.execute(
        select(func.count()).select_from(VenueImplementation).where(
            VenueImplementation.status == ImplementationStatus.blocked
        )
    )
    r2 = await db.execute(
        select(func.count()).select_from(ChangeRequest).where(
            ChangeRequest.status == CRStatus.blocked
        )
    )
    r3 = await db.execute(
        select(func.count()).select_from(ProductUpdate).where(
            ProductUpdate.status == ProductUpdateStatus.blocked
        )
    )
    blocked_items = (r1.scalar() or 0) + (r2.scalar() or 0) + (r3.scalar() or 0)

    # delayed_items: ChangeRequest only
    r = await db.execute(
        select(func.count()).select_from(ChangeRequest).where(
            ChangeRequest.status == CRStatus.delayed
        )
    )
    delayed_items = r.scalar() or 0

    # completed_items: sum across all three tables
    r1 = await db.execute(
        select(func.count()).select_from(VenueImplementation).where(
            VenueImplementation.status == ImplementationStatus.completed
        )
    )
    r2 = await db.execute(
        select(func.count()).select_from(ChangeRequest).where(
            ChangeRequest.status == CRStatus.completed
        )
    )
    r3 = await db.execute(
        select(func.count()).select_from(ProductUpdate).where(
            ProductUpdate.status == ProductUpdateStatus.completed
        )
    )
    completed_items = (r1.scalar() or 0) + (r2.scalar() or 0) + (r3.scalar() or 0)

    # attention_required: stale items (not completed, not blocked, not recently updated)
    r1 = await db.execute(
        select(func.count()).select_from(VenueImplementation).where(
            VenueImplementation.last_updated_at < stale_cutoff,
            VenueImplementation.status.notin_(_VI_STALE_EXCLUDED),
        )
    )
    r2 = await db.execute(
        select(func.count()).select_from(ChangeRequest).where(
            ChangeRequest.last_updated_at < stale_cutoff,
            ChangeRequest.status.notin_(_CR_STALE_EXCLUDED),
        )
    )
    r3 = await db.execute(
        select(func.count()).select_from(ProductUpdate).where(
            ProductUpdate.last_updated_at < stale_cutoff,
            ProductUpdate.status.notin_(_PU_STALE_EXCLUDED),
        )
    )
    attention_required = (r1.scalar() or 0) + (r2.scalar() or 0) + (r3.scalar() or 0)

    return DashboardSummary(
        active_implementations=active_implementations,
        active_change_requests=active_change_requests,
        active_product_updates=active_product_updates,
        blocked_items=blocked_items,
        delayed_items=delayed_items,
        completed_items=completed_items,
        attention_required=attention_required,
    )


async def get_blocked_items(db: AsyncSession) -> list[BlockedItem]:
    items: list[BlockedItem] = []

    # VenueImplementation blocked
    result = await db.execute(
        select(VenueImplementation)
        .where(VenueImplementation.status == ImplementationStatus.blocked)
        .options(selectinload(VenueImplementation.assigned_to))
    )
    for vi in result.scalars().all():
        items.append(
            BlockedItem(
                id=vi.id,
                title=vi.iwo_number,
                item_type="implementation",
                venue_name=vi.venue_name,
                assigned_to_name=vi.assigned_to.full_name if vi.assigned_to else None,
                last_updated_at=vi.last_updated_at,
            )
        )

    # ChangeRequest blocked
    result = await db.execute(
        select(ChangeRequest)
        .where(ChangeRequest.status == CRStatus.blocked)
        .options(selectinload(ChangeRequest.assigned_to))
    )
    for cr in result.scalars().all():
        items.append(
            BlockedItem(
                id=cr.id,
                title=f"{cr.cr_number} {cr.request_title}",
                item_type="change_request",
                venue_name=cr.venue_name,
                assigned_to_name=cr.assigned_to.full_name if cr.assigned_to else None,
                last_updated_at=cr.last_updated_at,
            )
        )

    # ProductUpdate blocked
    result = await db.execute(
        select(ProductUpdate)
        .where(ProductUpdate.status == ProductUpdateStatus.blocked)
        .options(selectinload(ProductUpdate.assigned_to))
    )
    for pu in result.scalars().all():
        items.append(
            BlockedItem(
                id=pu.id,
                title=pu.update_name,
                item_type="product_update",
                venue_name=None,  # ProductUpdate has no venue_name field
                assigned_to_name=pu.assigned_to.full_name if pu.assigned_to else None,
                last_updated_at=pu.last_updated_at,
            )
        )

    # Sort ascending by last_updated_at so longest-blocked items appear first
    items.sort(key=lambda x: x.last_updated_at)
    return items[:50]


async def get_attention_items(
    db: AsyncSession, stale_threshold_days: int
) -> list[AttentionItem]:
    stale_cutoff = datetime.now(timezone.utc) - timedelta(days=stale_threshold_days)
    near_deadline_date = date.today() + timedelta(days=3)

    items: list[AttentionItem] = []
    # Track (item_type, id) so each item appears once with its highest-priority reason
    seen: set[tuple[str, int]] = set()

    def _add(item: AttentionItem) -> None:
        key = (item.item_type, item.id)
        if key not in seen:
            seen.add(key)
            items.append(item)

    # ------------------------------------------------------------------ #
    # VenueImplementation                                                  #
    # ------------------------------------------------------------------ #

    # 1. Near deadline (highest priority for VI)
    result = await db.execute(
        select(VenueImplementation).where(
            VenueImplementation.target_date.isnot(None),
            VenueImplementation.target_date <= near_deadline_date,
            VenueImplementation.status != ImplementationStatus.completed,
        )
    )
    for vi in result.scalars().all():
        _add(
            AttentionItem(
                id=vi.id,
                title=vi.iwo_number,
                item_type="implementation",
                status=vi.status.value,
                target_date=_date_to_dt(vi.target_date),
                last_updated_at=vi.last_updated_at,
                reason="near_deadline",
            )
        )

    # 2. Waiting
    result = await db.execute(
        select(VenueImplementation).where(
            VenueImplementation.status.in_(_VI_WAITING)
        )
    )
    for vi in result.scalars().all():
        _add(
            AttentionItem(
                id=vi.id,
                title=vi.iwo_number,
                item_type="implementation",
                status=vi.status.value,
                target_date=_date_to_dt(vi.target_date),
                last_updated_at=vi.last_updated_at,
                reason="waiting",
            )
        )

    # 3. Stale
    result = await db.execute(
        select(VenueImplementation).where(
            VenueImplementation.last_updated_at < stale_cutoff,
            VenueImplementation.status.notin_(_VI_STALE_EXCLUDED),
        )
    )
    for vi in result.scalars().all():
        _add(
            AttentionItem(
                id=vi.id,
                title=vi.iwo_number,
                item_type="implementation",
                status=vi.status.value,
                target_date=_date_to_dt(vi.target_date),
                last_updated_at=vi.last_updated_at,
                reason="stale",
            )
        )

    # ------------------------------------------------------------------ #
    # ChangeRequest                                                        #
    # ------------------------------------------------------------------ #

    # 1. Waiting (CR has no target_date, so near_deadline does not apply)
    result = await db.execute(
        select(ChangeRequest).where(ChangeRequest.status.in_(_CR_WAITING))
    )
    for cr in result.scalars().all():
        _add(
            AttentionItem(
                id=cr.id,
                title=f"{cr.cr_number} {cr.request_title}",
                item_type="change_request",
                status=cr.status.value,
                target_date=None,
                last_updated_at=cr.last_updated_at,
                reason="waiting",
            )
        )

    # 2. Stale
    result = await db.execute(
        select(ChangeRequest).where(
            ChangeRequest.last_updated_at < stale_cutoff,
            ChangeRequest.status.notin_(_CR_STALE_EXCLUDED),
        )
    )
    for cr in result.scalars().all():
        _add(
            AttentionItem(
                id=cr.id,
                title=f"{cr.cr_number} {cr.request_title}",
                item_type="change_request",
                status=cr.status.value,
                target_date=None,
                last_updated_at=cr.last_updated_at,
                reason="stale",
            )
        )

    # ------------------------------------------------------------------ #
    # ProductUpdate                                                        #
    # ------------------------------------------------------------------ #

    # 1. Near deadline
    result = await db.execute(
        select(ProductUpdate).where(
            ProductUpdate.planned_release_date.isnot(None),
            ProductUpdate.planned_release_date <= near_deadline_date,
            ProductUpdate.status != ProductUpdateStatus.completed,
        )
    )
    for pu in result.scalars().all():
        _add(
            AttentionItem(
                id=pu.id,
                title=pu.update_name,
                item_type="product_update",
                status=pu.status.value,
                target_date=_date_to_dt(pu.planned_release_date),
                last_updated_at=pu.last_updated_at,
                reason="near_deadline",
            )
        )

    # 2. Stale (ProductUpdate has no waiting statuses)
    result = await db.execute(
        select(ProductUpdate).where(
            ProductUpdate.last_updated_at < stale_cutoff,
            ProductUpdate.status.notin_(_PU_STALE_EXCLUDED),
        )
    )
    for pu in result.scalars().all():
        _add(
            AttentionItem(
                id=pu.id,
                title=pu.update_name,
                item_type="product_update",
                status=pu.status.value,
                target_date=_date_to_dt(pu.planned_release_date),
                last_updated_at=pu.last_updated_at,
                reason="stale",
            )
        )

    # Sort: near_deadline first, then waiting, then stale; within each group
    # oldest last_updated_at first (most neglected items surface to the top).
    _reason_priority = {"near_deadline": 0, "waiting": 1, "stale": 2}
    items.sort(key=lambda x: (_reason_priority[x.reason], x.last_updated_at))
    return items[:30]


async def get_recent_activity(db: AsyncSession) -> list[RecentActivity]:
    activity: list[RecentActivity] = []

    # Implementation comments
    result = await db.execute(
        select(ImplementationComment)
        .options(
            selectinload(ImplementationComment.author),
            selectinload(ImplementationComment.implementation),
        )
        .order_by(ImplementationComment.created_at.desc())
        .limit(20)
    )
    for comment in result.scalars().all():
        activity.append(
            RecentActivity(
                id=comment.id,
                item_type="implementation",
                item_id=comment.implementation_id,
                item_title=comment.implementation.iwo_number,
                action="commented on",
                actor_name=comment.author.full_name,
                created_at=comment.created_at,
            )
        )

    # ChangeRequest comments
    result = await db.execute(
        select(ChangeRequestComment)
        .options(
            selectinload(ChangeRequestComment.author),
            selectinload(ChangeRequestComment.change_request),
        )
        .order_by(ChangeRequestComment.created_at.desc())
        .limit(20)
    )
    for comment in result.scalars().all():
        cr = comment.change_request
        activity.append(
            RecentActivity(
                id=comment.id,
                item_type="change_request",
                item_id=comment.change_request_id,
                item_title=f"{cr.cr_number} {cr.request_title}",
                action="commented on",
                actor_name=comment.author.full_name,
                created_at=comment.created_at,
            )
        )

    # ProductUpdate comments
    result = await db.execute(
        select(ProductUpdateComment)
        .options(
            selectinload(ProductUpdateComment.author),
            selectinload(ProductUpdateComment.product_update),
        )
        .order_by(ProductUpdateComment.created_at.desc())
        .limit(20)
    )
    for comment in result.scalars().all():
        activity.append(
            RecentActivity(
                id=comment.id,
                item_type="product_update",
                item_id=comment.product_update_id,
                item_title=comment.product_update.update_name,
                action="commented on",
                actor_name=comment.author.full_name,
                created_at=comment.created_at,
            )
        )

    # Merge all three comment streams and keep the 20 most recent overall
    activity.sort(key=lambda x: x.created_at, reverse=True)
    return activity[:20]


async def get_user_notifications(
    db: AsyncSession, user_id: int
) -> list[Notification]:
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    return list(result.scalars().all())


async def mark_notification_read(
    db: AsyncSession, notification_id: int, user_id: int
) -> Notification:
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
    )
    notification = result.scalar_one_or_none()
    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    await db.flush()
    await db.refresh(notification)
    return notification


async def mark_all_notifications_read(db: AsyncSession, user_id: int) -> int:
    stmt = (
        update(Notification)
        .where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
        .values(is_read=True)
        .execution_options(synchronize_session=False)
    )
    result = await db.execute(stmt)
    return result.rowcount
