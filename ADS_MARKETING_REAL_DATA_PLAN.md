# План обновления страниц /ads и /marketing реальными данными

## Текущее состояние

### Проблема
- Страница `/ads` использует MOCK DATA (mockAds, строки 104-213)
- Страница `/marketing` использует MOCK DATA (mockCampaigns, строки 83-158)
- Нет подключения к реальной базе данных `itstep_final` на сервере 92.242.60.211

### Доступные данные в itstep_final

#### 1. Таблица `raw.fb_ad_insights` - Реклама Facebook
**Структура**:
- `ad_id`, `ad_name` - ID и название рекламы
- `campaign_id`, `adset_id` - Связь с кампанией
- `impressions`, `clicks`, `spend` - Метрики
- `date_start`, `date_stop` - Период

**Пример данных** (топ 10 объявлений по spend с 01.09.2025):
```
ad_id: 120233386033230479
ad_name: роблокс
campaign: ДС Roblox + Анімація / вересень ГЛ
impressions: 1,542,307
clicks: 11,639
spend: ₴4,997.25
CTR: 0.75%
CPC: ₴0.43
```

#### 2. Таблица `dashboards.campaign_reference` - Справочник кампаний
**Структура**:
- `campaign_id`, `campaign_name` - ID и название
- `platform` - Платформа (google/meta)

#### 3. View `dashboards.v5_leads_campaign_daily` - Метрики по дням
**Данные**:
- Impressions, clicks, spend, leads по дням
- CPL, CTR рассчитываются

**Пример данных** (топ 7 кампаний по spend):
```
Campaign: Performance Max - ПКО 2025 (Google)
  - Spend: ₴12,437.89
  - Leads: 28
  - CPL: ₴444.21
  - Impressions: 33,066
  - Clicks: 1,032
  - CTR: 3.12%
```

## Задачи

### Этап 1: Backend API (apps/api/)

#### 1.1. Создать подключение к itstep_final БД

**Файл**: `apps/api/liderix_api/db/itstep_connection.py`
```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os

ITSTEP_DB_URL = os.getenv(
    "ITSTEP_DB_URL",
    "postgresql+asyncpg://manfromlamp:lashd87123kKJSDAH81@92.242.60.211:5432/itstep_final"
)

itstep_engine = create_async_engine(ITSTEP_DB_URL, pool_pre_ping=True)
ItstepAsyncSessionLocal = sessionmaker(
    itstep_engine, class_=AsyncSession, expire_on_commit=False
)

async def get_itstep_session():
    async with ItstepAsyncSessionLocal() as session:
        yield session
```

#### 1.2. Создать Pydantic схемы

**Файл**: `apps/api/liderix_api/schemas/ads.py`
```python
from pydantic import BaseModel
from typing import Optional, Literal
from datetime import date

class AdMetrics(BaseModel):
    impressions: int
    clicks: int
    spend: float
    ctr: float
    cpc: float
    conversions: Optional[int] = 0
    cpa: Optional[float] = 0
    roas: Optional[float] = 0

class AdRead(BaseModel):
    ad_id: str
    ad_name: str
    campaign_id: str
    campaign_name: Optional[str]
    platform: Literal['google', 'meta'] = 'meta'
    type: Literal['search', 'display', 'video', 'shopping', 'social'] = 'social'
    status: Literal['active', 'paused', 'draft', 'expired'] = 'active'
    metrics: AdMetrics
    date_start: date
    date_stop: date

class CampaignMetrics(BaseModel):
    impressions: int
    clicks: int
    spend: float
    leads: int
    cpl: float
    ctr: float
    conversions: Optional[int] = 0
    roas: Optional[float] = 0

class CampaignRead(BaseModel):
    campaign_id: str
    campaign_name: str
    platform: Literal['google', 'meta']
    type: Literal['email', 'social', 'ppc', 'content', 'seo'] = 'ppc'
    status: Literal['draft', 'active', 'paused', 'completed'] = 'active'
    days_active: int
    metrics: CampaignMetrics
    budget: Optional[float] = 0
    target_audience: Optional[str] = ""
```

#### 1.3. Создать эндпоинты для Ads

