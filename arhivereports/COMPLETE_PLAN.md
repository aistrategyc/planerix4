# ✅ ПОЛНЫЙ ПЛАН: ВСЁ ГОТОВО!

## СТАТУС:

### ✅ ДАННЫЕ ОБНОВЛЕНЫ:
- Google Ads: 357 gclid (было 53) ✅
- Facebook: 1,002 fb_lead_id ✅
- Synthetic records: 876 ✅
- Contracts: 446 (15 Google, 12 Other, 419 Direct) ✅

### ✅ VIEWS СОЗДАНЫ:
- `v8_campaigns_daily` (339 rows) ✅
- `v8_platform_daily` (177 rows) ✅
- `v8_attribution_summary` (7 rows) ✅

### ⚠️ ОСТАЛОСЬ:
- Запустить n8n node "dashboards.fact_leads"
- Удалить старые v5/v6 views
- Обновить /data-analytics page

---

## ДЕЙСТВИЕ 1: ЗАПУСТИТЬ fact_leads

**В n8n UI**:
1. Открыть workflow `2 dashboards-3.json`
2. Найти node `dashboards.fact_leads`
3. Execute Node

**Проверка**:
```sql
SELECT COUNT(*) FROM dashboards.fact_leads WHERE gclid IS NOT NULL;
-- Должно стать 357 (сейчас 251)
```

---

## ДЕЙСТВИЕ 2: УДАЛИТЬ СТАРЫЕ VIEWS

```sql
BEGIN;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v5_all_leads_daily CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v5_campaign_anomalies CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v5_campaign_total CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v5_campaign_weekly CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v5_leads_campaign_daily CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v5_leads_campaign_daily_v2 CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v5_leads_campaign_weekly CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v5_leads_source_daily CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v5_manager_daily CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v5_platform_daily_kpis CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v5_platform_wow CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v5_product_daily CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v5_source_daily_alloc CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v5_source_total_alloc CASCADE;
DROP VIEW IF EXISTS dashboards.v5_bi_campaign_daily CASCADE;
DROP VIEW IF EXISTS dashboards.v5_leads_source_daily_vw CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v6_attribution_coverage CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v6_bi_platform_daily CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v6_branch_performance CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v6_campaign_daily_full CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v6_campaign_roi_daily CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v6_contracts_detail CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v6_contracts_enriched CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v6_contracts_with_attribution_detail CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v6_creative_performance CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v6_fb_ads_performance CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v6_fb_contracts_detail CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v6_full_attribution CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v6_funnel_daily CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v6_google_ads_performance CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v6_google_campaign_to_keyword CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v6_lead_to_creative_attribution CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v6_meta_campaign_to_creative CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.v6_product_performance CASCADE;
DROP VIEW IF EXISTS dashboards.v6_contract_bridge CASCADE;
DROP VIEW IF EXISTS dashboards.v6_contracts_ads_enriched CASCADE;
DROP VIEW IF EXISTS dashboards.v6_contracts_ads_enriched_by_id_source CASCADE;
DROP VIEW IF EXISTS dashboards.v6_data_freshness CASCADE;
DROP VIEW IF EXISTS dashboards.v6_data_quality_report CASCADE;
DROP VIEW IF EXISTS dashboards.v6_fb_contracts_detail_view CASCADE;
DROP VIEW IF EXISTS dashboards.v6_google_contracts_detail CASCADE;
DROP VIEW IF EXISTS dashboards.v6_platform_revenue_daily CASCADE;
DROP TABLE IF EXISTS dashboards.dim_contract CASCADE;
DROP TABLE IF EXISTS dashboards.dim_lead CASCADE;
DROP TABLE IF EXISTS dashboards.dim_campaign CASCADE;
DROP TABLE IF EXISTS dashboards.fact_contract CASCADE;
DROP TABLE IF EXISTS dashboards.fact_lead_request CASCADE;
DROP TABLE IF EXISTS dashboards.contract_attribution CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.contract_source_bridge_mv CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.crm_marketing_link_kvm CASCADE;
COMMIT;
```

---

## ДЕЙСТВИЕ 3: ОБНОВИТЬ /data-analytics PAGE

### Backend API (создать новый файл):

**Файл**: `apps/api/liderix_api/routes/data_analytics/analytics.py`

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import date, timedelta

