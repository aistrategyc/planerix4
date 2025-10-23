# 🚀 V9 Analytics Deployment Guide

## 📋 Что создано

### SQL Файлы (в папке `/sql/v9/`)

1. **01_CREATE_STG_SCHEMA.sql** - Создание схемы `stg`
2. **02_CREATE_STG_TABLES.sql** - 5 основных таблиц:
   - `stg.crm_events` - События CRM
   - `stg.source_attribution` - Распарсенные источники
   - `stg.marketing_match` - Связь с рекламой
   - `stg.fact_leads` - Финальная таблица лидов
   - `stg.fact_contracts` - Финальная таблица договоров

3. **03_CREATE_STG_FUNCTIONS.sql** - 6 функций ETL:
   - `stg.refresh_stg_crm_events()`
   - `stg.refresh_stg_source_attribution()`
   - `stg.refresh_stg_marketing_match()`
   - `stg.refresh_stg_fact_leads()`
   - `stg.refresh_stg_fact_contracts()`
   - `stg.refresh_all_stg_tables()` ⭐ **Главная функция**

4. **04_CREATE_ANALYTICS_VIEWS.sql** - 7 analytics views:
   - `stg.v9_ads_analytics_daily` - Для /ads
   - `stg.v9_contracts_attribution` - Для /contracts-analytics
   - `stg.v9_marketing_funnel_daily` - Для /data-analytics
   - + 4 дополнительных views для детализации

5. **N8N_WORKFLOW_NODES.md** - Полная документация n8n workflow

---

## 🎯 Пошаговая инструкция деплоя

### PHASE 1: Подготовка базы данных (15 минут)

#### Шаг 1.1: Подключиться к production БД

```bash
ssh -i ~/.ssh/id_ed25519_hetzner root@65.108.220.33
cd /opt/MONOREPv3

# Или напрямую подключиться к БД:
PGPASSWORD='lashd87123kKJSDAH81' psql -h 92.242.60.211 -p 5432 -U manfromlamp -d itstep_final
```

#### Шаг 1.2: Создать схему stg

```sql
\i sql/v9/01_CREATE_STG_SCHEMA.sql
```

**Expected Output**:
```
CREATE SCHEMA
GRANT
GRANT
COMMENT
```

#### Шаг 1.3: Создать таблицы

```sql
\i sql/v9/02_CREATE_STG_TABLES.sql
```

**Expected Output**:
```
DROP TABLE (if exists)
CREATE TABLE stg.crm_events
CREATE INDEX (x12)
COMMENT
DROP TABLE
CREATE TABLE stg.source_attribution
CREATE INDEX (x7)
COMMENT
... (еще 3 таблицы)
```

**Verification**:
```sql
-- Проверить созданные таблицы
\dt stg.*

-- Должны увидеть:
-- stg.crm_events
-- stg.source_attribution
-- stg.marketing_match
-- stg.fact_leads
-- stg.fact_contracts
```

#### Шаг 1.4: Создать функции ETL

```sql
\i sql/v9/03_CREATE_STG_FUNCTIONS.sql
```

**Expected Output**:
```
CREATE FUNCTION stg.refresh_stg_crm_events
CREATE FUNCTION stg.refresh_stg_source_attribution
CREATE FUNCTION stg.refresh_stg_marketing_match
CREATE FUNCTION stg.refresh_stg_fact_leads
CREATE FUNCTION stg.refresh_stg_fact_contracts
CREATE FUNCTION stg.refresh_all_stg_tables
```

**Verification**:
```sql
-- Проверить созданные функции
\df stg.*

-- Должны увидеть 6 функций
```

#### Шаг 1.5: Создать analytics views

```sql
\i sql/v9/04_CREATE_ANALYTICS_VIEWS.sql
```

**Expected Output**:
```
CREATE VIEW stg.v9_ads_analytics_daily
CREATE VIEW stg.v9_contracts_attribution
... (еще 5 views)
```

**Verification**:
```sql
-- Проверить созданные views
\dv stg.*

-- Должны увидеть 7 views
```

---

### PHASE 2: Первичное заполнение данных (10-30 минут)

#### Шаг 2.1: Запустить full refresh

```sql
SELECT * FROM stg.refresh_all_stg_tables();
```

**Expected Output** (займет 10-30 минут):
```
 step_name             | rows_processed | execution_time_ms | status
-----------------------+----------------+-------------------+---------
 1. CRM Events         |         45231  |           12450   | SUCCESS
 2. Source Attribution |         45231  |            8320   | SUCCESS
 3. Marketing Match    |         12456  |            5210   | SUCCESS
 4. Fact Leads         |         45231  |            3540   | SUCCESS
 5. Fact Contracts     |          8923  |            2890   | SUCCESS
```

