from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "YES LMS API"
    app_env: Literal["development", "staging", "production"] = "development"
    debug: bool = False
    log_level: str = "INFO"

    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])

    database_url: str = "postgresql+asyncpg://lms:lms_dev_password@localhost:5432/lms"

    redis_url: str = "redis://localhost:6379/0"

    jwt_secret: str = "dev_secret_change_me_change_me_change_me_32"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 14

    bootstrap_superuser_email: str = "admin@yescenter.local"
    bootstrap_superuser_password: str = "change_me_immediately"

    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin_dev"
    s3_bucket: str = "lms-media"
    s3_region: str = "ru-central1"

    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "no-reply@yescenter.local"

    # LiveKit (existing self-hosted server)
    livekit_url: str = ""  # e.g. wss://livekit.innertalk.space
    livekit_api_key: str = ""
    livekit_api_secret: str = ""

    # Public base URL (used by frontend builds + email links)
    public_base_url: str = "http://localhost:5173"

    @property
    def database_url_sync(self) -> str:
        """Sync URL for Alembic offline mode."""
        return self.database_url.replace("+asyncpg", "+psycopg")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
