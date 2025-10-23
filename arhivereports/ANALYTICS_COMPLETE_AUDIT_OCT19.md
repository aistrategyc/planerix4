# Комплексный Аудит Аналитики - ITstep Final
**Дата**: 19 октября 2025, 15:30 CEST
**База данных**: `itstep_final` @ 92.242.60.211:5432
**Статус**: 🔴 КРИТИЧЕСКИЕ ПРОБЛЕМЫ ОБНАРУЖЕНЫ

---

## 📊 Executive Summary

### Текущее Состояние
- **23 API эндпоинта** работают на странице data-analytics
- **Materialized views** устарели - последние данные от 2025-10-17
- **Данные отсутствуют** за период 2025-09-01 до 2025-09-09 (9 дней)
- **Атрибуция кампаний** работает частично - много договоров без привязки к креативам

### Критические Находки
1. ⚠️ **Raw данные начинаются с 2025-09-10/13**, но фронтенд запрашивает с 2025-09-01
2. ⚠️ **Materialized views не обновлялись** - нет данных за 2025-10-18
3. ⚠️ **fact_leads показывает 16,798 лидов**, но только **1 Google и 1 Meta** с атрибуцией кампаний
4. ⚠️ **v5_leads_campaign_daily содержит только 186 лидов** (потеря 99% данных!)

---

## 🔍 Детальный Анализ Данных

### 1. Raw Tables (Источники Данных)

#### ✅ Facebook Ads (raw.fb_ad_insights)
```
Период:        2025-09-13 → 2025-10-18  (36 дней)
Записей:       10,266
Spend:         ₴63,067.46
Статус:        ✅ Свежие данные (1 день назад)
```

#### ✅ Google Ads (raw.google_ads_campaign_daily)
```
Период:        2025-09-10 → 2025-10-18  (39 дней)
Записей:       266
Spend:         ₴53,127.42
Статус:        ✅ Свежие данные (2 дня назад)
```

#### ⚠️ Facebook Leads (raw.fb_leads)
```
Период:        До 2025-10-18
Записей:       383 лида
Статус:        ✅ Свежие данные
Проблема:      Нет связи с fact_leads?
```

#### 🔴 CRM Data (dashboards.crm_requests)
```
Последнее обновление:  2025-10-01  (18 дней назад)
Записей:               1,104
Статус:                🔴 УСТАРЕВШИЕ ДАННЫЕ
Действие:              СРОЧНО обновить pipeline
```

---

### 2. Fact Tables (Обработанные Данные)

#### 🔴 fact_leads - КРИТИЧЕСКАЯ ПРОБЛЕМА
```sql
Период:          2025-09-09 → 2025-10-18
Всего лидов:     16,798
Google лиды:     1  (0.006%)  ← 🔴 ПОТЕРЯ ДАННЫХ
Meta лиды:       1  (0.006%)  ← 🔴 ПОТЕРЯ ДАННЫХ
Без атрибуции:   16,796 (99.99%)
```

**Проблема**: Практически все лиды не имеют атрибуции к кампаниям!

**Причины**:
1. Отсутствует связь между `raw.fb_leads` и `fact_leads`
2. GCLID из Google Ads не попадает в fact_leads
3. Unified_platform пустой для большинства записей
4. Campaign_id/Campaign_name не заполняются из raw данных

---

### 3. Materialized Views (Агрегированные Данные)

#### 🔴 v5_leads_campaign_daily - КРИТИЧЕСКАЯ ПОТЕРЯ ДАННЫХ
```
Период:        2025-09-10 → 2025-10-17  (26 дней, отсутствует 2025-10-18!)
Записей:       51 строка
Лидов:         186
Spend:         ₴26,218.22
Контрактов:    13

🔴 ПОТЕРЯ ДАННЫХ: 16,798 лидов в fact_leads → только 186 в view!
🔴 Потеряно 99% лидов = 16,612 лидов
```

