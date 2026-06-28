from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.product_update import ProductUpdateStatus


class ProductUpdateBase(BaseModel):
    update_name: str
    version_number: Optional[str] = None
    product: str
    assigned_to_id: Optional[int] = None
    start_date: Optional[date] = None
    planned_release_date: Optional[date] = None
    notes: Optional[str] = None


class ProductUpdateCreate(ProductUpdateBase):
    pass


class ProductUpdateUpdate(BaseModel):
    update_name: Optional[str] = None
    version_number: Optional[str] = None
    product: Optional[str] = None
    assigned_to_id: Optional[int] = None
    start_date: Optional[date] = None
    planned_release_date: Optional[date] = None
    notes: Optional[str] = None


class ProductUpdateStatusUpdate(BaseModel):
    status: ProductUpdateStatus
    notes: Optional[str] = None


class ProductUpdateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    update_name: str
    version_number: Optional[str] = None
    product: str
    assigned_to_id: Optional[int] = None
    created_by_id: int
    start_date: Optional[date] = None
    planned_release_date: Optional[date] = None
    status: ProductUpdateStatus
    notes: Optional[str] = None
    last_updated_at: datetime
    created_at: datetime
    approaching_release: bool = False


class CommentCreate(BaseModel):
    body: str


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_update_id: int
    author_id: int
    body: str
    created_at: datetime
