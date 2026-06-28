from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.schemas.common import PaginatedResponse
from app.services import search_service

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/")
async def search(
    q: Optional[str] = Query(None, description="Search query"),
    type: Optional[str] = Query(
        None, description="implementation|change_request|product_update"
    ),
    status: Optional[str] = Query(None),
    venue: Optional[str] = Query(None),
    product: Optional[str] = Query(None),
    assigned_to: Optional[int] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    results, total = await search_service.search(
        db,
        q=q,
        item_type=type,
        status=status,
        venue=venue,
        product=product,
        assigned_to_id=assigned_to,
        date_from=date_from,
        date_to=date_to,
        page=page,
        per_page=per_page,
    )
    pages = (total + per_page - 1) // per_page
    return {
        "items": [r.model_dump() for r in results],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages,
    }
