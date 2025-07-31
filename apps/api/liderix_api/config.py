from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    # 🔐 JWT
    SECRET_KEY: str = "supersecretkey"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24  # 1 день
    access_token_expire_minutes: int = 1440  # 👈 явно добавлено
    log_level: str = "info"  # 👈 явно добавлено

    # 🔧 Основная БД
    LIDERIX_DB_URL: str
    # 🔹 Клиентская БД ITStep
    ITSTEP_DB_URL: str

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "forbid"  # запрещает неизвестные переменные (по умолчанию)
    }

settings = Settings()