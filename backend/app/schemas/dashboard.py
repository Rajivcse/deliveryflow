from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.notification import NotificationType, ItemType


class DashboardSummary(BaseModel):
    active_implementations: int
    active_change_requests: int
    active_product_updates: int
    blocked_items: int
    delayed_items: int
    completed_items: int
    attention_required: int


class BlockedItem(BaseModel):
    id: int
    title: str  # iwo_number / cr_number+title / update_name
    item_type: str  # "implementation" | "change_request" | "product_update"
    venue_name: Optional[str]
    assigned_to_name: Optional[str]
    last_updated_at: datetime


class AttentionItem(BaseModel):
    id: int
    title: str
    item_type: str
    status: str
    target_date: Optional[datetime]
    last_updated_at: datetime
    reason: str  # "stale" | "near_deadline" | "waiting"


class RecentActivity(BaseModel):
    id: int
    item_type: str
    item_id: int
    item_title: str
    action: str
    actor_name: str
    created_at: datetime


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    type: NotificationType
    item_type: ItemType
    item_id: int
    message: str
    is_read: bool
    created_at: datetime
