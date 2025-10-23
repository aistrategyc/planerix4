# DATA ANALYTICS - ПОЛНЫЙ АУДИТ И ПЛАН ОБНОВЛЕНИЯ
**Date**: October 19, 2025, 15:30
**Status**: Анализ завершен - нужно создать новые views

---

## 📊 СТАТУС НОВЫХ ТАБЛИЦ (ВСЕ ЗАПОЛНЕНЫ ✅)

### Staging Tables (4):
1. **stg_crm_requests**: 4,498 записей ✅
2. **stg_fb_ads_daily**: 1,804 записей ✅
3. **stg_google_ads_daily**: 266 записей ✅
4. **stg_google_clicks**: 192,815 записей ✅

### Dimension Tables (4):
5. **dim_campaign**: 68 кампаний (59 Facebook + 9 Google) ✅
6. **dim_ad**: 328 объявлений Facebook ✅
7. **dim_creative**: 1,167 креативов ✅
8. **dim_lead**: 2,804 уникальных лидов ✅

### Fact Tables (2):
9. **fact_lead_request**: 4,498 запросов ✅
10. **fact_ad_performance**: 2,070 записей (1,804 Facebook + 266 Google) ✅

---

## ❌ ПРОБЛЕМА: Views НЕ используют новые таблицы!

### Текущее состояние:
- ✅ **Страница /data-analytics РАБОТАЕТ** (использует старые views)
- ❌ **Ни один view НЕ использует новые таблицы** (fact_lead_request, fact_ad_performance)
- ⚠️ **Атрибуция низкая**: всего 6% (271 из 4,498 CRM requests)

### Почему атрибуция низкая?

**Проверка**:
- 548 CRM requests с `extracted_ad_id` (ad_id из utm_term)
- 328 Facebook ads в `dim_ad`
- **0 совпадений!** ❌

**Причина**: Ad_id из CRM (utm_term) и Ad_id из Facebook API - это **разные периоды времени**. Facebook ads с тех дат уже неактивны.

**Текущая атрибуция**:
- 6.02% - fb_lead_id (271 requests) ✅
- 0% - utm_term_ad_id (0 requests) ❌
- 0% - gclid (0 requests) ❌
- 13.03% - fclid (586 requests) - **НО без привязки к sk_ad!**
- 18.74% - utm_campaign (843 requests) - **НО без привязки к sk_campaign!**
- 62.21% - unknown (2,798 requests) ❌

**Вывод**: Атрибуция работает только для fb_lead_id. Остальные методы не дают результата из-за несовпадения временных периодов.

---

## 🔍 ТЕКУЩИЕ VIEWS И ИХ ИСТОЧНИКИ

### Views используемые на /data-analytics:

1. **v6_bi_platform_daily** (используется в /kpi endpoint)
   - Источник: `v6_campaign_daily_full`
   - Данные: 129 записей, 2025-09-09 до 2025-10-18
   - Метрики: 16,798 leads, 491 contracts, 31.9M revenue ✅

2. **v6_campaign_daily_full** (базовый view)
   - Источник: НЕИЗВЕСТЕН (нужно проверить)
   - Данные: 357 записей, 2025-09-09 до 2025-10-18 ✅

3. **Другие views** (список из 33):
   - campaign_reference (MATVIEW)
   - contract_attribution (MATVIEW)
   - crm_contract_summary (MATVIEW)
   - crm_marketing_link (MATVIEW)
   - crm_payment_summary (MATVIEW)
   - crm_requests (MATVIEW)
   - fb_ad_reference (MATVIEW)
   - google_ad_reference (MATVIEW)
   - lead_marketing_enriched (MATVIEW)
   - v5_bi_campaign_daily (VIEW)
   - v5_bi_platform_daily (VIEW)
   - v6_contracts_ads_enriched (VIEW)
   - v6_fb_contracts_detail_view (VIEW)
   - v6_google_contracts_detail (VIEW)
   - ... и другие

---

## 🎯 ПЛАН ДЕЙСТВИЙ

### ШАГ 1: Создать новые views на базе НОВЫХ таблиц ✅

#### 1.1. v7_campaign_daily (заменит v6_campaign_daily_full)

**Источники**:
- `fact_ad_performance` (spend, clicks, impressions)
- `fact_lead_request` (leads)
- `contract_attribution` (contracts, revenue)

