-- ============================================================================
-- УДАЛЕНИЕ СТАРЫХ VIEWS И ТАБЛИЦ (v5, v6, старая архитектура)
-- Дата: October 19, 2025
-- Причина: Переход на v8 views + правильная архитектура (crm_requests, fact_leads)
-- ============================================================================

BEGIN;

-- ============================================================================
-- УДАЛИТЬ v5_* MATERIALIZED VIEWS (14 объектов)
-- ============================================================================
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

-- ============================================================================
-- УДАЛИТЬ v5_* REGULAR VIEWS
-- ============================================================================
DROP VIEW IF EXISTS dashboards.v5_bi_campaign_daily CASCADE;
DROP VIEW IF EXISTS dashboards.v5_leads_source_daily_vw CASCADE;

-- ============================================================================
-- УДАЛИТЬ v6_* MATERIALIZED VIEWS (18 объектов)
-- ============================================================================
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

-- ============================================================================
-- УДАЛИТЬ v6_* REGULAR VIEWS (8 объектов)
-- ============================================================================
DROP VIEW IF EXISTS dashboards.v6_contract_bridge CASCADE;
DROP VIEW IF EXISTS dashboards.v6_contracts_ads_enriched CASCADE;
DROP VIEW IF EXISTS dashboards.v6_contracts_ads_enriched_by_id_source CASCADE;
DROP VIEW IF EXISTS dashboards.v6_data_freshness CASCADE;
DROP VIEW IF EXISTS dashboards.v6_data_quality_report CASCADE;
DROP VIEW IF EXISTS dashboards.v6_fb_contracts_detail_view CASCADE;
DROP VIEW IF EXISTS dashboards.v6_google_contracts_detail CASCADE;
DROP VIEW IF EXISTS dashboards.v6_platform_revenue_daily CASCADE;

-- ============================================================================
-- УДАЛИТЬ СТАРЫЕ MATVIEWS (неправильная архитектура)
-- ============================================================================
DROP MATERIALIZED VIEW IF EXISTS dashboards.contract_source_bridge_mv CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboards.crm_marketing_link_kvm CASCADE;

-- ============================================================================
-- УДАЛИТЬ СТАРЫЕ ТАБЛИЦЫ (неправильная архитектура - dim/fact pattern)
-- ============================================================================
DROP TABLE IF EXISTS dashboards.dim_contract CASCADE;
DROP TABLE IF EXISTS dashboards.dim_lead CASCADE;
DROP TABLE IF EXISTS dashboards.dim_campaign CASCADE;
DROP TABLE IF EXISTS dashboards.fact_contract CASCADE;
DROP TABLE IF EXISTS dashboards.fact_lead_request CASCADE;
DROP TABLE IF EXISTS dashboards.contract_attribution CASCADE;

COMMIT;

-- ============================================================================
-- ПРОВЕРКА РЕЗУЛЬТАТА
-- ============================================================================

-- Должно остаться только v7 и v8 views
SELECT
  'v5 views remaining' as check_name,
  COUNT(*) as count
FROM pg_matviews
WHERE schemaname = 'dashboards' AND matviewname LIKE 'v5_%'

UNION ALL

SELECT
  'v6 matviews remaining',
  COUNT(*)
FROM pg_matviews
WHERE schemaname = 'dashboards' AND matviewname LIKE 'v6_%'

UNION ALL

SELECT
  'v6 regular views remaining',
  COUNT(*)
FROM pg_views
WHERE schemaname = 'dashboards' AND viewname LIKE 'v6_%'

UNION ALL

SELECT
  'v7 views (KEEP)',
  COUNT(*)
FROM pg_views
WHERE schemaname = 'dashboards' AND viewname LIKE 'v7_%'

UNION ALL

SELECT
  'v8 views (KEEP)',
  COUNT(*)
FROM pg_views
WHERE schemaname = 'dashboards' AND viewname LIKE 'v8_%';

-- Должно быть 0, 0, 0, ~7, 3