**Файл**: `apps/api/liderix_api/routes/ads.py`
```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List
from datetime import date, timedelta

from ..db.itstep_connection import get_itstep_session
from ..schemas.ads import AdRead, AdMetrics
from ..core.auth import get_current_user

router = APIRouter(prefix="/ads", tags=["ads"])

@router.get("", response_model=List[AdRead])
async def get_ads(
    date_from: date = Query(default=date.today() - timedelta(days=30)),
    date_to: date = Query(default=date.today()),
    platform: str = Query(default="all"),
    limit: int = Query(default=50),
    session: AsyncSession = Depends(get_itstep_session),
    current_user = Depends(get_current_user)
):
    """Получить список рекламных объявлений из itstep_final"""

    platform_filter = ""
    if platform != "all":
        platform_filter = f"AND c.platform = '{platform}'"

    query = text(f"""
        SELECT
          fb.ad_id,
          fb.ad_name,
          fb.campaign_id,
          c.campaign_name,
          c.platform,
          MIN(fb.date_start) as date_start,
          MAX(fb.date_stop) as date_stop,
          SUM(fb.impressions) as total_impressions,
          SUM(fb.clicks) as total_clicks,
          SUM(fb.spend) as total_spend,
          ROUND(SUM(fb.clicks)::numeric / NULLIF(SUM(fb.impressions), 0) * 100, 2) as ctr,
          ROUND(SUM(fb.spend) / NULLIF(SUM(fb.clicks), 0), 2) as cpc
        FROM raw.fb_ad_insights fb
        LEFT JOIN dashboards.campaign_reference c ON fb.campaign_id = c.campaign_id
        WHERE fb.date_start >= :date_from
          AND fb.date_start <= :date_to
          {platform_filter}
        GROUP BY fb.ad_id, fb.ad_name, fb.campaign_id, c.campaign_name, c.platform
        ORDER BY total_spend DESC
        LIMIT :limit
    """)

    result = await session.execute(
        query,
        {"date_from": date_from, "date_to": date_to, "limit": limit}
    )
    rows = result.fetchall()

    ads = []
    for row in rows:
        ads.append(AdRead(
            ad_id=row.ad_id,
            ad_name=row.ad_name,
            campaign_id=row.campaign_id,
            campaign_name=row.campaign_name,
            platform=row.platform if row.platform else 'meta',
            type='social',
            status='active',
            metrics=AdMetrics(
                impressions=row.total_impressions,
                clicks=row.total_clicks,
                spend=float(row.total_spend),
                ctr=float(row.ctr) if row.ctr else 0,
                cpc=float(row.cpc) if row.cpc else 0
            ),
            date_start=row.date_start,
            date_stop=row.date_stop
        ))

    return ads

@router.get("/stats")
async def get_ads_stats(
    date_from: date = Query(default=date.today() - timedelta(days=30)),
    date_to: date = Query(default=date.today()),
    session: AsyncSession = Depends(get_itstep_session),
    current_user = Depends(get_current_user)
):
    """Получить статистику по рекламе"""

    query = text("""
        SELECT
          COUNT(DISTINCT ad_id) as total_ads,
          COUNT(DISTINCT campaign_id) as total_campaigns,
          SUM(impressions) as total_impressions,
          SUM(clicks) as total_clicks,
          SUM(spend) as total_spend,
          ROUND(SUM(clicks)::numeric / NULLIF(SUM(impressions), 0) * 100, 2) as avg_ctr,
          ROUND(SUM(spend) / NULLIF(SUM(clicks), 0), 2) as avg_cpc
        FROM raw.fb_ad_insights
        WHERE date_start >= :date_from
          AND date_start <= :date_to
    """)

    result = await session.execute(query, {"date_from": date_from, "date_to": date_to})
    row = result.fetchone()

    return {
        "total_ads": row.total_ads or 0,
        "total_campaigns": row.total_campaigns or 0,
        "total_impressions": row.total_impressions or 0,
        "total_clicks": row.total_clicks or 0,
        "total_spend": float(row.total_spend) if row.total_spend else 0,
        "avg_ctr": float(row.avg_ctr) if row.avg_ctr else 0,
        "avg_cpc": float(row.avg_cpc) if row.avg_cpc else 0
    }
```

#### 1.4. Создать эндпоинты для Campaigns

**Файл**: `apps/api/liderix_api/routes/campaigns.py`
```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List
from datetime import date, timedelta

from ..db.itstep_connection import get_itstep_session
from ..schemas.ads import CampaignRead, CampaignMetrics
from ..core.auth import get_current_user

router = APIRouter(prefix="/campaigns", tags=["campaigns"])

@router.get("", response_model=List[CampaignRead])
async def get_campaigns(
    date_from: date = Query(default=date.today() - timedelta(days=30)),
    date_to: date = Query(default=date.today()),
    platform: str = Query(default="all"),
    limit: int = Query(default=50),
    session: AsyncSession = Depends(get_itstep_session),
    current_user = Depends(get_current_user)
):
    """Получить список маркетинговых кампаний"""

    platform_filter = ""
    if platform != "all":
        platform_filter = f"AND c.platform = '{platform}'"

    query = text(f"""
        SELECT
          c.campaign_id,
          c.campaign_name,
          c.platform,
          COUNT(DISTINCT lc.dt) as days_active,
          SUM(lc.impressions) as total_impressions,
          SUM(lc.clicks) as total_clicks,
          SUM(lc.spend) as total_spend,
          SUM(lc.leads) as total_leads,
          ROUND(SUM(lc.spend) / NULLIF(SUM(lc.leads), 0), 2) as cpl,
          ROUND(SUM(lc.clicks)::numeric / NULLIF(SUM(lc.impressions), 0) * 100, 2) as ctr
        FROM dashboards.campaign_reference c
        JOIN dashboards.v5_leads_campaign_daily lc ON c.campaign_id = lc.campaign_id
        WHERE lc.dt >= :date_from
          AND lc.dt <= :date_to
          {platform_filter}
        GROUP BY c.campaign_id, c.campaign_name, c.platform
        ORDER BY total_spend DESC
        LIMIT :limit
    """)

    result = await session.execute(
        query,
        {"date_from": date_from, "date_to": date_to, "limit": limit}
    )
    rows = result.fetchall()

    campaigns = []
    for row in rows:
        campaigns.append(CampaignRead(
            campaign_id=row.campaign_id,
            campaign_name=row.campaign_name,
            platform=row.platform,
            type='ppc',
            status='active',
            days_active=row.days_active,
            metrics=CampaignMetrics(
                impressions=row.total_impressions,
                clicks=row.total_clicks,
                spend=float(row.total_spend),
                leads=row.total_leads,
                cpl=float(row.cpl) if row.cpl else 0,
                ctr=float(row.ctr) if row.ctr else 0
            )
        ))

    return campaigns
```

