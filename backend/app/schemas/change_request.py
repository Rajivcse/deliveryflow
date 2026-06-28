from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.change_request import CRSource, CRStatus, Priority


class ChangeRequestBase(BaseModel):
    cr_number: str
    venue_name: Optional[str] = None
    product: str
    request_title: str
    requested_by: str
    assigned_to_id: Optional[int] = None
    source: CRSource
    priority: Priority


class ChangeRequestCreate(ChangeRequestBase):
    pass


class ChangeRequestUpdate(BaseModel):
    venue_name: Optional[str] = None
    product: Optional[str] = None
    request_title: Optional[str] = None
    requested_by: Optional[str] = None
    assigned_to_id: Optional[int] = None
    source: Optional[CRSource] = None
    priority: Optional[Priority] = None


class CRStatusUpdate(BaseModel):
    status: CRStatus


class ChangeRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cr_number: str
    venue_name: Optional[str]
    product: str
    request_title: str
    requested_by: str
    assigned_to_id: Optional[int]
    created_by_id: int
    source: CRSource
    priority: Priority
    status: CRStatus
    last_updated_at: datetime
    created_at: datetime


class CommentCreate(BaseModel):
    body: str


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    change_request_id: int
    author_id: int
    body: str
    created_at: datetime
