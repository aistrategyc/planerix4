# 🎯 ЧЁТКИЙ ПЛАН ДЕЙСТВИЙ

## ✅ ПРОВЕРКА ЗАВЕРШЕНА

### Покрытие по источникам:
- ✅ **Google Ads**: 357 gclid в crm_requests (93.7% из RAW)
- ✅ **Facebook Leads**: 333 fb_lead_id в crm_requests (87% из 383 RAW)
- ✅ **Instagram/Other UTM**: 236 записей с utm_source
- ✅ **Contracts**: 491 контрактов в fact_leads
  - 57 Google
  - 20 Meta (Facebook/Instagram)
  - 386 Direct
  - 28 Other

### Проблема: УСТАРЕВШИЕ ТАБЛИЦЫ И VIEWS
- 69 таблиц/views в dashboards schema
- v5_* (старая версия) - 17 объектов
- v6_* (старая версия) - 32 объекта
- dim_contract, fact_contract (СТАРАЯ АРХИТЕКТУРА)

---

## 📋 ДЕЙСТВИЯ

### ШАГ 1: УДАЛИТЬ СТАРЫЕ VIEWS/MATVIEWS

```sql
-- ВЫПОЛНИТЬ В БАЗЕ:
BEGIN;

-- Удалить v5_* (старые)
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

-- Удалить v6_* (старые)
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

-- Удалить старые matviews
DROP MATERIALIZED VIEW IF EXISTS dashboards.contract_source_bridge_mv CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.crm_marketing_link_kvm CASCADE;

-- Удалить старые таблицы (НЕПРАВИЛЬНАЯ АРХИТЕКТУРА)
DROP TABLE IF EXISTS dashboards.dim_contract CASCADE;
DROP TABLE IF EXISTS dashboards.dim_lead CASCADE;
DROP TABLE IF EXISTS dashboards.dim_campaign CASCADE;
DROP TABLE IF EXISTS dashboards.fact_contract CASCADE;
DROP TABLE IF EXISTS dashboards.fact_lead_request CASCADE;
DROP TABLE IF EXISTS dashboards.contract_attribution CASCADE;

COMMIT;
```

### ШАГ 2: ОБНОВИТЬ N8N WORKFLOW

**Файл**: `n8nflow/2 dashboards-2.json`
**Node**: `dashboards.crm_requests`

**ЗАМЕНИТЬ CTE `last_code`**:

```sql
last_code AS (
  SELECT DISTINCT ON (r.id_source)
    r.id_source,
    CASE
      WHEN a.code IS NULL THEN NULL
      WHEN jsonb_typeof(a.code) IN ('object','array','string') THEN a.code
      ELSE NULL
    END AS code
  FROM rel r
  JOIN raw.itcrm_analytics a
    ON a.internet_request_id::int IN (SELECT UNNEST(r.request_ids))
  WHERE a.code IS NOT NULL
  ORDER BY
    r.id_source,
    CASE WHEN a.code->>'gclid' IS NOT NULL AND a.code->>'gclid' != '' THEN 1 ELSE 99 END,
    CASE WHEN a.code->>'fb_lead_id' IS NOT NULL AND a.code->>'fb_lead_id' != '' THEN 2 ELSE 99 END,
    CASE WHEN a.code->>'fbclid' IS NOT NULL AND a.code->>'fbclid' != '' THEN 3 ELSE 99 END,
    CASE WHEN a.code ? 'utm_source' THEN 4 ELSE 99 END,
    a.analytic_id DESC
),
```

**ДОБАВИТЬ ПОСЛЕ ОСНОВНОГО INSERT**:

