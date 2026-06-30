import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.schemas.common import PaginatedResponse
from app.schemas.status_history import StatusHistoryResponse
from app.schemas.venue_implementation import (
    CommentCreate,
    CommentResponse,
    ImplementationCreate,
    ImplementationResponse,
    ImplementationUpdate,
    StatusUpdate,
)
from app.services import implementation_service, status_history_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/implementations", tags=["implementations"])


@router.get("/", response_model=PaginatedResponse[ImplementationResponse])
async def list_implementations(
    status: Optional[str] = Query(None),
    venue: Optional[str] = Query(None),
    assigned_to: Optional[int] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    items, total = await implementation_service.get_list(
        db,
        status=status,
        venue=venue,
        assigned_to_id=assigned_to,
        date_from=date_from,
        date_to=date_to,
        q=q,
        page=page,
        per_page=per_page,
    )

    # Compute attention_required against a single threshold for the whole response
    threshold = datetime.now(timezone.utc) - timedelta(days=settings.STALE_DAYS_THRESHOLD)
    result_items = []
    for item in items:
        resp = ImplementationResponse.model_validate(item)
        last_updated = item.last_updated_at
        if last_updated.tzinfo is None:
            last_updated = last_updated.replace(tzinfo=timezone.utc)
        resp.attention_required = last_updated < threshold
        result_items.append(resp)

    pages = (total + per_page - 1) // per_page
    return PaginatedResponse(
        items=result_items, total=total, page=page, per_page=per_page, pages=pages
    )


@router.post("/", response_model=ImplementationResponse, status_code=201)
async def create_implementation(
    data: ImplementationCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("delivery_manager", "admin")),
):
    item = await implementation_service.create(db, data, current_user.id)
    return ImplementationResponse.model_validate(item)


@router.get("/{item_id}", response_model=ImplementationResponse)
async def get_implementation(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    item = await implementation_service.get_by_id(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Implementation not found")
    return ImplementationResponse.model_validate(item)


@router.put("/{item_id}", response_model=ImplementationResponse)
async def update_implementation(
    item_id: int,
    data: ImplementationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("delivery_manager", "admin")),
):
    item = await implementation_service.update(db, item_id, data, current_user)
    return ImplementationResponse.model_validate(item)


@router.patch("/{item_id}/status", response_model=ImplementationResponse)
async def update_status(
    item_id: int,
    data: StatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("delivery_manager", "admin")),
):
    item = await implementation_service.update_status(db, item_id, data.status, current_user, data.notes)
    return ImplementationResponse.model_validate(item)


@router.delete("/{item_id}", status_code=204)
async def delete_implementation(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    await implementation_service.delete(db, item_id)


@router.post("/{item_id}/comments", response_model=CommentResponse, status_code=201)
async def add_comment(
    item_id: int,
    data: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("delivery_manager", "admin")),
):
    comment = await implementation_service.add_comment(
        db, item_id, data.body, current_user.id
    )
    return CommentResponse.model_validate(comment)


@router.get("/{item_id}/comments", response_model=list[CommentResponse])
async def get_comments(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    comments = await implementation_service.get_comments(db, item_id)
    return [CommentResponse.model_validate(c) for c in comments]


@router.get("/{item_id}/status-history", response_model=list[StatusHistoryResponse])
async def get_status_history(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    entries = await status_history_service.get_history(db, "implementation", item_id)
    return [StatusHistoryResponse.model_validate(e) for e in entries]
