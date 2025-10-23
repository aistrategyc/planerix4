-- ============================================================================
-- V9 CREATE MISSING CONTRACT VIEWS (Fixed)
-- ============================================================================
-- Date: October 23, 2025
-- Purpose: Create missing views that failed in file 19 due to SQL errors
--
-- Missing Views:
--   1. v9_contracts_by_campaign (GROUP BY error fixed)
--   2. v9_platform_daily_overview (wrong join key fixed)
--   3. v9_marketing_funnel_complete (wrong join key fixed)
-- ============================================================================

-- ============================================================================
-- VIEW 1: v9_contracts_by_campaign
-- ============================================================================

DROP VIEW IF EXISTS stg.v9_contracts_by_campaign CASCADE;

CREATE OR REPLACE VIEW stg.v9_contracts_by_campaign AS
WITH contracts_enriched AS (
  SELECT
    fc.contract_source_id,
    fc.client_id,
    fc.contract_date,
    fc.contract_day,
    fc.contract_amount,
    fc.days_to_contract,
    cfa.unified_platform,
    cfa.unified_campaign_name,
    cfa.attribution_level
  FROM stg.fact_contracts fc
  LEFT JOIN stg.v9_client_full_attribution cfa ON fc.client_id = cfa.client_id
  WHERE fc.contract_date >= '2025-01-01'
    AND cfa.unified_campaign_name IS NOT NULL
    AND cfa.unified_campaign_name != 'Unknown'
)
SELECT
  unified_platform,
  unified_campaign_name,
  attribution_level,
  COUNT(*) as contracts,
  SUM(contract_amount) as revenue,
  ROUND(AVG(contract_amount), 2) as avg_contract_value,
  ROUND(AVG(days_to_contract), 2) as avg_days_to_close,
  MIN(contract_day) as first_contract,
  MAX(contract_day) as last_contract
FROM contracts_enriched
GROUP BY unified_platform, unified_campaign_name, attribution_level
ORDER BY revenue DESC NULLS LAST;

COMMENT ON VIEW stg.v9_contracts_by_campaign IS
'V9 Contracts grouped by campaign (Oct 23, 2025).
Uses unified_platform and unified_campaign_name from v9_client_full_attribution.
Shows campaign_match, utm_attribution, utm_source_only, crm_manual levels.';

-- ============================================================================
-- VIEW 2: v9_platform_daily_overview
-- ============================================================================

DROP VIEW IF EXISTS stg.v9_platform_daily_overview CASCADE;

CREATE OR REPLACE VIEW stg.v9_platform_daily_overview AS
WITH leads_with_attribution AS (
  SELECT
    fl.lead_day,
    fl.client_id,
    cfa.unified_platform
  FROM stg.fact_leads fl
  LEFT JOIN stg.v9_client_full_attribution cfa ON fl.client_id = cfa.client_id
  WHERE fl.lead_day >= '2025-01-01'
),
contracts_with_attribution AS (
  SELECT
    fc.contract_day,
    fc.client_id,
    fc.contract_amount,
    cfa.unified_platform
  FROM stg.fact_contracts fc
  LEFT JOIN stg.v9_client_full_attribution cfa ON fc.client_id = cfa.client_id
  WHERE fc.contract_date >= '2025-01-01'
),
daily_metrics AS (
  SELECT
    lead_day as dt,
    unified_platform as platform,
    COUNT(DISTINCT client_id) as leads,
    0 as contracts,
    0 as revenue
  FROM leads_with_attribution
  GROUP BY lead_day, unified_platform

  UNION ALL

  SELECT
    contract_day as dt,
    unified_platform as platform,
    0 as leads,
    COUNT(DISTINCT client_id) as contracts,
    SUM(contract_amount) as revenue
  FROM contracts_with_attribution
  GROUP BY contract_day, unified_platform
)
SELECT
  dt,
  platform,
  SUM(leads) as leads,
  SUM(contracts) as contracts,
  SUM(revenue) as revenue,
  CASE
    WHEN SUM(leads) > 0 THEN ROUND(100.0 * SUM(contracts) / SUM(leads), 2)
    ELSE 0
  END as conversion_rate
FROM daily_metrics
GROUP BY dt, platform
ORDER BY dt DESC, leads DESC;

