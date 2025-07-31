from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Конфигурация
from liderix_api.config import settings

# Основные роутеры (из основной БД)
from liderix_api.routes import (
    users as users_router,
    client as client_router,
    projects as projects_router,
    tasks as tasks_router,
    okrs as okrs_router,
    kpis as kpis_router,
    auth as auth_router,
    analytics as analytics_router,
)

# Роутеры из клиентской базы данных
from liderix_api.routes.dashboard import overview as dashboard_router
from liderix_api.routes.analytics import sales as sales_router

# ✅ Новый роут для инсайтов (APIRouter)
from liderix_api.routes.insights.sales.route import router as insights_sales_router

# Создание приложения
app = FastAPI()

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Уточни в проде
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Подключения к БД ---

# Основная (Liderix)
engine_liderix = create_async_engine(settings.LIDERIX_DB_URL, echo=False, pool_pre_ping=True)
SessionLiderix = sessionmaker(engine_liderix, class_=AsyncSession, expire_on_commit=False)

# Клиентская (ITStep)
engine_itstep = create_async_engine(settings.ITSTEP_DB_URL, echo=False, pool_pre_ping=True)
SessionItstep = sessionmaker(engine_itstep, class_=AsyncSession, expire_on_commit=False)

# --- Прогрев соединений ---
@app.on_event("startup")
async def on_startup():
    async with engine_liderix.begin() as conn:
        await conn.run_sync(lambda conn: None)
    async with engine_itstep.begin() as conn:
        await conn.run_sync(lambda conn: None)

# --- Зависимости для FastAPI DI ---
async def get_liderix_session() -> AsyncSession:
    async with SessionLiderix() as session:
        yield session

async def get_itstep_session() -> AsyncSession:
    async with SessionItstep() as session:
        yield session

# --- Health-check ---
@app.get("/health")
async def health_check():
    return {"status": "ok"}

# --- Подключение роутеров ---

# Основная БД
app.include_router(users_router.router, prefix="/api/users", tags=["Users"], dependencies=[Depends(get_liderix_session)])
app.include_router(client_router.router, prefix="/api/clients", tags=["Clients"], dependencies=[Depends(get_liderix_session)])
app.include_router(projects_router.router, prefix="/api/projects", tags=["Projects"], dependencies=[Depends(get_liderix_session)])
app.include_router(tasks_router.router, prefix="/api/tasks", tags=["Tasks"], dependencies=[Depends(get_liderix_session)])
app.include_router(okrs_router.router, prefix="/api/okrs", tags=["OKRs"], dependencies=[Depends(get_liderix_session)])
app.include_router(kpis_router.router, prefix="/api/kpis", tags=["KPIs"], dependencies=[Depends(get_liderix_session)])
app.include_router(auth_router.router, prefix="/api/auth", tags=["Auth"], dependencies=[Depends(get_liderix_session)])
app.include_router(analytics_router.router, prefix="/api/analytics", tags=["Analytics"], dependencies=[Depends(get_liderix_session)])

# Клиентская БД
app.include_router(dashboard_router.router, prefix="/api/dashboard", tags=["Dashboard"], dependencies=[Depends(get_itstep_session)])
app.include_router(analytics_router.router, prefix="/api/analytics", tags=["Analytics"])
# ✅ Инсайты (прямое подключение APIRouter)
app.include_router(
    insights_sales_router,
    prefix="/api/insights/sales",
    tags=["AI Insights"]
)