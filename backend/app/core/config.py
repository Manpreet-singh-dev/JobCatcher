from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    APP_URL: str = "http://localhost:3000"
    API_URL: str = "http://localhost:8000"
    SECRET_KEY: str = "change-me-in-production"
    ENVIRONMENT: str = "development"

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/applyiq"
    REDIS_URL: str = "redis://localhost:6379/0"

    ANTHROPIC_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    SENDGRID_API_KEY: Optional[str] = None
    FROM_EMAIL: str = "noreply@applyiq.com"

    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None

    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_S3_BUCKET: Optional[str] = None
    AWS_REGION: str = "ap-south-1"

    RAPIDAPI_KEY: Optional[str] = None

    PROXY_URL: Optional[str] = None
    SENTRY_DSN: Optional[str] = None

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    ALGORITHM: str = "HS256"

    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    @property
    def async_database_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url


settings = Settings()
