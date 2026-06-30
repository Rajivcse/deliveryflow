import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.exceptions import NotFoundError
from app.models.change_request import CRSource, CRStatus, Priority
from app.schemas.change_request import (
    ChangeRequestCreate,
    ChangeRequestResponse,
    ChangeRequestUpdate,
    CommentCreate,
    CommentResponse,
    CRStatusUpdate,
)
from app.schemas.common import PaginatedResponse
from app.schemas.status_history import StatusHistoryResponse
from app.services import change_request_service as cr_service, status_history_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/change-requests", tags=["change-requests"])


@router.get("/", response_model=PaginatedResponse[ChangeRequestResponse])
async def list_change_requests(
    status: Optional[CRStatus] = Query(default=None),
    priority: Optional[Priority] = Query(default=None),
    product: Optional[str] = Query(default=None),
    venue: Optional[str] = Query(default=None),
    source: Optional[CRSource] = Query(default=None),
    assigned_to: Optional[int] = Query(default=None),
    date_from: Optional[datetime] = Query(default=None),
    date_to: Optional[datetime] = Query(default=None),
    q: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, total = await cr_service.get_list(
        db=db,
        status=status,
        priority=priority,
        product=product,
        venue=venue,
        source=source,
        assigned_to_id=assigned_to,
        date_from=date_from,
        date_to=date_to,
        q=q,
        page=page,
        per_page=per_page,
    )
    return PaginatedResponse(items=items, total=total, page=page, per_page=per_page)


@router.post("/", response_model=ChangeRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_change_request(
    data: ChangeRequestCreate,
    current_user=Depends(require_role("delivery_manager", "admin")),
    db: AsyncSession = Depends(get_db),
):
    item = await cr_service.create(db=db, data=data, created_by_id=current_user.id)
    return item


@router.get("/{item_id}", response_model=ChangeRequestResponse)
async def get_change_request(
    item_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    item = await cr_service.get_by_id(db=db, item_id=item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Change request not found")
    return item


@router.put("/{item_id}", response_model=ChangeRequestResponse)
async def update_change_request(
    item_id: int,
    data: ChangeRequestUpdate,
    current_user=Depends(require_role("delivery_manager", "admin")),
    db: AsyncSession = Depends(get_db),
):
    try:
        item = await cr_service.update(db=db, item_id=item_id, data=data, current_user=current_user)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Change request not found")
    return item


@router.patch("/{item_id}/status", response_model=ChangeRequestResponse)
async def update_change_request_status(
    item_id: int,
    data: CRStatusUpdate,
    current_user=Depends(require_role("delivery_manager", "admin")),
    db: AsyncSession = Depends(get_db),
):
    try:
        item = await cr_service.update_status(
            db=db,
            item_id=item_id,
            new_status=data.status,
            current_user=current_user,
            notes=data.notes,
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Change request not found")
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_change_request(
    item_id: int,
    current_user=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    try:
        await cr_service.delete(db=db, item_id=item_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Change request not found")


@router.post(
    "/{item_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_comment(
    item_id: int,
    data: CommentCreate,
    current_user=Depends(require_role("delivery_manager", "admin")),
    db: AsyncSession = Depends(get_db),
):
    try:
        comment = await cr_service.add_comment(
            db=db,
            item_id=item_id,
            body=data.body,
            author_id=current_user.id,
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Change request not found")
    return comment


@router.get("/{item_id}/comments", response_model=List[CommentResponse])
async def list_comments(
    item_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    item = await cr_service.get_by_id(db=db, item_id=item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Change request not found")
    comments = await cr_service.get_comments(db=db, item_id=item_id)
    return comments


@router.get("/{item_id}/status-history", response_model=List[StatusHistoryResponse])
async def get_status_history(
    item_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entries = await status_history_service.get_history(db, "change_request", item_id)
    return [StatusHistoryResponse.model_validate(e) for e in entries]
