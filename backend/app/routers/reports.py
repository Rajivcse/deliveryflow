from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["reports"])

_XLSX_MEDIA = (
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
)
_CSV_MEDIA = "text/csv"


@router.get("/implementations")
async def export_implementations(
    format: str = Query("xlsx", pattern="^(xlsx|csv)$"),
    status: Optional[str] = Query(None),
    venue: Optional[str] = Query(None),
    assigned_to: Optional[int] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    items = await report_service.get_implementation_data(
        db,
        status=status,
        venue=venue,
        assigned_to_id=assigned_to,
        date_from=date_from,
        date_to=date_to,
    )
    rows = report_service.implementations_to_rows(items)
    headers = report_service.IMPLEMENTATION_HEADERS
    filename = f"implementations_{len(items)}_items"

    if format == "xlsx":
        data = report_service.generate_excel(headers, rows, "Implementations")
        return Response(
            content=data,
            media_type=_XLSX_MEDIA,
            headers={"Content-Disposition": f'attachment; filename="{filename}.xlsx"'},
        )
    data = report_service.generate_csv(headers, rows)
    return Response(
        content=data,
        media_type=_CSV_MEDIA,
        headers={"Content-Disposition": f'attachment; filename="{filename}.csv"'},
    )


@router.get("/change-requests")
async def export_change_requests(
    format: str = Query("xlsx", pattern="^(xlsx|csv)$"),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    product: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    items = await report_service.get_change_request_data(
        db,
        status=status,
        priority=priority,
        product=product,
        date_from=date_from,
        date_to=date_to,
    )
    rows = report_service.change_requests_to_rows(items)
    headers = report_service.CR_HEADERS
    filename = f"change_requests_{len(items)}_items"

    if format == "xlsx":
        data = report_service.generate_excel(headers, rows, "Change Requests")
        return Response(
            content=data,
            media_type=_XLSX_MEDIA,
            headers={"Content-Disposition": f'attachment; filename="{filename}.xlsx"'},
        )
    data = report_service.generate_csv(headers, rows)
    return Response(
        content=data,
        media_type=_CSV_MEDIA,
        headers={"Content-Disposition": f'attachment; filename="{filename}.csv"'},
    )


@router.get("/product-updates")
async def export_product_updates(
    format: str = Query("xlsx", pattern="^(xlsx|csv)$"),
    status: Optional[str] = Query(None),
    product: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    items = await report_service.get_product_update_data(
        db,
        status=status,
        product=product,
        date_from=date_from,
        date_to=date_to,
    )
    rows = report_service.product_updates_to_rows(items)
    headers = report_service.PU_HEADERS
    filename = f"product_updates_{len(items)}_items"

    if format == "xlsx":
        data = report_service.generate_excel(headers, rows, "Product Updates")
        return Response(
            content=data,
            media_type=_XLSX_MEDIA,
            headers={"Content-Disposition": f'attachment; filename="{filename}.xlsx"'},
        )
    data = report_service.generate_csv(headers, rows)
    return Response(
        content=data,
        media_type=_CSV_MEDIA,
        headers={"Content-Disposition": f'attachment; filename="{filename}.csv"'},
    )
