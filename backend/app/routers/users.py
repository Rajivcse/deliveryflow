from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_role
from app.exceptions import ConflictError, NotFoundError
from app.models.user import UserRole
from app.schemas.common import PaginatedResponse
from app.schemas.user import AdminUserCreate, AdminUserResponse, AdminUserUpdate
from app.services import user_service

router = APIRouter(prefix="/admin/users", tags=["admin"])


@router.get("/", response_model=PaginatedResponse[AdminUserResponse])
async def list_users(
    q: Optional[str] = Query(None),
    role: Optional[UserRole] = Query(None),
    is_active: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    users, total = await user_service.get_list(
        db, q=q, role=role, is_active=is_active, page=page, per_page=per_page
    )
    pages = (total + per_page - 1) // per_page
    return PaginatedResponse(items=users, total=total, page=page, per_page=per_page, pages=pages)


@router.post("/", response_model=AdminUserResponse, status_code=201)
async def create_user(
    data: AdminUserCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    try:
        user = await user_service.create(db, data)
    except ConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return user


@router.get("/{user_id}", response_model=AdminUserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    user = await user_service.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: int,
    data: AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    try:
        user = await user_service.update(db, user_id, data)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/{user_id}/revoke-sessions", status_code=204)
async def revoke_sessions(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    user = await user_service.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await user_service.revoke_all_sessions(db, user_id)


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    try:
        await user_service.delete(db, user_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="User not found")
