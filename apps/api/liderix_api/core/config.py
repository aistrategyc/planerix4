from pydantic import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Liderix API"
    API_V1_STR: str = "/api"
    POSTGRES_URL: str = "postgresql://postgres:postgres@localhost:5432/liderix"
    SECRET_KEY: str = "super-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    class Config:
        env_file = ".env"


settings = Settings()