**⚠️ ВАЖНО**: Если процесс зависнет или выдаст ошибку, проверьте:
```sql
-- Проверить текущие запросы
SELECT pid, query, state, query_start
FROM pg_stat_activity
WHERE datname = 'itstep_final'
ORDER BY query_start DESC;

-- Если нужно убить зависший запрос:
-- SELECT pg_terminate_backend(PID);
```

#### Шаг 2.2: Проверить результаты

```sql
-- Проверка 1: Количество записей
SELECT
  'crm_events' as table_name,
  COUNT(*) as row_count,
  COUNT(*) FILTER (WHERE is_first_touch = TRUE) as first_touch_count,
  COUNT(*) FILTER (WHERE is_contract = TRUE) as contracts_count
FROM stg.crm_events
UNION ALL
SELECT
  'fact_leads',
  COUNT(*),
  COUNT(*),
  0
FROM stg.fact_leads
UNION ALL
SELECT
  'fact_contracts',
  COUNT(*),
  0,
  COUNT(*)
FROM stg.fact_contracts;

-- Expected:
-- crm_events:     ~45000 rows, ~45000 first touch, ~9000 contracts
-- fact_leads:     ~45000 rows
-- fact_contracts: ~9000 rows
```

```sql
-- Проверка 2: Attribution coverage
SELECT
  dominant_platform,
  COUNT(*) as contracts,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM stg.fact_contracts
WHERE contract_day >= '2025-09-01'
GROUP BY dominant_platform
ORDER BY contracts DESC;

-- Expected:
-- facebook: ~40%
-- google: ~30%
-- direct: ~20%
-- other: ~10%
```

```sql
-- Проверка 3: Match rate (должна быть > 50%)
SELECT
  ROUND(100.0 * COUNT(*) FILTER (WHERE matched_platform IS NOT NULL) / COUNT(*), 2) as match_rate,
  COUNT(*) FILTER (WHERE matched_platform IS NOT NULL) as matched_leads,
  COUNT(*) as total_leads
FROM stg.fact_leads
WHERE lead_day >= '2025-09-01';

-- Expected match_rate: > 50%
```

#### Шаг 2.3: Проверить analytics views

```sql
-- Тест view для /ads page
SELECT
  dt,
  platform,
  campaign_name,
  spend,
  crm_leads,
  contracts,
  roas
FROM stg.v9_ads_analytics_daily
WHERE dt >= '2025-10-01'
ORDER BY spend DESC
LIMIT 5;

-- Должны увидеть данные с Facebook и Google кампаниями
```

```sql
-- Тест view для /contracts-analytics page
SELECT
  platform,
  traffic_source,
  contracts,
  revenue,
  conversion_rate
FROM stg.v9_contracts_attribution
ORDER BY contracts DESC
LIMIT 5;

-- Должны увидеть топ источников договоров
```

---

### PHASE 3: Настройка n8n Workflow (15 минут)

#### Шаг 3.1: Создать таблицу логов (опционально)

```sql
CREATE TABLE IF NOT EXISTS stg.etl_logs (
  id SERIAL PRIMARY KEY,
  workflow_name VARCHAR(100) NOT NULL,
  execution_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_rows_processed BIGINT,
  execution_time_ms INTEGER,
  status VARCHAR(20),
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_etl_logs_workflow ON stg.etl_logs (workflow_name);
CREATE INDEX idx_etl_logs_execution_date ON stg.etl_logs (execution_date);
```

#### Шаг 3.2: Открыть n8n UI

```bash
# На сервере n8n должен быть запущен на порту 5678
# Открыть в браузере: http://65.108.220.33:5678
```

#### Шаг 3.3: Создать новый workflow

**Название**: `V9 Analytics ETL Daily`

**Nodes** (см. файл `N8N_WORKFLOW_NODES.md`):
1. Schedule Trigger (00:30 UTC)
2. PostgreSQL Execute: `SELECT * FROM stg.refresh_all_stg_tables();`
3. IF Condition: Check all steps SUCCESS
4. TRUE → Send Success Telegram
5. FALSE → Send Error Alert
6. Log to Database (optional)

#### Шаг 3.4: Настроить credentials

