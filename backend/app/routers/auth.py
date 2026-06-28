from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.google_oauth import (
    exchange_code_for_token,
    generate_state,
    get_google_oauth_url,
    get_google_user_info,
)
from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.schemas.auth import RefreshRequest, TokenResponse, UserResponse
from app.services.auth_service import (
    create_tokens,
    get_or_create_user,
    refresh_access_token,
    revoke_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/google")
async def google_login(response: Response):
    state = generate_state()
    url = get_google_oauth_url(state)
    redirect = RedirectResponse(url=url)
    redirect.set_cookie(
        key="oauth_state",
        value=state,
        httponly=True,
        samesite="lax",
        max_age=300,
    )
    return redirect


@router.get("/google/callback")
async def google_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
    oauth_state: str | None = Cookie(default=None),
):
    if not oauth_state or oauth_state != state:
        raise HTTPException(status_code=400, detail="Invalid OAuth state — possible CSRF")

    google_tokens = await exchange_code_for_token(code)
    google_user = await get_google_user_info(google_tokens["access_token"])

    user = await get_or_create_user(db, google_user)
    tokens = await create_tokens(db, user)

    frontend_url = settings.FRONTEND_URL
    redirect = RedirectResponse(
        url=f"{frontend_url}?access_token={tokens.access_token}&refresh_token={tokens.refresh_token}"
    )
    redirect.delete_cookie("oauth_state")
    return redirect


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(req: RefreshRequest, db: AsyncSession = Depends(get_db)):
    return await refresh_access_token(db, req.refresh_token)


@router.post("/logout", status_code=204)
async def logout(req: RefreshRequest, db: AsyncSession = Depends(get_db)):
    await revoke_token(db, req.refresh_token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user=Depends(get_current_user)):
    return current_user
