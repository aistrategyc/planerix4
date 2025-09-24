from __future__ import annotations

import os, re, json
from typing import Optional, List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator, ValidationInfo


class Settings(BaseSettings):
    # ---- App ----
    PROJECT_NAME: str = "Liderix API"
    PROJECT_VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production")
    DEBUG: bool = False
    LOG_LEVEL: str = "info"
    API_PREFIX: str = "/api"

    # ---- CORS ----
    CORS_ALLOW_ORIGINS: Union[str, List[str]] = "*"
    CORS_ALLOW_METHODS: Union[str, List[str]] = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
    CORS_ALLOW_HEADERS: Union[str, List[str]] = ["*"]
    CORS_ALLOW_CREDENTIALS: bool = True
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # ---- Redis ----
    REDIS_URL: Optional[str] = None

    # ---- Security / JWT ----
    # ---- Refresh cookie settings ----
    REFRESH_COOKIE_NAME: str = os.getenv("REFRESH_COOKIE_NAME", "lrx_refresh")
    # строковые true/false -> bool
    REFRESH_COOKIE_SECURE: bool = str(os.getenv("REFRESH_COOKIE_SECURE", "true")).lower() in ("1","true","yes")
    # none|lax|strict -> приводим к нижнему регистру
    REFRESH_COOKIE_SAMESITE: str | None = (os.getenv("REFRESH_COOKIE_SAMESITE", "none") or "none").lower()

    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret")
    ACCESS_TOKEN_SECRET: Optional[str] = None
    JWT_ALGORITHM: str = "HS256"
    JWT_AUDIENCE: Optional[str] = None
    JWT_ISSUER: Optional[str] = None
    ACCESS_TTL_SEC: int = int(os.getenv("ACCESS_TTL_SEC", "900"))
    REFRESH_TTL_SEC: int = int(os.getenv("REFRESH_TTL_SEC", "2592000"))
    REFRESH_COOKIE_NAME: str = os.getenv("REFRESH_COOKIE_NAME", "lrx_refresh")

    # ---- Email ----
    RESEND_API_KEY: Optional[str] = None
    EMAIL_FROM: Optional[str] = None
    # --- Email / SMTP ---
    EMAIL_PROVIDER: str = os.getenv("EMAIL_PROVIDER", "smtp")
    DEFAULT_FROM_EMAIL: Optional[str] = os.getenv("DEFAULT_FROM_EMAIL") or os.getenv("EMAIL_FROM")
    SMTP_HOST: Optional[str] = os.getenv("SMTP_HOST")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: Optional[str] = os.getenv("SMTP_USERNAME")
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD")
    SMTP_TLS: bool = str(os.getenv("SMTP_TLS", "true")).lower() in ("1","true","yes")
    SMTP_SSL: bool = str(os.getenv("SMTP_SSL", "false")).lower() in ("1","true","yes")

    RESEND_FROM: Optional[str] = None
    CONTACT_TO: Optional[str] = None

    # ---- Primary DB (Liderix) ----
    LIDERIX_DB_URL: Optional[str] = None
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "postgres")
    POSTGRES_PORT: int = int(os.getenv("POSTGRES_PORT", "5432"))
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "liderixapp")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "manfromlamp")
    POSTGRES_PASSWORD: Optional[str] = os.getenv("POSTGRES_PASSWORD")

    # ---- External read-only client DB (ITSTEP) ----
    ITSTEP_DB_URL: Optional[str] = None

    model_config = SettingsConfigDict(
        case_sensitive=False,
        extra="ignore",
        env_file=None,
    )

    # ---- Helpers for CORS parsing ----
    @staticmethod
    def _parse_listish(value: Union[str, List[str]]) -> List[str]:
        if isinstance(value, list):
            return [str(x) for x in value]
        s = (value or "").strip()
        if s == "" or s == "*":
            return ["*"]
        try:
            arr = json.loads(s)
            if isinstance(arr, list):
                return [str(x) for x in arr]
        except Exception:
            pass
        return [p.strip() for p in s.split(",") if p.strip()]

    @field_validator("CORS_ALLOW_ORIGINS", mode="before")
    @classmethod
    def _val_cors_origins(cls, v):
        return cls._parse_listish(v)

    @field_validator("CORS_ALLOW_METHODS", mode="before")
    @classmethod
    def _val_cors_methods(cls, v):
        return cls._parse_listish(v)

    @field_validator("CORS_ALLOW_HEADERS", mode="before")
    @classmethod
    def _val_cors_headers(cls, v):
        return cls._parse_listish(v)

    # ---- Compose DB URL (prod: можно без явного пароля в переменной LIDERIX_DB_URL) ----
    @field_validator("LIDERIX_DB_URL", mode="before")
    @classmethod
    def _build_db_url(cls, v, info: ValidationInfo):
        data = getattr(info, "data", {}) or {}
        env = (data.get("ENVIRONMENT") or os.getenv("ENVIRONMENT") or "production").lower()

        # Если явно задано — принять, но в prod запретим пароль в явном URL
        if v:
            if env == "production" and re.search(r"://[^:@/]+:[^@]+@", str(v)):
                raise ValueError("В продакшене БД URL не должен содержать пароль в открытом виде")
            return v

        # Собирать из POSTGRES_* (это допустимо и в prod)
        user = data.get("POSTGRES_USER") or os.getenv("POSTGRES_USER")
        pwd  = data.get("POSTGRES_PASSWORD") or os.getenv("POSTGRES_PASSWORD")
        host = data.get("POSTGRES_HOST") or os.getenv("POSTGRES_HOST", "postgres")
        port = data.get("POSTGRES_PORT") or os.getenv("POSTGRES_PORT", "5432")
        db   = data.get("POSTGRES_DB") or os.getenv("POSTGRES_DB")

        if user and host and db:
            pwd_part = f":{pwd}" if pwd else ""
            return f"postgresql+asyncpg://{user}{pwd_part}@{host}:{port}/{db}"

        raise ValueError("Не удалось собрать строку подключения к БД: задайте POSTGRES_* или LIDERIX_DB_URL")


settings = Settings()
