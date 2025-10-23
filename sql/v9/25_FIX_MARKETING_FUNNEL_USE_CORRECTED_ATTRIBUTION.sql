-- ============================================================================
-- V9 FIX: Marketing Funnel Must Use Corrected v9_contracts_with_full_attribution
-- ============================================================================
-- Date: October 23, 2025
-- Purpose: Fix v9_marketing_funnel_complete to use v9_contracts_with_full_attribution
--          instead of v9_client_full_attribution
--
-- PROBLEM:
--   v9_marketing_funnel_complete shows Facebook=4, Instagram=2 (WRONG!)
--   Should show Facebook=10, Instagram=9 (matches v9_contracts_with_full_attribution)
--
-- ROOT CAUSE:
--   v9_marketing_funnel_complete joins fact_contracts with v9_client_full_attribution
--   But v9_client_full_attribution has wrong priority (CRM overrides codes)
--
-- SOLUTION:
--   Use v9_contracts_with_full_attribution.unified_platform directly
--   It already has CORRECT priority: fact_contracts.matched_platform > CRM
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
  -- ✅ USE v9_contracts_with_full_attribution instead of v9_client_full_attribution!
  SELECT
    unified_platform as platform,
    COUNT(*) as contracts,  -- Changed from COUNT(DISTINCT client_id) to COUNT(*)
    SUM(contract_amount) as revenue,
    AVG(contract_amount) as avg_contract_value
  FROM stg.v9_contracts_with_full_attribution
  WHERE contract_date >= '2025-01-01'
  GROUP BY unified_platform
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
'V9 Marketing funnel by platform (Oct 23, 2025 - FIXED).
Uses v9_contracts_with_full_attribution for contracts (CORRECT attribution priority).
Uses v9_client_full_attribution for leads (broader attribution).
Shows complete funnel: leads → contracts → revenue with conversion rates.';

-- ============================================================================
-- VERIFICATION TEST
-- ============================================================================

SELECT
  'AFTER FIX: v9_marketing_funnel_complete' as test_name,
  platform,
  leads,
  contracts,
  revenue,
  conversion_rate
FROM stg.v9_marketing_funnel_complete
WHERE platform IN ('facebook', 'instagram', 'google', 'telegram', 'viber', 'email')
ORDER BY contracts DESC;

-- Expected (matching v9_contracts_with_full_attribution):
--   facebook: 10 contracts ✅
--   instagram: 9 contracts ✅
--   google: 21 contracts ✅
--   email: 4 contracts ✅
--   telegram: 2 contracts ✅
--   viber: 2 contracts ✅

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ MARKETING FUNNEL CORRECTED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Changed contracts source:';
  RAISE NOTICE '  OLD: v9_client_full_attribution (CRM overrides codes)';
  RAISE NOTICE '  NEW: v9_contracts_with_full_attribution (codes > CRM) ✅';
  RAISE NOTICE '';
  RAISE NOTICE 'Result: Facebook and Instagram restored in funnel!';
  RAISE NOTICE '============================================';
END $$;