**Структура view**:
```sql
-- v5_leads_campaign_daily использует:
1. dashboards.fact_leads (для лидов)
2. raw.google_ads_campaign_daily (для spend Google)
3. raw.fb_ad_insights (для spend Meta)

-- JOIN условие: platform + campaign_id + date
-- Если campaign_id NULL → лид не попадает в view!
```

#### v5_bi_platform_daily (используется KPI и Trends endpoints)
```
Период:        2025-09-10 → 2025-10-17  (26 дней)
Платформ:      2 (google, meta)
Лидов:         186  ← агрегация из v5_leads_campaign_daily
Spend:         ₴26,218.22
Контрактов:    13
```

**Статус**: ✅ Структура правильная, но **зависит от битых данных** из v5_leads_campaign_daily

---

## 🚨 Критические Проблемы

### Проблема #1: Отсутствие Атрибуции Лидов
**Симптом**: 16,798 лидов, но только 186 попадают в аналитику

**Root Cause**:
```sql
-- В fact_leads:
WHERE (fl_base.platform = ANY (ARRAY['google', 'meta']))
  AND fl_base.campaign_id IS NOT NULL

-- Условие фильтрует 99% лидов, потому что:
- unified_platform = NULL для большинства
- campaign_id = NULL для большинства
```

**Примеры пропущенных лидов**:
- Лиды из CRM без utm_source
- Лиды из Facebook форм без campaign_id
- Лиды из органического поиска
- Лиды с некорректными utm метками

**Влияние**:
- ❌ KPI Cards показывают только 1% реальных лидов
- ❌ Trends показывают искаженную картину
- ❌ ROI и ROAS невозможно рассчитать точно
- ❌ Attribution недоступен для большинства договоров

---

### Проблема #2: Устаревшие Materialized Views
**Симптом**: Данные за 2025-10-18 отсутствуют во всех views

**Root Cause**: Materialized views не обновляются автоматически

