from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import ConflictError, NotFoundError
from app.models.user import RefreshToken, User, UserRole
from app.schemas.user import AdminUserCreate, AdminUserUpdate
from app.services.auth_service import hash_password


async def get_list(
    db: AsyncSession,
    q: Optional[str] = None,
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    page: int = 1,
    per_page: int = 20,
) -> tuple[list[User], int]:
    conditions = []

    if q:
        term = f"%{q}%"
        conditions.append(or_(User.full_name.ilike(term), User.email.ilike(term)))
    if role is not None:
        conditions.append(User.role == role)
    if is_active is not None:
        conditions.append(User.is_active == is_active)

    base = select(User)
    count_base = select(func.count(User.id))
    if conditions:
        where = and_(*conditions)
        base = base.where(where)
        count_base = count_base.where(where)

    count_result = await db.execute(count_base)
    total = count_result.scalar_one()

    stmt = base.order_by(User.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(stmt)
    return list(result.scalars().all()), total


async def get_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def create(db: AsyncSession, data: AdminUserCreate) -> User:
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise ConflictError("A user with this email already exists")

    user = User(
        email=data.email,
        full_name=data.full_name,
        password_hash=hash_password(data.password) if data.password else None,
        role=data.role,
        is_active=data.is_active,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def update(db: AsyncSession, user_id: int, data: AdminUserUpdate) -> User:
    user = await get_by_id(db, user_id)
    if not user:
        raise NotFoundError("User")

    if data.full_name is not None:
        user.full_name = data.full_name
    if data.role is not None:
        user.role = data.role
    if data.is_active is not None:
        user.is_active = data.is_active

    await db.flush()
    await db.refresh(user)
    return user


async def revoke_all_sessions(db: AsyncSession, user_id: int) -> None:
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked == False,  # noqa: E712
        )
    )
    tokens = result.scalars().all()
    for token in tokens:
        token.revoked = True
    await db.flush()


async def delete(db: AsyncSession, user_id: int) -> None:
    user = await get_by_id(db, user_id)
    if not user:
        raise NotFoundError("User")
    await db.delete(user)
    await db.flush()
