from pydantic_settings import BaseSettings
from pydantic import computed_field


class Settings(BaseSettings):
    APP_NAME: str = "DeliveryFlow API"
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/deliveryflow"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/google/callback"
    STALE_DAYS_THRESHOLD: int = 7
    FRONTEND_URL: str = "http://localhost:3000"

    @computed_field
    @property
    def CORS_ORIGINS(self) -> list[str]:
        return [self.FRONTEND_URL, "http://localhost:3000", "http://localhost:3001"]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
