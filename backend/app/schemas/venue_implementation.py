from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.venue_implementation import ImplementationStatus
from app.schemas.auth import UserResponse  # noqa: F401  # for nested user


class ImplementationBase(BaseModel):
    iwo_number: str
    venue_name: str
    product_name: str
    assigned_to_id: Optional[int] = None
    start_date: Optional[date] = None
    target_date: Optional[date] = None
    notes: Optional[str] = None


class ImplementationCreate(ImplementationBase):
    status: ImplementationStatus = ImplementationStatus.not_started


class ImplementationUpdate(BaseModel):
    venue_name: Optional[str] = None
    product_name: Optional[str] = None
    assigned_to_id: Optional[int] = None
    start_date: Optional[date] = None
    target_date: Optional[date] = None
    status: Optional[ImplementationStatus] = None
    notes: Optional[str] = None


class StatusUpdate(BaseModel):
    status: ImplementationStatus
    notes: Optional[str] = None


class ImplementationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    iwo_number: str
    venue_name: str
    product_name: str
    assigned_to_id: Optional[int]
    created_by_id: int
    start_date: Optional[date]
    target_date: Optional[date]
    status: ImplementationStatus
    notes: Optional[str] = None
    last_updated_at: datetime
    created_at: datetime
    attention_required: bool = False  # computed field, not from DB


class CommentCreate(BaseModel):
    body: str


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    implementation_id: int
    author_id: int
    body: str
    created_at: datetime
