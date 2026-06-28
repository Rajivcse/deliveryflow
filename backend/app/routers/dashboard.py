from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user
from app.services import dashboard_service
from app.schemas.dashboard import (
    DashboardSummary,
    BlockedItem,
    AttentionItem,
    RecentActivity,
    NotificationResponse,
)
from app.config import settings

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/summary", response_model=DashboardSummary)
async def get_summary(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await dashboard_service.get_summary(db, settings.STALE_DAYS_THRESHOLD)


@router.get("/dashboard/blocked", response_model=list[BlockedItem])
async def get_blocked(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await dashboard_service.get_blocked_items(db)


@router.get("/dashboard/attention", response_model=list[AttentionItem])
async def get_attention(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await dashboard_service.get_attention_items(db, settings.STALE_DAYS_THRESHOLD)


@router.get("/dashboard/recent", response_model=list[RecentActivity])
async def get_recent(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await dashboard_service.get_recent_activity(db)


@router.get("/notifications", response_model=list[NotificationResponse])
async def get_notifications(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    notifs = await dashboard_service.get_user_notifications(db, current_user.id)
    return [NotificationResponse.model_validate(n) for n in notifs]


@router.patch("/notifications/{notification_id}/read", response_model=NotificationResponse)
async def mark_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    notif = await dashboard_service.mark_notification_read(db, notification_id, current_user.id)
    return NotificationResponse.model_validate(notif)


@router.post("/notifications/read-all", status_code=200)
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    count = await dashboard_service.mark_all_notifications_read(db, current_user.id)
    return {"marked_read": count}
