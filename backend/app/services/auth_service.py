import hashlib
from datetime import datetime, timedelta, timezone

from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func

from app.auth.jwt_handler import create_access_token, create_refresh_token
from app.config import settings
from app.exceptions import UnauthorizedError
from app.models.user import RefreshToken, User, UserRole
from app.schemas.auth import TokenResponse

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context.verify(plain, hashed)


async def get_or_create_user(db: AsyncSession, google_user_info: dict) -> User:
    email = google_user_info["email"]
    full_name = google_user_info.get("name", "")
    avatar_url = google_user_info.get("picture")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            email=email,
            full_name=full_name,
            avatar_url=avatar_url,
            role=UserRole.product_manager,
        )
        db.add(user)
    else:
        if not user.is_active:
            raise UnauthorizedError("Account is inactive. Contact your administrator.")
        if user.avatar_url != avatar_url:
            user.avatar_url = avatar_url

    user.last_login = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(user)
    return user


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def create_tokens(db: AsyncSession, user: User) -> TokenResponse:
    payload = {"sub": str(user.id), "role": user.role.value}

    access_token = create_access_token(payload)
    refresh_token_str = create_refresh_token(payload)

    token_hash = _hash_token(refresh_token_str)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    db_token = RefreshToken(
        user_id=user.id,
        token=token_hash,
        expires_at=expires_at,
        revoked=False,
    )
    db.add(db_token)
    await db.flush()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token_str,
        token_type="bearer",
    )


async def refresh_access_token(db: AsyncSession, refresh_token_str: str) -> TokenResponse:
    token_hash = _hash_token(refresh_token_str)

    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token == token_hash,
            RefreshToken.revoked == False,  # noqa: E712
            RefreshToken.expires_at > func.now(),
        )
    )
    db_token = result.scalar_one_or_none()

    if db_token is None:
        raise UnauthorizedError("Invalid or expired refresh token")

    user_result = await db.execute(select(User).where(User.id == db_token.user_id))
    user = user_result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise UnauthorizedError("User not found or inactive")

    # Revoke the old token
    db_token.revoked = True
    await db.flush()

    # Issue new token pair
    return await create_tokens(db, user)


async def revoke_token(db: AsyncSession, refresh_token_str: str) -> None:
    token_hash = _hash_token(refresh_token_str)

    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token == token_hash)
    )
    db_token = result.scalar_one_or_none()

    if db_token is not None:
        db_token.revoked = True
        await db.flush()


async def email_login(db: AsyncSession, email: str, password: str) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None or not user.password_hash or not verify_password(password, user.password_hash):
        raise UnauthorizedError("Invalid email or password")

    if not user.is_active:
        raise UnauthorizedError("Account is inactive. Contact your administrator.")

    user.last_login = datetime.now(timezone.utc)
    await db.flush()

    return await create_tokens(db, user)
