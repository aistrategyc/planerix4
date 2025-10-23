# ✅ ФИНАЛЬНЫЕ VIEWS И API ДЛЯ /data-analytics

## ТЕКУЩЕЕ СОСТОЯНИЕ:

### Покрытие данных:
- ✅ Google Ads: 357 gclid в crm_requests
- ✅ Facebook: 1,002 fb_lead_id в crm_requests
- ✅ Synthetic records: 876 (orphaned analytics)
- ✅ Total requests: 17,674
- ✅ Contracts: 446 (15 Google, 12 Other UTM, 419 Direct)

### Проблема:
- fact_leads НЕ ОБНОВЛЁН (251 gclid вместо 357)
- Нужно запустить n8n node "dashboards.fact_leads"

---

## СОЗДАННЫЕ VIEWS (v8):

### 1. v8_campaigns_daily
**Назначение**: Daily performance по всем кампаниям (Google + Meta)
**Поля**:
- dt (дата)
- campaign_name
- campaign_id
- platform (Google Ads / Meta / Direct)
- leads (количество)
- contracts
- revenue
- avg_contract

**SQL**:
```sql
SELECT * FROM dashboards.v8_campaigns_daily
WHERE dt >= CURRENT_DATE - 30
ORDER BY dt DESC, leads DESC;
```

---

### 2. v8_platform_daily
**Назначение**: KPI по платформам (Google, Meta, Other, Direct)
**Поля**:
- dt (дата)
- platform (Google Ads / Meta / Other Paid / Direct)
- leads
- contracts
- revenue
- conversion_rate (%)

**SQL**:
```sql
SELECT * FROM dashboards.v8_platform_daily
WHERE dt >= CURRENT_DATE - 30
ORDER BY dt DESC, platform;
```

---

### 3. v8_attribution_summary
**Назначение**: Общая статистика по источникам
**Поля**:
- attribution_type (Google Click / Facebook Lead / Direct и т.д.)
- total_leads
- contracts
- total_revenue
- avg_contract_value

**SQL**:
```sql
SELECT * FROM dashboards.v8_attribution_summary
ORDER BY total_leads DESC;
```

---

## API ENDPOINTS ДЛЯ /data-analytics

### Endpoint 1: GET /api/campaigns/daily
**Назначение**: График по кампаниям (daily breakdown)

```python
# apps/api/liderix_api/routes/data_analytics/campaigns.py

@router.get("/daily")
async def get_campaigns_daily(
    start_date: date = Query(default=date.today() - timedelta(days=30)),
    end_date: date = Query(default=date.today()),
    platform: str | None = Query(default=None),
    db: AsyncSession = Depends(get_async_db)
):
    query = """
        SELECT
            dt,
            campaign_name,
            campaign_id,
            platform,
            leads,
            contracts,
            revenue,
            avg_contract
        FROM dashboards.v8_campaigns_daily
        WHERE dt >= :start_date AND dt <= :end_date
    """

    if platform:
        query += " AND platform = :platform"

    query += " ORDER BY dt DESC, leads DESC"

    result = await db.execute(
        text(query),
        {"start_date": start_date, "end_date": end_date, "platform": platform}
    )

    return [dict(row._mapping) for row in result]
```

---

### Endpoint 2: GET /api/platforms/daily
**Назначение**: KPI по платформам

```python
# apps/api/liderix_api/routes/data_analytics/platforms.py

@router.get("/daily")
async def get_platforms_daily(
    start_date: date = Query(default=date.today() - timedelta(days=30)),
    end_date: date = Query(default=date.today()),
    db: AsyncSession = Depends(get_async_db)
):
    query = text("""
        SELECT
            dt,
            platform,
            leads,
            contracts,
            revenue,
            conversion_rate
        FROM dashboards.v8_platform_daily
        WHERE dt >= :start_date AND dt <= :end_date
        ORDER BY dt DESC, platform
    """)

    result = await db.execute(query, {"start_date": start_date, "end_date": end_date})
    return [dict(row._mapping) for row in result]
```

---

### Endpoint 3: GET /api/attribution/summary
**Назначение**: Summary по источникам атрибуции

```python
# apps/api/liderix_api/routes/data_analytics/attribution.py

@router.get("/summary")
async def get_attribution_summary(
    db: AsyncSession = Depends(get_async_db)
):
    query = text("""
        SELECT
            attribution_type,
            total_leads,
            contracts,
            total_revenue,
            avg_contract_value
        FROM dashboards.v8_attribution_summary
        ORDER BY total_leads DESC
    """)

    result = await db.execute(query)
    return [dict(row._mapping) for row in result]
```

---

## FRONTEND ОБНОВЛЕНИЯ

### Файл: apps/web-enterprise/src/app/data-analytics/page.tsx

**Обновить fetching**:

```typescript
// Campaigns daily chart
const campaignsData = await fetch('/api/campaigns/daily?start_date=2025-09-01&end_date=2025-10-19');

// Platforms comparison
const platformsData = await fetch('/api/platforms/daily?start_date=2025-09-01&end_date=2025-10-19');

// Attribution pie chart
const attributionData = await fetch('/api/attribution/summary');
```

**Charts**:
1. **Line Chart**: Campaigns daily (leads + contracts по дням)
2. **Bar Chart**: Platforms comparison (Google vs Meta vs Direct)
3. **Pie Chart**: Attribution breakdown (источники)
4. **Table**: Top campaigns (сортировка по revenue)

---

## ДЕЙСТВИЯ:

### ШАГ 1: Запустить fact_leads обновление
```bash
# В n8n UI запустить node:
# "dashboards.fact_leads"
```

### ШАГ 2: Проверка после обновления
```sql
-- Должно быть 357 gclid
SELECT COUNT(*) FROM dashboards.fact_leads
WHERE gclid IS NOT NULL AND gclid != '';

-- Должно быть ~1000 fb_lead_id
SELECT COUNT(*) FROM dashboards.fact_leads
WHERE fb_lead_id IS NOT NULL AND fb_lead_id != '';
```

### ШАГ 3: Создать API endpoints
- Скопировать код выше в соответствующие файлы
- Перезапустить backend: `docker-compose up -d --build backend`

### ШАГ 4: Обновить frontend
- Заменить fetch URLs на новые API endpoints
- Обновить charts для использования новых данных

---

## ПРОВЕРКА ФИНАЛЬНАЯ:

```sql
-- 1. Views существуют
SELECT viewname FROM pg_views
WHERE schemaname = 'dashboards' AND viewname LIKE 'v8_%';
-- Ожидаем: v8_campaigns_daily, v8_platform_daily, v8_attribution_summary

-- 2. Данные корректные
SELECT * FROM dashboards.v8_attribution_summary;
-- Ожидаем: Google Click/Campaign, Facebook Lead, Direct и т.д.

-- 3. fact_leads обновлён
SELECT COUNT(*) FROM dashboards.fact_leads WHERE gclid IS NOT NULL;
-- Ожидаем: 357 (было 251)
```

---

**ГОТОВО! Views созданы, осталось запустить fact_leads и создать API endpoints!**