#### 1.5. Зарегистрировать роуты

**Файл**: `apps/api/liderix_api/main.py`
```python
# Добавить импорты
from .routes import ads, campaigns

# Зарегистрировать роутеры
app.include_router(ads.router, prefix="/api")
app.include_router(campaigns.router, prefix="/api")
```

### Этап 2: Frontend (apps/web-enterprise/)

#### 2.1. Создать API клиент

**Файл**: `apps/web-enterprise/src/lib/api/ads.ts`
```typescript
import { apiClient } from './client'

export interface AdMetrics {
  impressions: number
  clicks: number
  spend: number
  ctr: number
  cpc: number
  conversions?: number
  cpa?: number
  roas?: number
}

export interface Ad {
  ad_id: string
  ad_name: string
  campaign_id: string
  campaign_name?: string
  platform: 'google' | 'meta'
  type: 'search' | 'display' | 'video' | 'shopping' | 'social'
  status: 'active' | 'paused' | 'draft' | 'expired'
  metrics: AdMetrics
  date_start: string
  date_stop: string
}

export const AdsAPI = {
  async getAds(params: {
    date_from?: string
    date_to?: string
    platform?: string
    limit?: number
  } = {}): Promise<Ad[]> {
    const response = await apiClient.get('/api/ads', { params })
    return response.data
  },

  async getStats(params: {
    date_from?: string
    date_to?: string
  } = {}): Promise<{
    total_ads: number
    total_campaigns: number
    total_impressions: number
    total_clicks: number
    total_spend: number
    avg_ctr: number
    avg_cpc: number
  }> {
    const response = await apiClient.get('/api/ads/stats', { params })
    return response.data
  }
}

export interface CampaignMetrics {
  impressions: number
  clicks: number
  spend: number
  leads: number
  cpl: number
  ctr: number
  conversions?: number
  roas?: number
}

export interface Campaign {
  campaign_id: string
  campaign_name: string
  platform: 'google' | 'meta'
  type: 'email' | 'social' | 'ppc' | 'content' | 'seo'
  status: 'draft' | 'active' | 'paused' | 'completed'
  days_active: number
  metrics: CampaignMetrics
  budget?: number
  target_audience?: string
}

export const CampaignsAPI = {
  async getCampaigns(params: {
    date_from?: string
    date_to?: string
    platform?: string
    limit?: number
  } = {}): Promise<Campaign[]> {
    const response = await apiClient.get('/api/campaigns', { params })
    return response.data
  }
}
```

#### 2.2. Обновить страницу /ads

**Файл**: `apps/web-enterprise/src/app/ads/page.tsx`

Заменить:
- `mockAds` → `useEffect` с вызовом `AdsAPI.getAds()`
- Добавить состояние загрузки
- Добавить обработку ошибок
- Обновить интерфейс `Ad` под новую структуру

#### 2.3. Обновить страницу /marketing

**Файл**: `apps/web-enterprise/src/app/marketing/page.tsx`

Заменить:
- `mockCampaigns` → `useEffect` с вызовом `CampaignsAPI.getCampaigns()`
- Добавить фильтры по датам
- Обновить карточки под реальные метрики

### Этап 3: Деплой

1. Закоммитить все изменения
2. Пушнуть в planerix4
3. На сервере: `git pull && docker-compose up -d --build api web`
4. Проверить работу обоих страниц

## Ожидаемый результат

### После внедрения:

**Страница /ads**:
- Реальные объявления из Facebook (топ по spend)
- Метрики: impressions, clicks, spend, CTR, CPC
- Фильтры по платформе и датам
- Карточки с детальной информацией

**Страница /marketing**:
- Реальные кампании (Google + Meta)
- Метрики: impressions, clicks, spend, leads, CPL, CTR
- Статистика по дням активности
- Группировка по платформам

**Общее**:
- Данные обновляются в реальном времени из БД
- Работает для организации ITstep
- Защищено авторизацией

---

**Статус**: План готов к реализации
**Приоритет**: HIGH
**Время выполнения**: 4-6 часов
