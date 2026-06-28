import logging
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.product_update import ProductUpdateStatus
from app.schemas.common import PaginatedResponse
from app.schemas.product_update import (
    CommentCreate,
    CommentResponse,
    ProductUpdateCreate,
    ProductUpdateResponse,
    ProductUpdateStatusUpdate,
    ProductUpdateUpdate,
)
from app.services import product_update_service as svc

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/product-updates", tags=["product-updates"])


def _apply_approaching_flag(item, today: date) -> ProductUpdateResponse:
    """Convert a DB model instance to a response schema with the approaching_release flag set."""
    response = ProductUpdateResponse.model_validate(item)
    response.approaching_release = (
        item.planned_release_date is not None
        and item.status != ProductUpdateStatus.completed
        and 0 <= (item.planned_release_date - today).days <= 3
    )
    return response


@router.get("/", response_model=PaginatedResponse[ProductUpdateResponse])
async def list_product_updates(
    status: Optional[ProductUpdateStatus] = Query(None),
    product: Optional[str] = Query(None),
    assigned_to: Optional[int] = Query(None, alias="assigned_to"),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    items, total = await svc.get_list(
        db=db,
        status=status,
        product=product,
        assigned_to_id=assigned_to,
        date_from=date_from,
        date_to=date_to,
        q=q,
        page=page,
        per_page=per_page,
    )
    today = date.today()
    response_items = [_apply_approaching_flag(item, today) for item in items]
    return PaginatedResponse[ProductUpdateResponse](
        items=response_items,
        total=total,
        page=page,
        per_page=per_page,
    )


@router.post(
    "/",
    response_model=ProductUpdateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_product_update(
    payload: ProductUpdateCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("delivery_manager", "admin")),
):
    item = await svc.create(db=db, data=payload, created_by_id=current_user.id)
    return _apply_approaching_flag(item, date.today())


@router.get("/{item_id}", response_model=ProductUpdateResponse)
async def get_product_update(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    item = await svc.get_by_id(db, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Product update not found")
    return _apply_approaching_flag(item, date.today())


@router.put("/{item_id}", response_model=ProductUpdateResponse)
async def update_product_update(
    item_id: int,
    payload: ProductUpdateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("delivery_manager", "admin")),
):
    item = await svc.update(db=db, item_id=item_id, data=payload, current_user=current_user)
    if item is None:
        raise HTTPException(status_code=404, detail="Product update not found")
    return _apply_approaching_flag(item, date.today())


@router.patch("/{item_id}/status", response_model=ProductUpdateResponse)
async def update_product_update_status(
    item_id: int,
    payload: ProductUpdateStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("delivery_manager", "admin")),
):
    item = await svc.update_status(
        db=db,
        item_id=item_id,
        new_status=payload.status,
        current_user=current_user,
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Product update not found")
    return _apply_approaching_flag(item, date.today())


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product_update(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    item = await svc.get_by_id(db, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Product update not found")
    await svc.delete(db=db, item_id=item_id)


@router.post(
    "/{item_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_comment(
    item_id: int,
    payload: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("delivery_manager", "admin")),
):
    item = await svc.get_by_id(db, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Product update not found")
    comment = await svc.add_comment(
        db=db,
        item_id=item_id,
        body=payload.body,
        author_id=current_user.id,
    )
    return comment


@router.get("/{item_id}/comments", response_model=List[CommentResponse])
async def list_comments(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    item = await svc.get_by_id(db, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Product update not found")
    return await svc.get_comments(db=db, item_id=item_id)
