from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification, NotificationType, ItemType


async def create_notification(
    db: AsyncSession,
    user_id: int,
    notification_type: NotificationType,
    item_type: ItemType,
    item_id: int,
    message: str,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        type=notification_type,
        item_type=item_type,
        item_id=item_id,
        message=message,
    )
    db.add(notification)
    return notification