**PostgreSQL Credentials**:
- Name: `PostgreSQL itstep_final`
- Host: `92.242.60.211`
- Port: `5432`
- Database: `itstep_final`
- User: `manfromlamp`
- Password: `lashd87123kKJSDAH81`
- SSL: `disable`

**Telegram Credentials** (опционально):
- Bot Token: `<YOUR_BOT_TOKEN>`
- Chat ID: `<YOUR_CHAT_ID>`

#### Шаг 3.5: Тестовый запуск

1. Нажать **"Test Workflow"** в n8n UI
2. Проверить вывод каждого node
3. Убедиться что все 5 шагов выполнены успешно
4. Проверить логи:
   ```sql
   SELECT * FROM stg.etl_logs ORDER BY execution_date DESC LIMIT 1;
   ```

#### Шаг 3.6: Активировать workflow

1. Нажать **"Activate"** в правом верхнем углу
2. Workflow будет запускаться каждый день в 00:30 UTC

---

### PHASE 4: Backend API Update (предстоит)

#### Файл: `apps/api/liderix_api/routes/ads/v9_ads.py`

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from datetime import date

router = APIRouter(prefix="/v9/ads", tags=["v9-ads"])

@router.get("/overview")
async def get_ads_overview_v9(
    date_from: date = Query(...),
    date_to: date = Query(...),
    platform: str = Query(None),
    session = Depends(get_db)
):
    query = text("""
    SELECT
      SUM(spend) as total_spend,
      SUM(impressions) as total_impressions,
      SUM(clicks) as total_clicks,
      SUM(crm_leads) as total_leads,
      SUM(contracts) as total_contracts,
      SUM(revenue) as total_revenue,
      ROUND(SUM(revenue) / NULLIF(SUM(spend), 0), 2) as roas,
      ROUND(SUM(spend) / NULLIF(SUM(crm_leads), 0), 2) as cpl
    FROM stg.v9_ads_analytics_daily
    WHERE dt BETWEEN :date_from AND :date_to
    """ + (" AND platform = :platform" if platform else ""))

    result = await session.execute(query, {
        "date_from": date_from,
        "date_to": date_to,
        "platform": platform
    })
    row = result.fetchone()

    return {
        "total_spend": float(row.total_spend or 0),
        "total_impressions": int(row.total_impressions or 0),
        "total_clicks": int(row.total_clicks or 0),
        "crm_leads": int(row.total_leads or 0),
        "contracts": int(row.total_contracts or 0),
        "revenue": float(row.total_revenue or 0),
        "roas": float(row.roas or 0),
        "cpl": float(row.cpl or 0)
    }

# ... еще endpoints (campaigns, timeline, etc)
```

---

### PHASE 5: Frontend Update (предстоит)

#### Файл: `apps/web-enterprise/src/lib/api/v9-ads.ts`

```typescript
export const AdsAnalyticsV9API = {
  async getOverview(filters: {
    date_from: string
    date_to: string
    platform?: string
  }) {
    const params = new URLSearchParams({
      date_from: filters.date_from,
      date_to: filters.date_to,
      ...(filters.platform && { platform: filters.platform })
    })
    const res = await fetch(`${API_URL}/v9/ads/overview?${params}`, {
      headers: await getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to fetch v9 ads overview')
    return res.json()
  },

  // ... другие методы
}
```

#### Обновить страницы:
- `apps/web-enterprise/src/app/ads/page.tsx`
- `apps/web-enterprise/src/app/contracts-analytics/page.tsx`
- `apps/web-enterprise/src/app/data-analytics/page.tsx`

---

## 🧪 Testing Checklist

### Database Tests

```sql
-- Test 1: CRM Events первое касание
SELECT
  client_id,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE is_first_touch = TRUE) as first_touch_count
FROM stg.crm_events
GROUP BY client_id
HAVING COUNT(*) FILTER (WHERE is_first_touch = TRUE) != 1
LIMIT 10;

-- Expected: 0 rows (каждый клиент должен иметь ровно 1 first touch)
```

```sql
-- Test 2: Contracts атрибуция
SELECT
  COUNT(*) as total_contracts,
  COUNT(*) FILTER (WHERE dominant_platform IS NOT NULL) as attributed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE dominant_platform IS NOT NULL) / COUNT(*), 2) as attribution_rate
FROM stg.fact_contracts
WHERE contract_day >= '2025-09-01';

-- Expected attribution_rate: > 80%
```

```sql
-- Test 3: Marketing match rate
SELECT
  dominant_platform,
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE matched_platform IS NOT NULL) as matched,
  ROUND(100.0 * COUNT(*) FILTER (WHERE matched_platform IS NOT NULL) / COUNT(*), 2) as match_rate
