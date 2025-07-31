from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from fastapi import Depends
from typing import AsyncGenerator

from liderix_api.config import settings

# 🎯 Основной URL БД загружается из .env
DATABASE_URL = settings.LIDERIX_DB_URL

# 🎯 Базовый класс для core-моделей
class Base(DeclarativeBase):
    pass

# ⚙️ Создание движка и асинхронной сессии
engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
MainAsyncSession = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# 📥 Зависимость FastAPI
async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with MainAsyncSession() as session:
        yield session