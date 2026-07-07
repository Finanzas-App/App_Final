from pydantic import field_validator
from pydantic_settings import BaseSettings


def _normalize_database_url(url: str) -> str:
    if url.startswith("postgresql://") and "+psycopg2" not in url:
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg2://", 1)
    return url


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg2://autofinance:autofinance123@localhost:5432/autofinance_db"
    SECRET_KEY: str = "autofinance-pro-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@autofinance.pro"
    SMTP_USE_TLS: bool = True
    OTP_EXPIRE_MINUTES: int = 5
    OTP_LENGTH: int = 6
    OTP_MAX_ATTEMPTS: int = 5
    DEMO_ACCESS_TOKEN_DAYS: int = 365

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        return _normalize_database_url(v)

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