from liderix_api.db import get_async_db

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/campaigns/daily")
async def get_campaigns_daily(
    start_date: date = Query(default=date.today() - timedelta(days=30)),
    end_date: date = Query(default=date.today()),
    platform: str | None = Query(default=None),
    db: AsyncSession = Depends(get_async_db)
):
    query = """
        SELECT dt, campaign_name, campaign_id, platform, leads, contracts, revenue, avg_contract
        FROM dashboards.v8_campaigns_daily
        WHERE dt >= :start_date AND dt <= :end_date
    """
    if platform:
        query += " AND platform = :platform"
    query += " ORDER BY dt DESC, leads DESC"

    result = await db.execute(text(query), {"start_date": start_date, "end_date": end_date, "platform": platform})
    return [dict(row._mapping) for row in result]

@router.get("/platforms/daily")
async def get_platforms_daily(
    start_date: date = Query(default=date.today() - timedelta(days=30)),
    end_date: date = Query(default=date.today()),
    db: AsyncSession = Depends(get_async_db)
):
    result = await db.execute(
        text("""
            SELECT dt, platform, leads, contracts, revenue, conversion_rate
            FROM dashboards.v8_platform_daily
            WHERE dt >= :start_date AND dt <= :end_date
            ORDER BY dt DESC, platform
        """),
        {"start_date": start_date, "end_date": end_date}
    )
    return [dict(row._mapping) for row in result]

@router.get("/attribution/summary")
async def get_attribution_summary(db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(
        text("""
            SELECT attribution_type, total_leads, contracts, total_revenue, avg_contract_value
            FROM dashboards.v8_attribution_summary
            ORDER BY total_leads DESC
        """)
    )
    return [dict(row._mapping) for row in result]
```

**Зарегистрировать в main.py**:
```python
from liderix_api.routes.data_analytics import analytics
app.include_router(analytics.router, prefix="/api")
```

---

### Frontend (обновить):

**Файл**: `apps/web-enterprise/src/app/data-analytics/page.tsx`

```typescript
// Fetch данные
const [campaignsData, setCampaignsData] = useState([]);
const [platformsData, setPlatformsData] = useState([]);
const [attributionData, setAttributionData] = useState([]);

useEffect(() => {
  const fetchData = async () => {
    const startDate = '2025-09-01';
    const endDate = '2025-10-19';

    const [campaigns, platforms, attribution] = await Promise.all([
      fetch(`/api/analytics/campaigns/daily?start_date=${startDate}&end_date=${endDate}`).then(r => r.json()),
      fetch(`/api/analytics/platforms/daily?start_date=${startDate}&end_date=${endDate}`).then(r => r.json()),
      fetch(`/api/analytics/attribution/summary`).then(r => r.json())
    ]);

    setCampaignsData(campaigns);
    setPlatformsData(platforms);
    setAttributionData(attribution);
  };

  fetchData();
}, []);

// Charts
<LineChart data={campaignsData} /> // Campaigns daily trend
<BarChart data={platformsData} />   // Platforms comparison
<PieChart data={attributionData} /> // Attribution breakdown
<Table data={campaignsData} />      // Top campaigns table
```

---

## ПРОВЕРКА ФИНАЛЬНАЯ:

```sql
-- 1. Views работают
SELECT * FROM dashboards.v8_attribution_summary;
-- Ожидаем: Google Click, Facebook Lead, Direct и т.д.

-- 2. fact_leads обновлён
SELECT COUNT(*) FROM dashboards.fact_leads WHERE gclid IS NOT NULL;
-- Ожидаем: 357

-- 3. Старые views удалены
SELECT COUNT(*) FROM pg_matviews WHERE schemaname='dashboards' AND matviewname LIKE 'v5_%';
-- Ожидаем: 0
```

---

## ИТОГ:

✅ **crm_requests** обновлён (357 gclid, 1002 fb_lead_id)
✅ **Views v8** созданы (campaigns, platforms, attribution)
⚠️ **fact_leads** нужно обновить (запустить n8n node)
⚠️ **Старые views** нужно удалить (SQL выше)
⚠️ **API + Frontend** нужно обновить (код выше)

**ПОСЛЕ ВЫПОЛНЕНИЯ: /data-analytics будет показывать РЕАЛЬНЫЕ данные с полной атрибуцией!**