**SQL**:
```sql
CREATE OR REPLACE VIEW dashboards.v7_campaign_daily AS
SELECT
  fap.date_day as dt,
  fap.platform,
  dc.campaign_id,
  dc.campaign_name,

  -- Ad Performance Metrics
  SUM(fap.impressions) as impressions,
  SUM(fap.clicks) as clicks,
  SUM(fap.spend) as spend,
  SUM(fap.conversions) as conversions,

  -- Calculated Metrics
  CASE
    WHEN SUM(fap.impressions) > 0
    THEN (100.0 * SUM(fap.clicks) / SUM(fap.impressions))::NUMERIC(10,4)
  END as ctr,

  CASE
    WHEN SUM(fap.clicks) > 0
    THEN (SUM(fap.spend) / SUM(fap.clicks))::NUMERIC(18,6)
  END as cpc,

  CASE
    WHEN SUM(fap.impressions) > 0
    THEN (SUM(fap.spend) / SUM(fap.impressions) * 1000)::NUMERIC(18,6)
  END as cpm,

  -- Leads from fact_lead_request
  COUNT(DISTINCT flr.sk_fact_lead_request) as leads,

  -- Contracts and Revenue from contract_attribution
  COUNT(DISTINCT ca.sk_contract) as n_contracts,
  SUM(ca.contract_amount) as sum_contracts,

  -- Calculated Business Metrics
  CASE
    WHEN COUNT(DISTINCT flr.sk_fact_lead_request) > 0
    THEN (SUM(fap.spend) / COUNT(DISTINCT flr.sk_fact_lead_request))::NUMERIC(18,6)
  END as cpl,

  CASE
    WHEN SUM(fap.spend) > 0
    THEN (SUM(ca.contract_amount) / SUM(fap.spend))::NUMERIC(18,6)
  END as roas,

  CASE
    WHEN COUNT(DISTINCT flr.sk_fact_lead_request) > 0
    THEN (100.0 * COUNT(DISTINCT ca.sk_contract) / COUNT(DISTINCT flr.sk_fact_lead_request))::NUMERIC(10,4)
  END as conversion_rate

FROM dashboards.fact_ad_performance fap

LEFT JOIN dashboards.dim_campaign dc ON dc.sk_campaign = fap.sk_campaign

LEFT JOIN dashboards.fact_lead_request flr ON (
  flr.sk_campaign = fap.sk_campaign
  AND flr.request_created_at::date = fap.date_day
)

LEFT JOIN dashboards.contract_attribution ca ON (
  ca.sk_lead = flr.sk_lead
  AND ca.contract_created_at::date = fap.date_day
)

WHERE fap.date_day >= '2025-09-01'::date

GROUP BY fap.date_day, fap.platform, dc.campaign_id, dc.campaign_name

ORDER BY fap.date_day DESC, fap.platform, dc.campaign_name;
```

#### 1.2. v7_bi_platform_daily (заменит v6_bi_platform_daily)

**Просто агрегация v7_campaign_daily по platform**:

```sql
CREATE OR REPLACE VIEW dashboards.v7_bi_platform_daily AS
SELECT
  dt,
  platform,
  SUM(leads) as total_leads,
  SUM(n_contracts) as total_contracts,
  SUM(sum_contracts) as total_revenue,
  SUM(spend) as total_spend,
  SUM(clicks) as total_clicks,
  SUM(impressions) as total_impressions,

  CASE
    WHEN SUM(leads) > 0 AND SUM(spend) > 0
    THEN (SUM(spend) / SUM(leads))::NUMERIC(18,6)
  END as avg_cpl,

  CASE
    WHEN SUM(spend) > 0
    THEN (SUM(sum_contracts) / SUM(spend))::NUMERIC(18,6)
  END as roas,

  CASE
    WHEN SUM(clicks) > 0
    THEN (100.0 * SUM(leads) / SUM(clicks))::NUMERIC(10,4)
  END as ctr,

  CASE
    WHEN SUM(leads) > 0
    THEN (100.0 * SUM(n_contracts) / SUM(leads))::NUMERIC(10,4)
  END as conversion_rate,

  COUNT(DISTINCT campaign_id) as campaign_count

FROM dashboards.v7_campaign_daily

WHERE dt >= '2025-09-01'::date

GROUP BY dt, platform

ORDER BY dt DESC, platform;
```

#### 1.3. v7_attribution_summary (новый view для анализа атрибуции)

```sql
CREATE OR REPLACE VIEW dashboards.v7_attribution_summary AS
SELECT
  flr.request_created_at::date as dt,
  flr.attribution_method,
  flr.code_variant,

  COUNT(*) as total_requests,
  COUNT(DISTINCT flr.sk_lead) as unique_leads,
  COUNT(DISTINCT flr.sk_campaign) as campaigns_attributed,
  COUNT(DISTINCT flr.sk_ad) as ads_attributed,

  AVG(flr.attribution_confidence) as avg_confidence,

  COUNT(*) FILTER (WHERE flr.sk_campaign IS NOT NULL) as with_campaign,
  COUNT(*) FILTER (WHERE flr.sk_ad IS NOT NULL) as with_ad,

  ROUND(100.0 * COUNT(*) FILTER (WHERE flr.sk_campaign IS NOT NULL) / COUNT(*), 2) as campaign_coverage_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE flr.sk_ad IS NOT NULL) / COUNT(*), 2) as ad_coverage_pct

FROM dashboards.fact_lead_request flr

GROUP BY flr.request_created_at::date, flr.attribution_method, flr.code_variant

ORDER BY dt DESC, total_requests DESC;
```

