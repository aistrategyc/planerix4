# apps/api/liderix_api/db_client_itstep.py

from typing import AsyncGenerator, Callable
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from liderix_api.config import settings

# 🔹 URL клиентской БД (например, ITStep)
ITSTEP_DB_URL = settings.ITSTEP_DB_URL

# 🎓 Базовый класс моделей
class ClientBase(DeclarativeBase):
    pass

# 🔧 Движок и сессия (ITStep client DB)
engine_itstep = create_async_engine(ITSTEP_DB_URL, echo=False, pool_pre_ping=True)
SessionItstep = sessionmaker(engine_itstep, class_=AsyncSession, expire_on_commit=False)

# 📦 Dependency — стандартное подключение
async def get_client_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionItstep() as session:
        yield session

# 📦 Dependency по client_id (на будущее)
def get_client_session_by_client_id(client_id: str) -> Callable[[], AsyncGenerator[AsyncSession, None]]:
    async def _get_session() -> AsyncGenerator[AsyncSession, None]:
        async with SessionItstep() as session:
            yield session
    return _get_session