FROM stg.fact_leads
WHERE lead_day >= '2025-09-01'
  AND dominant_platform IN ('facebook', 'google')
GROUP BY dominant_platform;

-- Expected match_rate:
-- facebook: > 60%
-- google: > 40%
```

---

## 📊 Monitoring Queries

```sql
-- Query 1: Daily ETL performance
SELECT
  execution_date::date,
  total_rows_processed,
  ROUND(execution_time_ms / 1000.0, 2) as execution_seconds,
  status
FROM stg.etl_logs
ORDER BY execution_date DESC
LIMIT 7;
```

```sql
-- Query 2: Data freshness
SELECT
  'crm_events' as table_name,
  MAX(loaded_at) as last_update,
  EXTRACT(HOURS FROM CURRENT_TIMESTAMP - MAX(loaded_at)) as hours_ago
FROM stg.crm_events
UNION ALL
SELECT 'fact_leads', MAX(loaded_at), EXTRACT(HOURS FROM CURRENT_TIMESTAMP - MAX(loaded_at))
FROM stg.fact_leads;

-- Expected: hours_ago < 24 (данные обновлялись сегодня)
```

```sql
-- Query 3: Data quality dashboard
SELECT
  (SELECT COUNT(*) FROM stg.fact_leads WHERE lead_day >= CURRENT_DATE - 7) as leads_last_7d,
  (SELECT COUNT(*) FROM stg.fact_contracts WHERE contract_day >= CURRENT_DATE - 7) as contracts_last_7d,
  (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE dominant_platform IS NOT NULL) / COUNT(*), 2)
   FROM stg.fact_contracts WHERE contract_day >= CURRENT_DATE - 7) as attribution_rate,
  (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE matched_platform IS NOT NULL) / COUNT(*), 2)
   FROM stg.fact_leads WHERE lead_day >= CURRENT_DATE - 7) as match_rate;
```

---

## 🚨 Troubleshooting

### Problem 1: Function execution timeout

**Error**: `statement timeout`

**Solution**:
```sql
-- Увеличить timeout для ETL сессии
ALTER DATABASE itstep_final SET statement_timeout = '600s';

-- Или в начале workflow:
SET statement_timeout = '600s';
SELECT * FROM stg.refresh_all_stg_tables();
```

### Problem 2: Low attribution rate (<80%)

**Diagnostic**:
```sql
-- Найти договоры без атрибуции
SELECT
  contract_source_id,
  client_id,
  contract_date,
  dominant_platform,
  matched_platform
FROM stg.fact_contracts
WHERE dominant_platform IS NULL
LIMIT 20;

-- Проверить источники этих клиентов
SELECT
  id_source,
  dominant_platform,
  utm_source,
  fbclid,
  gclid
FROM stg.source_attribution
WHERE id_source IN (SELECT lead_source_id FROM stg.fact_leads WHERE client_id = <CLIENT_ID>);
```

**Solution**: Проверить логику парсинга `code` JSONB в функции `refresh_stg_source_attribution`

### Problem 3: Duplicate key errors

**Error**: `duplicate key value violates unique constraint`

**Solution**:
```sql
-- Найти дубликаты в crm_events
SELECT
  client_id,
  event_date,
  event_type_id,
  COUNT(*)
FROM stg.crm_events
GROUP BY client_id, event_date, event_type_id
HAVING COUNT(*) > 1;

-- Удалить дубликаты (оставить только один)
-- Добавить DISTINCT в INSERT query в функции refresh_stg_crm_events
```

---

## ✅ Success Metrics

V9 система считается успешно развернутой если:
- ✅ Все SQL скрипты выполнены без ошибок
- ✅ Первичный refresh завершился успешно (<30 минут)
- ✅ Attribution rate > 80%
- ✅ Match rate > 50%
- ✅ n8n workflow активирован и работает ежедневно
- ✅ ETL logs пишутся корректно
- ✅ Analytics views возвращают данные

---

## 📞 Next Steps

1. **Сейчас**: Запустить SQL скрипты 01-04 на production БД
2. **После проверки**: Настроить n8n workflow
3. **Через день**: Проверить автоматическое обновление данных
4. **Следующая неделя**: Обновить backend API
5. **После API**: Обновить frontend pages

---

**Дата создания**: 22 октября 2025
**Автор**: Claude Code Assistant
**Версия**: 1.0
**Статус**: 🟢 READY FOR DEPLOYMENT
