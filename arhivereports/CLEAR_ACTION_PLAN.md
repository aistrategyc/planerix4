# ✅ ЧЁТКИЙ ПЛАН - БЕЗ ВОДЫ

## ФАКТЫ:
- ✅ Google Ads: 6 contracts (3 gclid + 3 campaign)
- ✅ Facebook: 46 contracts (35 fb_lead + 10 fbclid + 1 organic)
- ✅ Email: 2 contracts
- ✅ Viber: 2 contracts
- ✅ Instagram: 1 contract
- ✅ Direct: 418 contracts
- **ИТОГО: 446 contracts, 57 с paid attribution (12.8%)**

---

## ДЕЙСТВИЕ 1: УДАЛИТЬ СТАРЫЕ VIEWS

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

## ДЕЙСТВИЕ 2: ОБНОВИТЬ N8N NODE "dashboards.crm_requests"

### Файл: `2 dashboards-2.json`

### Изменение 1: CTE `last_code` (строка ~130)

**ЗАМЕНИТЬ**:
```sql
ORDER BY r.id_source, a.analytic_id DESC
```

**НА**:
```sql
ORDER BY
  r.id_source,
  CASE WHEN a.code->>'gclid' IS NOT NULL AND a.code->>'gclid' != '' THEN 1 ELSE 99 END,
  CASE WHEN a.code->>'fb_lead_id' IS NOT NULL AND a.code->>'fb_lead_id' != '' THEN 2 ELSE 99 END,
  CASE WHEN a.code->>'fbclid' IS NOT NULL AND a.code->>'fbclid' != '' THEN 3 ELSE 99 END,
  CASE WHEN a.code ? 'utm_source' THEN 4 ELSE 99 END,
  a.analytic_id DESC
```

### Изменение 2: ДОБАВИТЬ после основного INSERT

```sql
INSERT INTO dashboards.crm_requests AS tgt (
  id_source, source_type, source_date_time, source_updated_at, id_uniq,
  request_ids, primary_request_id, internet_request_id, request_created_at,
  request_type, form_name, email, manager_id, manager_login, branch_id,
  branch_name, contract_id, contract_total, code, codes
)
SELECT
  'A' || a.internet_request_id::text, NULL::int, a.request_created_at,
  a.request_created_at, NULL::bigint, ARRAY[a.internet_request_id]::int[],
  a.internet_request_id, a.internet_request_id::text, a.request_created_at,
  NULL::text, NULL::text, a.email, NULL::bigint, NULL::text, NULL::bigint,
  'synthetic'::text, NULL::bigint, NULL::numeric, a.code, JSONB_BUILD_ARRAY(a.code)
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

---

## ДЕЙСТВИЕ 3: ЗАПУСТИТЬ BACKFILL

```bash
# В n8n UI или через SQL:
# 1. Execute node "dashboards.crm_requests"
# 2. Execute node "dashboards.crm_marketing_link"
# 3. Execute node "dashboards.fact_leads"
```

---

## ПРОВЕРКА:

```sql
-- 1. Старые views удалены
SELECT COUNT(*) FROM pg_matviews WHERE schemaname='dashboards' AND matviewname LIKE 'v5_%';
-- Ожидаем: 0

-- 2. Google coverage улучшен
SELECT COUNT(*) FROM dashboards.crm_requests WHERE code->>'gclid' != '';
-- Было: 128, Ожидаем: 357

-- 3. Contracts attribution
SELECT attribution_type, COUNT(*) FROM dashboards.v7_contracts_with_attribution GROUP BY attribution_type;
-- Ожидаем: facebook_lead ~35, google ~6, и т.д.
```

---

## ФИНАЛЬНАЯ АРХИТЕКТУРА:

### ПРАВИЛЬНЫЕ ТАБЛИЦЫ (ОСТАВИТЬ):
- `dashboards.crm_requests` ← ЦЕНТРАЛЬНАЯ
- `dashboards.fact_leads` ← ОСНОВНОЙ ФАКТ
- `dashboards.campaign_reference`
- `dashboards.google_ad_reference`
- `dashboards.fb_ad_reference`

### ПРАВИЛЬНЫЕ VIEWS (ОСТАВИТЬ):
- `v7_contracts_with_attribution` ← CONTRACTS
- `v7_contracts_attribution_summary`
- `v7_contracts_by_google_campaign`
- `v7_contracts_by_meta_campaign`
- `v7_leads_attribution_detail`
- `v7_campaign_daily`

### УДАЛИТЬ:
- Все v5_* (16 объектов)
- Все v6_* (32 объекта)
- dim_contract, dim_lead, fact_contract (старая архитектура)

**ВСЁ!**
