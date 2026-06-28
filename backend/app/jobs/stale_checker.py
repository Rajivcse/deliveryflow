import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from app.config import settings

logger = logging.getLogger(__name__)


async def daily_stale_check(session_factory: async_sessionmaker[AsyncSession]) -> None:
    """Mark stale Change Requests as 'delayed' when not updated for STALE_DAYS_THRESHOLD days."""
    from app.models.change_request import ChangeRequest, CRStatus
    from app.models.notification import Notification, NotificationType, ItemType

    threshold = datetime.now(timezone.utc) - timedelta(days=settings.STALE_DAYS_THRESHOLD)
    excluded_statuses = [CRStatus.completed, CRStatus.blocked, CRStatus.delayed]

    async with session_factory() as session:
        try:
            # Find stale CRs
            result = await session.execute(
                select(ChangeRequest).where(
                    ChangeRequest.last_updated_at < threshold,
                    ChangeRequest.status.not_in(excluded_statuses),
                )
            )
            stale_crs = result.scalars().all()

            for cr in stale_crs:
                cr.status = CRStatus.delayed
                cr.last_updated_at = datetime.now(timezone.utc)

                # Create notification for assignee
                if cr.assigned_to_id:
                    notification = Notification(
                        user_id=cr.assigned_to_id,
                        type=NotificationType.item_delayed,
                        item_type=ItemType.change_request,
                        item_id=cr.id,
                        message=f"Change Request '{cr.request_title}' has been marked as Delayed due to inactivity.",
                    )
                    session.add(notification)

            await session.commit()
            logger.info(f"Stale checker: marked {len(stale_crs)} CRs as delayed")
        except Exception as e:
            await session.rollback()
            logger.error(f"Stale checker failed: {e}")
