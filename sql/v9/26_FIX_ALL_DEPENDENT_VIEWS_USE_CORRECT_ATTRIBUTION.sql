-- ============================================================================
-- V9 FIX: All Dependent Views Must Use v9_contracts_with_full_attribution
-- ============================================================================
-- Date: October 23, 2025
-- Purpose: Fix ALL dependent views to use v9_contracts_with_full_attribution
--          for contract attribution (not v9_client_full_attribution)
--
-- AFFECTED VIEWS:
--   1. v9_contracts_by_campaign - Shows Facebook=4 instead of 10 ❌
--   2. v9_platform_daily_overview - Uses wrong attribution ❌
--
-- NOTE: v9_marketing_funnel_complete already fixed in file 25 ✅
-- ============================================================================

-- ============================================================================
-- VIEW 1: v9_contracts_by_campaign (FIXED)
-- ============================================================================

DROP VIEW IF EXISTS stg.v9_contracts_by_campaign CASCADE;

CREATE OR REPLACE VIEW stg.v9_contracts_by_campaign AS
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
FROM stg.v9_contracts_with_full_attribution
WHERE contract_date >= '2025-01-01'
  AND unified_campaign_name IS NOT NULL
  AND unified_campaign_name != 'Unknown'
GROUP BY unified_platform, unified_campaign_name, attribution_level
ORDER BY revenue DESC NULLS LAST;

COMMENT ON VIEW stg.v9_contracts_by_campaign IS
'V9 Contracts grouped by campaign (Oct 23, 2025 - FIXED).
Uses v9_contracts_with_full_attribution (CORRECT attribution: codes > CRM).
Shows only contracts with campaign attribution (campaign_name != Unknown).';

-- ============================================================================
-- VIEW 2: v9_platform_daily_overview (FIXED)
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
  -- ✅ USE v9_contracts_with_full_attribution instead!
  SELECT
    contract_day,
    client_id,
    contract_amount,
    unified_platform
  FROM stg.v9_contracts_with_full_attribution
  WHERE contract_date >= '2025-01-01'
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
    COUNT(*) as contracts,  -- Changed from COUNT(DISTINCT client_id)
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
'V9 Platform daily performance (Oct 23, 2025 - FIXED).
Uses v9_contracts_with_full_attribution for contracts (codes > CRM).
Uses v9_client_full_attribution for leads (broader attribution).
Shows leads, contracts, revenue, and conversion rate per day per platform.';

-- ============================================================================
-- VERIFICATION TESTS
-- ============================================================================

-- Test 1: v9_contracts_by_campaign - check Facebook and Instagram
SELECT
  '1. v9_contracts_by_campaign' as view_name,
  unified_platform,
  SUM(contracts) as total_contracts,
  SUM(revenue) as total_revenue
FROM stg.v9_contracts_by_campaign
WHERE unified_platform IN ('facebook', 'instagram')
GROUP BY unified_platform
ORDER BY unified_platform;

-- Test 2: v9_platform_daily_overview - recent data
SELECT
  '2. v9_platform_daily_overview - Total' as test_name,
  platform,
  SUM(contracts) as total_contracts
FROM stg.v9_platform_daily_overview
WHERE platform IN ('facebook', 'instagram', 'google')
GROUP BY platform
ORDER BY platform;

-- Test 3: Cross-view consistency check
SELECT
  'CONSISTENCY CHECK' as check_name,
  'Facebook' as platform,
  (SELECT COUNT(*) FROM stg.v9_contracts_with_full_attribution WHERE unified_platform = 'facebook') as base_view,
  (SELECT contracts FROM stg.v9_marketing_funnel_complete WHERE platform = 'facebook') as funnel_view,
  (SELECT SUM(contracts) FROM stg.v9_platform_daily_overview WHERE platform = 'facebook') as daily_view

UNION ALL

SELECT
  'CONSISTENCY CHECK',
  'Instagram',
  (SELECT COUNT(*) FROM stg.v9_contracts_with_full_attribution WHERE unified_platform = 'instagram'),
  (SELECT contracts FROM stg.v9_marketing_funnel_complete WHERE platform = 'instagram'),
  (SELECT SUM(contracts) FROM stg.v9_platform_daily_overview WHERE platform = 'instagram');

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ ALL DEPENDENT VIEWS FIXED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Updated views:';
  RAISE NOTICE '1. v9_contracts_by_campaign';
  RAISE NOTICE '2. v9_platform_daily_overview';
  RAISE NOTICE '';
  RAISE NOTICE 'All contract views now use:';
  RAISE NOTICE '  v9_contracts_with_full_attribution ✅';
  RAISE NOTICE '  (codes + marketing_match > CRM)';
  RAISE NOTICE '';
  RAISE NOTICE 'Lead attribution still uses:';
  RAISE NOTICE '  v9_client_full_attribution ✅';
  RAISE NOTICE '  (broader attribution for leads)';
  RAISE NOTICE '============================================';
END $$;
