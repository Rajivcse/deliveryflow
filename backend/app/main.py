import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.config import settings
from app.exceptions import register_exception_handlers

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background scheduler
    from app.jobs.stale_checker import daily_stale_check
    from app.database import AsyncSessionLocal
    scheduler.add_job(
        daily_stale_check,
        "cron",
        hour=2,
        minute=0,
        args=[AsyncSessionLocal],
        id="stale_checker",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started")
    yield
    scheduler.shutdown()
    logger.info("Scheduler stopped")


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Internal delivery tracking system for Delivery Managers and Product Managers",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "service": "deliveryflow-api"}


from app.routers import auth, implementations, change_requests, product_updates, dashboard, search, reports, users

app.include_router(auth.router, prefix="/api/v1")
app.include_router(implementations.router, prefix="/api/v1")
app.include_router(change_requests.router, prefix="/api/v1")
app.include_router(product_updates.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(search.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
