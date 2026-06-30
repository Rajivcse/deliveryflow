from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.status_history import StatusHistory


async def record(
    db: AsyncSession,
    item_type: str,
    item_id: int,
    old_status: str,
    new_status: str,
    changed_by_id: int,
    notes: str | None = None,
) -> StatusHistory:
    entry = StatusHistory(
        item_type=item_type,
        item_id=item_id,
        old_status=old_status,
        new_status=new_status,
        notes=notes,
        changed_by_id=changed_by_id,
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    return entry


async def get_history(
    db: AsyncSession,
    item_type: str,
    item_id: int,
) -> list[StatusHistory]:
    result = await db.execute(
        select(StatusHistory)
        .options(selectinload(StatusHistory.changed_by))
        .where(
            StatusHistory.item_type == item_type,
            StatusHistory.item_id == item_id,
        )
        .order_by(StatusHistory.changed_at.desc())
    )
    return list(result.scalars().all())