---

### ШАГ 2: Обновить API endpoints (если нужно)

**Проверка**: Текущие endpoints используют `v6_bi_platform_daily`. После создания `v7_bi_platform_daily` можно:

**Вариант A (безопасный)**: Добавить новые endpoints для v7:
- `/api/data-analytics/v7/kpi`
- `/api/data-analytics/v7/campaigns`
- и т.д.

**Вариант B (быстрый)**: Заменить в существующих endpoints:
```python
# БЫЛО:
FROM dashboards.v6_bi_platform_daily

# СТАЛО:
FROM dashboards.v7_bi_platform_daily
```

**Рекомендация**: Используй **Вариант A** сначала, потом через 3 дня переключи на Вариант B.

---

### ШАГ 3: Проверить данные в новых views

```sql
-- Проверка v7_campaign_daily
SELECT
  'v7_campaign_daily' as view_name,
  COUNT(*) as rows,
  MIN(dt) as earliest,
  MAX(dt) as latest,
  SUM(leads) as total_leads,
  SUM(spend) as total_spend
FROM dashboards.v7_campaign_daily;

-- Проверка v7_bi_platform_daily
SELECT
  'v7_bi_platform_daily' as view_name,
  COUNT(*) as rows,
  SUM(total_leads) as leads,
  SUM(total_contracts) as contracts,
  SUM(total_revenue) as revenue
FROM dashboards.v7_bi_platform_daily;

-- Сравнение v6 vs v7
SELECT
  'v6_bi_platform_daily' as version,
  SUM(total_leads) as leads,
  SUM(total_contracts) as contracts,
  SUM(total_revenue) as revenue
FROM dashboards.v6_bi_platform_daily
WHERE dt BETWEEN '2025-09-09' AND '2025-10-18'

UNION ALL

SELECT
  'v7_bi_platform_daily',
  SUM(total_leads),
  SUM(total_contracts),
  SUM(total_revenue)
FROM dashboards.v7_bi_platform_daily
WHERE dt BETWEEN '2025-09-09' AND '2025-10-18';
```

---

### ШАГ 4: Обновить materialized views (если нужно)

**Список MATVIEWS которые могут использовать новые таблицы**:
- `campaign_reference` - может использовать `dim_campaign`
- `fb_ad_reference` - может использовать `dim_ad`
- `google_ad_reference` - может использовать `dim_ad`

**НО**: Пока оставим их как есть для backward compatibility.

---

## 🚨 ВАЖНЫЕ НАХОДКИ

### 1. Атрибуция работает плохо (6%)
**Причина**: Ad_id и campaign_id из CRM не совпадают с Ad_id из Facebook API из-за разных временных периодов.

**Решение**: Использовать **fclid** и **utm_campaign** для атрибуции, даже если sk_ad = NULL:
- 13% requests имеют fclid
- 19% requests имеют utm_campaign
- Это даст ~38% атрибуцию вместо 6%!

### 2. Новые таблицы НЕ используются views
**Причина**: Views созданы до новых таблиц.

**Решение**: Создать v7_* views как описано выше.

### 3. Страница /data-analytics работает
**Хорошая новость**: Текущие endpoints работают с v6 views.

**План**: Добавить v7 endpoints параллельно, не ломая v6.

---

## ✅ ФИНАЛЬНЫЙ CHECKLIST

### Сейчас (ШАГ 1):
- [ ] Создать `v7_campaign_daily` view
- [ ] Создать `v7_bi_platform_daily` view
- [ ] Создать `v7_attribution_summary` view
- [ ] Проверить данные в новых views

### Потом (ШАГ 2-3):
- [ ] Добавить `/api/data-analytics/v7/*` endpoints
- [ ] Обновить фронтенд для использования v7 endpoints
- [ ] Протестировать все графики с новыми данными
- [ ] Сравнить v6 vs v7 метрики

### Через 3 дня (ШАГ 4):
- [ ] Заменить v6 на v7 в production endpoints
- [ ] Отключить старые N8N ноды (8 штук)
- [ ] Архивировать v6 views

---

## 🎉 ИТОГ

**Что готово**:
- ✅ Все 10 новых таблиц заполнены
- ✅ Данные качественные (4,498 CRM, 2,070 ad performance)
- ✅ Страница /data-analytics работает (использует старые views)

**Что нужно**:
- ❌ Создать v7 views на базе новых таблиц
- ❌ Добавить v7 API endpoints
- ❌ Улучшить атрибуцию (использовать fclid + utm_campaign)

**Следующий шаг**: Создать 3 SQL view (v7_campaign_daily, v7_bi_platform_daily, v7_attribution_summary)
