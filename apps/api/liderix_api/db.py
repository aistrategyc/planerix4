from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from typing import AsyncGenerator
from liderix_api.config.settings import settings

# 🎯 Базовый класс для core-моделей
class Base(DeclarativeBase):
    pass

# 🎯 === ОСНОВНАЯ БАЗА ДАННЫХ (LIDERIX) ===
# ⚙️ Создание асинхронного движка SQLAlchemy для основной БД
liderix_engine = create_async_engine(
    settings.LIDERIX_DB_URL,
    echo=False,
    pool_pre_ping=True,
)

# ⚙️ Создание асинхронной фабрики сессий для основной БД
LiderixAsyncSessionLocal = async_sessionmaker(
    bind=liderix_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# 📥 Зависимость для FastAPI — основная асинхронная сессия
async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with LiderixAsyncSessionLocal() as session:
        yield session

# 🎯 === АНАЛИТИЧЕСКАЯ БАЗА ДАННЫХ (ITSTEP) ===
# ⚙️ Создание асинхронного движка для аналитической БД
def get_itstep_db_url():
    """Построение URL для аналитической БД из компонентов"""
    if settings.ITSTEP_DB_URL:
        return settings.ITSTEP_DB_URL
    return f"postgresql+asyncpg://{settings.ITSTEP_DB_USER}:{settings.ITSTEP_DB_PASSWORD}@{settings.ITSTEP_DB_HOST}:{settings.ITSTEP_DB_PORT}/{settings.ITSTEP_DB_NAME}?ssl=false"

itstep_engine = create_async_engine(
    get_itstep_db_url(),
    echo=False,
    pool_pre_ping=True,
)

# ⚙️ Создание асинхронной фабрики сессий для аналитической БД
ItstepAsyncSessionLocal = async_sessionmaker(
    bind=itstep_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# 📥 Зависимость для FastAPI — аналитическая асинхронная сессия
async def get_itstep_session() -> AsyncGenerator[AsyncSession, None]:
    async with ItstepAsyncSessionLocal() as session:
        yield session