COMMENT ON VIEW stg.v9_platform_daily_overview IS
'V9 Platform daily performance (Oct 23, 2025).
Uses unified_platform from v9_client_full_attribution.
Shows leads, contracts, revenue, and conversion rate per day per platform.';

-- ============================================================================
-- VIEW 3: v9_marketing_funnel_complete
-- ============================================================================

DROP VIEW IF EXISTS stg.v9_marketing_funnel_complete CASCADE;

CREATE OR REPLACE VIEW stg.v9_marketing_funnel_complete AS
WITH leads_by_platform AS (
  SELECT
    cfa.unified_platform as platform,
    COUNT(DISTINCT fl.client_id) as leads
  FROM stg.fact_leads fl
  LEFT JOIN stg.v9_client_full_attribution cfa ON fl.client_id = cfa.client_id
  WHERE fl.lead_day >= '2025-01-01'
  GROUP BY cfa.unified_platform
),
contracts_by_platform AS (
  SELECT
    cfa.unified_platform as platform,
    COUNT(DISTINCT fc.client_id) as contracts,
    SUM(fc.contract_amount) as revenue,
    AVG(fc.contract_amount) as avg_contract_value
  FROM stg.fact_contracts fc
  LEFT JOIN stg.v9_client_full_attribution cfa ON fc.client_id = cfa.client_id
  WHERE fc.contract_date >= '2025-01-01'
  GROUP BY cfa.unified_platform
)
SELECT
  COALESCE(l.platform, c.platform, 'unattributed') as platform,
  COALESCE(l.leads, 0) as leads,
  COALESCE(c.contracts, 0) as contracts,
  COALESCE(c.revenue, 0) as revenue,
  ROUND(COALESCE(c.avg_contract_value, 0), 2) as avg_contract_value,
  CASE
    WHEN COALESCE(l.leads, 0) > 0
    THEN ROUND(100.0 * COALESCE(c.contracts, 0) / l.leads, 2)
    ELSE 0
  END as conversion_rate
FROM leads_by_platform l
FULL OUTER JOIN contracts_by_platform c ON l.platform = c.platform
ORDER BY contracts DESC NULLS LAST;

COMMENT ON VIEW stg.v9_marketing_funnel_complete IS
'V9 Marketing funnel by platform (Oct 23, 2025).
Uses unified_platform from v9_client_full_attribution.
Shows complete funnel: leads → contracts → revenue with conversion rates.';

-- ============================================================================
-- VERIFICATION TESTS
-- ============================================================================

-- Test 1: v9_contracts_by_campaign - check data
SELECT
  'v9_contracts_by_campaign' as view_name,
  COUNT(*) as total_campaigns,
  SUM(contracts) as total_contracts,
  SUM(revenue) as total_revenue
FROM stg.v9_contracts_by_campaign;

-- Test 2: v9_platform_daily_overview - check recent data
SELECT
  'v9_platform_daily_overview - Recent 5 days' as test_name,
  dt,
  platform,
  leads,
  contracts,
  revenue
FROM stg.v9_platform_daily_overview
WHERE dt >= CURRENT_DATE - INTERVAL '5 days'
ORDER BY dt DESC, leads DESC
LIMIT 10;

-- Test 3: v9_marketing_funnel_complete - platform summary
SELECT
  'v9_marketing_funnel_complete - Platforms' as test_name,
  platform,
  leads,
  contracts,
  revenue,
  conversion_rate
FROM stg.v9_marketing_funnel_complete
ORDER BY contracts DESC;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ MISSING CONTRACT VIEWS CREATED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Views Created:';
  RAISE NOTICE '1. stg.v9_contracts_by_campaign';
  RAISE NOTICE '2. stg.v9_platform_daily_overview';
  RAISE NOTICE '3. stg.v9_marketing_funnel_complete';
  RAISE NOTICE '';
  RAISE NOTICE 'All views use:';
  RAISE NOTICE '- stg.v9_client_full_attribution (with CRM manual source)';
  RAISE NOTICE '- unified_platform (google, facebook, instagram, telegram, viber, email, event, organic, other, unattributed)';
  RAISE NOTICE '- attribution_level (campaign_match, utm_attribution, utm_source_only, crm_manual, unattributed)';
  RAISE NOTICE '============================================';
END $$;