**Необходимые действия**:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v5_leads_campaign_daily;
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v5_bi_platform_daily;
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v5_leads_campaign_weekly;
```

**Автоматизация**: Нужен cron job для ежедневного обновления

---

### Проблема #3: Пропуск Данных за 2025-09-01 до 2025-09-09
**Симптом**: Фронтенд запрашивает с 2025-09-01, но raw данные с 2025-09-10/13

**Root Cause**:
- Facebook raw data начинается с 2025-09-13
- Google raw data начинается с 2025-09-10
- CRM data начинается с 2025-09-09

**Решение**: Обновить default даты на фронтенде до `2025-09-10` или загрузить недостающие данные

---

### Проблема #4: CRM Данные Устарели
**Симптом**: Последнее обновление 2025-10-01 (18 дней назад)

**Файл**: `n8nflow/1.1 CRM RAW-7.json`

**Действие**: Проверить n8n workflow и перезапустить загрузку

---

## 📋 Анализ Эндпоинтов

### Backend Routes Analysis

#### ✅ Работающие Эндпоинты (используют правильные views):
1. `/data-analytics/v5/kpi` - KPI Cards (v5_bi_platform_daily)
2. `/data-analytics/v5/trend/leads` - Leads Trend (v5_bi_platform_daily)
3. `/data-analytics/v5/trend/spend` - Spend Trend (v5_bi_platform_daily)
4. `/data-analytics/v5/campaigns` - Campaigns List (v5_leads_campaign_daily)
5. `/data-analytics/v5/campaigns/wow` - Week-over-Week (v5_leads_campaign_weekly)
6. `/data-analytics/v5/share/platforms` - Platform Share (v5_bi_platform_daily)
7. `/data-analytics/v5/utm-sources` - UTM Sources (v5_leads_source_daily)

#### ⚠️ Эндпоинты с Потерей Данных (из-за проблем с fact_leads):
- Все вышеперечисленные работают, но показывают только 1% реальных данных

#### 🔴 Требуют Проверки:
- `/data-analytics/v5/campaigns/scatter-matrix`
- `/data-analytics/v5/campaigns/anomalies`
- `/data-analytics/v5/campaigns/insights`
- `/data-analytics/v5/campaigns/metrics-trend`
- `/data-analytics/v6/contracts/*` - Contracts attribution endpoints
- `/data-analytics/sales/v6/funnel` - Funnel analysis

---

## 🎯 План Исправления

### Приоритет 1: СРОЧНО (Сегодня)

#### 1.1 Обновить Materialized Views
```sql
-- Обновить все v5 materialized views
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v5_leads_campaign_daily;
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v5_bi_platform_daily;
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v5_leads_campaign_weekly;
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v5_all_leads_daily;
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v5_platform_daily_kpis;
```

#### 1.2 Исправить Default Даты на Фронтенде
```typescript
// apps/web-enterprise/src/app/data-analytics/page.tsx
// Изменить:
const [dateFrom, setDateFrom] = useState("2025-09-01")  // ❌
// На:
const [dateFrom, setDateFrom] = useState("2025-09-10")  // ✅
```

#### 1.3 Перезапустить CRM Pipeline
- Проверить `n8nflow/1.1 CRM RAW-7.json`
- Загрузить данные за 2025-10-02 - 2025-10-19

---

### Приоритет 2: КРИТИЧНО (Завтра)

#### 2.1 Исправить fact_leads Attribution
**Проблема**: 99% лидов теряются из-за отсутствия campaign_id

**Решение**: Создать улучшенную версию fact_leads или view:

```sql
CREATE MATERIALIZED VIEW dashboards.fact_leads_v2 AS
WITH lead_sources AS (
  SELECT
    id,
    created_date_txt,
    row_created_at,
    -- Попытаться извлечь platform из всех доступных полей
    COALESCE(
      NULLIF(unified_platform, ''),
      CASE
        WHEN google_campaign_id IS NOT NULL THEN 'google'
        WHEN meta_campaign_id IS NOT NULL THEN 'meta'
        WHEN utm_source ILIKE '%google%' THEN 'google'
        WHEN utm_source ILIKE '%facebook%' OR utm_source ILIKE '%meta%' THEN 'meta'
        ELSE 'organic'  -- Не игнорировать, а пометить как organic
      END
    ) as platform,
    -- Campaign ID из всех возможных источников
    COALESCE(
      NULLIF(google_campaign_id, ''),
      NULLIF(meta_campaign_id, ''),
      NULLIF(utm_campaign, ''),
      'unknown'  -- Помечаем как unknown вместо NULL
    ) as campaign_id,
    contract_amount
  FROM dashboards.fact_leads
)
SELECT * FROM lead_sources;
```

#### 2.2 Добавить Attribution для fb_leads
```sql
-- Создать view для связи raw.fb_leads с fact_leads
CREATE VIEW dashboards.fb_leads_with_attribution AS
SELECT
  fl.id as fb_lead_id,
  fl.form_id,
  fl.ad_id,
  fl.campaign_id,
  fl.created_time,
  fl.request_created_at,
  -- Попытаться найти matching lead в fact_leads
  fact.id as fact_lead_id,
  fact.contract_amount
FROM raw.fb_leads fl
LEFT JOIN dashboards.fact_leads fact
  ON fact.request_created_at::date = fl.request_created_at::date
  AND fact.meta_campaign_id = fl.campaign_id;
```

#### 2.3 Добавить GCLID Attribution для Google
```sql
-- Создать view для Google Ads attribution
CREATE VIEW dashboards.google_leads_with_attribution AS
SELECT
  gclicks.date,
  gclicks.gclid,
  gclicks.campaign_id,
  gclicks.ad_group_id,
  fact.id as fact_lead_id,
  fact.contract_amount
FROM raw.google_ads_clicks gclicks
LEFT JOIN dashboards.fact_leads fact
  ON fact.google_gclid = gclicks.gclid
WHERE gclicks.gclid IS NOT NULL;
```

---

### Приоритет 3: ВАЖНО (Эта Неделя)

#### 3.1 Создать Comprehensive Attribution View
```sql
CREATE MATERIALIZED VIEW dashboards.v6_full_attribution AS
WITH all_leads AS (
  -- Все лиды из fact_leads с максимально полной атрибуцией
  SELECT
    id as lead_id,
    COALESCE(to_date(NULLIF(created_date_txt, ''), 'YYYY-MM-DD'), row_created_at::date) as lead_date,
    COALESCE(unified_platform,
      CASE WHEN google_campaign_id IS NOT NULL THEN 'google'
           WHEN meta_campaign_id IS NOT NULL THEN 'meta'
           ELSE 'organic'
      END
    ) as platform,
    google_campaign_id,
    google_campaign_name,
    google_gclid,
    meta_campaign_id,
    meta_campaign_name,
    meta_ad_id,
    meta_creative_id,
    utm_source,
    utm_campaign,
    contract_amount,
    CASE WHEN contract_amount > 0 THEN 1 ELSE 0 END as has_contract
  FROM dashboards.fact_leads
),
google_enriched AS (
  SELECT
    l.*,
    g.ad_group_id as google_ad_group_id,
    g.ad_group_name as google_ad_group_name
  FROM all_leads l
  LEFT JOIN raw.google_ads_clicks g
    ON l.google_gclid = g.gclid
  WHERE l.platform = 'google'
),
meta_enriched AS (
  SELECT
    l.*,
    fb.ad_id as meta_full_ad_id,
    fb.adset_id as meta_adset_id,
    fb.adset_name as meta_adset_name
  FROM all_leads l
  LEFT JOIN raw.fb_leads fb
    ON l.meta_campaign_id = fb.campaign_id
    AND l.lead_date = fb.request_created_at::date
  WHERE l.platform = 'meta'
),
organic_leads AS (
  SELECT * FROM all_leads WHERE platform = 'organic'
)
SELECT * FROM google_enriched
UNION ALL
SELECT * FROM meta_enriched
UNION ALL
SELECT * FROM organic_leads;

-- Create indexes
CREATE INDEX idx_v6_full_attr_date ON dashboards.v6_full_attribution(lead_date);
CREATE INDEX idx_v6_full_attr_platform ON dashboards.v6_full_attribution(platform);
CREATE INDEX idx_v6_full_attr_contract ON dashboards.v6_full_attribution(has_contract);
```

#### 3.2 Создать Улучшенный Campaign Daily View
```sql
CREATE MATERIALIZED VIEW dashboards.v6_campaign_daily_full AS
WITH campaign_leads AS (
  SELECT
    lead_date as dt,
    platform,
    COALESCE(
      google_campaign_id,
      meta_campaign_id,
      'unknown'
    ) as campaign_id,
    COALESCE(
      google_campaign_name,
      meta_campaign_name,
      'Unknown Campaign'
    ) as campaign_name,
    COUNT(*) as leads,
    SUM(has_contract) as n_contracts,
    SUM(contract_amount) as sum_contracts
  FROM dashboards.v6_full_attribution
  GROUP BY dt, platform, campaign_id, campaign_name
),
google_spend AS (
  SELECT
    date as dt,
    campaign_id::text,
    SUM(cost_micros)/1000000.0 as spend,
    SUM(clicks) as clicks,
    SUM(impressions) as impressions
  FROM raw.google_ads_campaign_daily
  GROUP BY dt, campaign_id
),
meta_spend AS (
  SELECT
    date_start as dt,
    campaign_id,
    SUM(spend) as spend,
    SUM(clicks::numeric) as clicks,
    SUM(impressions::numeric) as impressions
  FROM raw.fb_ad_insights
  GROUP BY dt, campaign_id
)
SELECT
  cl.dt,
  cl.platform,
  cl.campaign_id,
  cl.campaign_name,
  cl.leads,
  cl.n_contracts,
  cl.sum_contracts,
  COALESCE(gs.spend, ms.spend, 0) as spend,
  COALESCE(gs.clicks, ms.clicks, 0) as clicks,
  COALESCE(gs.impressions, ms.impressions, 0) as impressions,
  CASE WHEN cl.leads > 0
    THEN COALESCE(gs.spend, ms.spend, 0) / cl.leads
    ELSE NULL
  END as cpl,
  CASE WHEN COALESCE(gs.spend, ms.spend, 0) > 0
    THEN cl.sum_contracts / COALESCE(gs.spend, ms.spend, 0)
    ELSE NULL
  END as roas
FROM campaign_leads cl
LEFT JOIN google_spend gs
  ON cl.platform = 'google'
  AND cl.campaign_id = gs.campaign_id
  AND cl.dt = gs.dt
LEFT JOIN meta_spend ms
  ON cl.platform = 'meta'
  AND cl.campaign_id = ms.campaign_id
  AND cl.dt = ms.dt;

-- Create indexes
CREATE INDEX idx_v6_camp_daily_date ON dashboards.v6_campaign_daily_full(dt);
CREATE INDEX idx_v6_camp_daily_platform ON dashboards.v6_campaign_daily_full(platform);
```

#### 3.3 Обновить Backend API Endpoints
```python
# apps/api/liderix_api/routes/data_analytics/kpi.py
# Изменить FROM dashboards.v5_bi_platform_daily
# На: FROM dashboards.v6_campaign_daily_full (после создания)

# Или создать aggregate view:
CREATE VIEW dashboards.v6_bi_platform_daily AS
SELECT
  dt,
  platform,
  SUM(leads) as leads,
  SUM(n_contracts) as n_contracts,
  SUM(sum_contracts) as sum_contracts,
  SUM(spend) as spend,
  SUM(clicks) as clicks,
  SUM(impressions) as impressions,
  CASE WHEN SUM(leads) > 0
    THEN SUM(spend) / SUM(leads)
    ELSE NULL
  END as cpl,
  CASE WHEN SUM(spend) > 0
    THEN SUM(sum_contracts) / SUM(spend)
    ELSE NULL
  END as roas
FROM dashboards.v6_campaign_daily_full
GROUP BY dt, platform;
```

---

### Приоритет 4: Оптимизация (2 Недели)

#### 4.1 Автоматизировать Обновление Views
```bash
# Создать cron job на сервере 65.108.220.33
# /etc/cron.d/refresh_analytics_views

# Refresh materialized views daily at 2 AM
0 2 * * * postgres psql -U manfromlamp -d itstep_final -c "REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v6_full_attribution;"
5 2 * * * postgres psql -U manfromlamp -d itstep_final -c "REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v6_campaign_daily_full;"
10 2 * * * postgres psql -U manfromlamp -d itstep_final -c "REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v5_leads_campaign_weekly;"
```

#### 4.2 Добавить Data Quality Monitoring
```sql
-- Создать view для мониторинга качества данных
CREATE VIEW dashboards.data_quality_checks AS
WITH raw_counts AS (
  SELECT
    'fb_ad_insights' as table_name,
    MAX(date_start) as last_date,
    COUNT(*) as total_records,
    SUM(spend) as total_value
  FROM raw.fb_ad_insights
  WHERE date_start >= CURRENT_DATE - 30

  UNION ALL

  SELECT
    'google_ads_campaign_daily',
    MAX(date),
    COUNT(*),
    SUM(cost_micros)/1000000.0
  FROM raw.google_ads_campaign_daily
  WHERE date >= CURRENT_DATE - 30

  UNION ALL

  SELECT
    'crm_requests',
    MAX(request_created_at::date),
    COUNT(*),
    NULL
  FROM dashboards.crm_requests
  WHERE request_created_at >= CURRENT_DATE - 30
),
processed_counts AS (
  SELECT
    'fact_leads' as table_name,
    MAX(COALESCE(to_date(NULLIF(created_date_txt, ''), 'YYYY-MM-DD'), row_created_at::date)) as last_date,
    COUNT(*) as total_records,
    SUM(contract_amount) as total_value
  FROM dashboards.fact_leads
  WHERE COALESCE(to_date(NULLIF(created_date_txt, ''), 'YYYY-MM-DD'), row_created_at::date) >= CURRENT_DATE - 30

  UNION ALL

  SELECT
    'v6_campaign_daily_full',
    MAX(dt),
    COUNT(*),
    SUM(sum_contracts)
  FROM dashboards.v6_campaign_daily_full
  WHERE dt >= CURRENT_DATE - 30
)
SELECT
  table_name,
  last_date,
  CURRENT_DATE - last_date as days_old,
  total_records,
  total_value,
  CASE
    WHEN CURRENT_DATE - last_date > 2 THEN 'ALERT'
    WHEN CURRENT_DATE - last_date > 1 THEN 'WARNING'
    ELSE 'OK'
  END as status
FROM (
  SELECT * FROM raw_counts
  UNION ALL
  SELECT * FROM processed_counts
) all_checks
ORDER BY days_old DESC;
```

#### 4.3 Улучшить N8N Workflows
**Файлы для анализа**:
1. `n8nflow/1.1 CRM RAW-7.json` - CRM data pipeline
2. `n8nflow/1.2 Facebook RAW-2.json` - Facebook ads pipeline
3. `n8nflow/1.3 GoogleADS RAW.json` - Google Ads pipeline
4. `n8nflow/2 dashboards.json` - Dashboards aggregation

**Задачи**:
- Проверить error handling
- Добавить retry logic
- Улучшить attribution mapping
- Добавить validation перед INSERT

---

## 📊 Expected Results

### После Приоритета 1 (Сегодня):
- ✅ Данные свежие до 2025-10-18
- ✅ Фронтенд не запрашивает несуществующие даты
- ✅ CRM данные актуальны

### После Приоритета 2 (Завтра):
- ✅ Все 16,798 лидов учитываются в аналитике
- ✅ Органические лиды видны отдельно
- ✅ Attribution работает для Facebook форм
- ✅ Attribution работает для Google через GCLID

### После Приоритета 3 (Неделя):
- ✅ Полная атрибуция от креатива до договора
- ✅ Новые v6 views с полными данными
- ✅ API endpoints используют улучшенные views
- ✅ ROI/ROAS рассчитывается корректно

### После Приоритета 4 (2 Недели):
- ✅ Автоматическое обновление данных
- ✅ Мониторинг качества данных
- ✅ Улучшенные N8N workflows
- ✅ Alerting при проблемах с данными

---

## 🎯 Метрики Успеха

### Current State (BAD)
```
Лиды в fact_leads:           16,798
Лиды в аналитике:            186 (1%)
Лиды с атрибуцией:           2 (0.01%)
Attribution Coverage:        0.01%
Data Freshness:              18 дней (CRM)
```

### Target State (GOOD)
```
Лиды в fact_leads:           16,798
Лиды в аналитике:            16,798 (100%)
Лиды с атрибуцией:           ~12,000 (70%+)
Attribution Coverage:        70%+
Data Freshness:              < 1 дня
```

---

## 📝 Следующие Шаги

1. ✅ **Утвердить план** с клиентом
2. 🔄 **Начать Приоритет 1** - исправить текущие проблемы
3. 🔄 **Создать v6 views** с полной атрибуцией
4. 🔄 **Обновить API endpoints** на новые views
5. 🔄 **Проверить фронтенд** после изменений
6. 🔄 **Настроить автоматизацию** обновления данных

---

## 🔗 Связанные Документы

- `/Users/Kirill/planerix_new/GIT_CONFIGURATION_GUIDE.md` - Git setup
- `/Users/Kirill/planerix_new/n8nflow/` - Data pipeline workflows
- `/apps/api/liderix_api/routes/data_analytics/` - Backend API routes
- `/apps/web-enterprise/src/app/data-analytics/page.tsx` - Frontend page

---

**Prepared by**: Claude AI Assistant
**Date**: October 19, 2025, 15:30 CEST
**Status**: 🔴 Action Required