```sql
INSERT INTO dashboards.crm_requests AS tgt (
  id_source, source_type, source_date_time, source_updated_at, id_uniq,
  request_ids, primary_request_id, internet_request_id, request_created_at,
  request_type, form_name, email, manager_id, manager_login,
  branch_id, branch_name, contract_id, contract_total, code, codes
)
SELECT
  'A' || a.internet_request_id::text AS id_source,
  NULL::int, a.request_created_at, a.request_created_at, NULL::bigint,
  ARRAY[a.internet_request_id]::int[], a.internet_request_id,
  a.internet_request_id::text, a.request_created_at,
  NULL::text, NULL::text, a.email, NULL::bigint, NULL::text,
  NULL::bigint, 'synthetic'::text, NULL::bigint, NULL::numeric,
  a.code, JSONB_BUILD_ARRAY(a.code)
FROM raw.itcrm_analytics a
WHERE (
    a.code->>'gclid' IS NOT NULL AND a.code->>'gclid' != ''
    OR a.code->>'fb_lead_id' IS NOT NULL AND a.code->>'fb_lead_id' != ''
    OR a.code ? 'utm_source'
  )
  AND NOT EXISTS (
    SELECT 1 FROM raw.itcrm_internet_request_relation r
    WHERE r.id_request = a.internet_request_id
  )
ON CONFLICT (id_source) DO UPDATE SET
  code = COALESCE(EXCLUDED.code, tgt.code),
  codes = EXCLUDED.codes,
  row_updated_at = now();
```

### ШАГ 3: ЗАПУСТИТЬ N8N WORKFLOW

1. Запустить node `dashboards.crm_requests`
2. Запустить node `dashboards.crm_marketing_link`
3. Запустить node `dashboards.fact_leads`

---

## ✅ ПРОВЕРКА ПОСЛЕ ВЫПОЛНЕНИЯ

```sql
-- 1. Google Ads coverage
SELECT COUNT(*) FROM dashboards.crm_requests
WHERE code->>'gclid' IS NOT NULL AND code->>'gclid' != '';
-- Ожидаем: 357

-- 2. Facebook coverage
SELECT COUNT(*) FROM dashboards.crm_requests
WHERE code->>'fb_lead_id' IS NOT NULL AND code->>'fb_lead_id' != '';
-- Ожидаем: 877

-- 3. fact_leads обновлён
SELECT
  dominant_platform,
  COUNT(*) as leads,
  COUNT(*) FILTER (WHERE contract_amount > 0) as contracts
FROM dashboards.fact_leads
GROUP BY dominant_platform
ORDER BY leads DESC;
-- Ожидаем: google ~978, meta ~516, с контрактами

-- 4. Старые views удалены
SELECT COUNT(*) FROM pg_matviews
WHERE schemaname = 'dashboards' AND (matviewname LIKE 'v5_%' OR matviewname LIKE 'v6_%');
-- Ожидаем: 0
```

---

## 🎯 ФИНАЛЬНАЯ АРХИТЕКТУРА (ПРАВИЛЬНАЯ)

### RAW слой:
- `raw.itcrm_analytics` (4,498 events)
- `raw.fb_leads` (383 leads)
- `raw.google_ads_clicks` (192,815 clicks)

### DASHBOARDS слой:
- `dashboards.crm_requests` (17,027 requests) ← ОСНОВНАЯ
- `dashboards.crm_marketing_link` (UTM/gclid/fbclid извлечённые)
- `dashboards.fact_leads` (17,027 leads с атрибуцией) ← ФАКТ
- `dashboards.campaign_reference` (263 campaigns)
- `dashboards.google_ad_reference` (192,815)
- `dashboards.fb_ad_reference` (383)

### VIEWS (v7):
- `v7_contracts_with_attribution` ← КОНТРАКТЫ
- `v7_contracts_attribution_summary`
- `v7_contracts_by_google_campaign`
- `v7_contracts_by_meta_campaign`
- `v7_contracts_daily`
- `v7_leads_attribution_detail`
- `v7_attribution_summary`
- `v7_campaign_daily`

**ВСЁ ОСТАЛЬНОЕ - УДАЛИТЬ!**
