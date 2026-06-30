from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ChangedByUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    full_name: str
    avatar_url: Optional[str] = None


class StatusHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_type: str
    item_id: int
    old_status: str
    new_status: str
    notes: Optional[str] = None
    changed_by_id: int
    changed_at: datetime
    changed_by: Optional[ChangedByUser] = None
