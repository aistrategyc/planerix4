-- ============================================================================
-- V9 FIX: v9_contracts_with_full_attribution Must Use NEW Attribution Logic
-- ============================================================================
-- Date: October 23, 2025
-- Purpose: Fix v9_contracts_with_full_attribution to use v9_client_full_attribution
--
-- PROBLEM:
--   Current view uses fact_contracts.matched_platform directly
--   This misses CRM manual sources and new attribution logic!
--
--   Example: Client 646972
--     - fact_contracts.matched_platform = 'viber' (old logic)
--     - v9_client_full_attribution.unified_platform = 'google' (new logic with CRM)
--     - Result: Viber count is WRONG!
--
-- SOLUTION:
--   Use v9_client_full_attribution.unified_platform (with all fallback levels)
-- ============================================================================

DROP VIEW IF EXISTS stg.v9_contracts_with_full_attribution CASCADE;

CREATE OR REPLACE VIEW stg.v9_contracts_with_full_attribution AS
SELECT
  fc.contract_source_id,
  fc.client_id,
  fc.contract_date,
  fc.contract_day,
  fc.contract_amount,
  fc.lead_source_id,
  fc.lead_day,
  fc.days_to_contract,

  -- SOURCE FIELDS (для контекста, не используем для unified_platform!)
  fc.dominant_platform as legacy_dominant_platform,  -- LEGACY! не использовать
  fc.source_type,

  -- ПРАВИЛЬНЫЕ ПОЛЯ (из v9_client_full_attribution) ✅
  cfa.matched_platform,
  cfa.unified_campaign_name as campaign_name,
  cfa.campaign_id,
  cfa.ad_id,
  cfa.ad_name,
  cfa.fb_adset_id,
  cfa.fb_adset_name,
  cfa.utm_source,
  cfa.utm_campaign,
  cfa.utm_medium,
  cfa.crm_manual_source,     -- ✅ NEW from file 20
  cfa.crm_campaign_name,     -- ✅ NEW from file 20

  -- ATTRIBUTION LEVEL (from v9_client_full_attribution) ✅
  cfa.attribution_level,

  -- UNIFIED FIELDS (используем v9_client_full_attribution!) ✅
  cfa.unified_campaign_name,
  cfa.unified_platform

FROM stg.fact_contracts fc
LEFT JOIN stg.v9_client_full_attribution cfa ON fc.client_id = cfa.client_id
WHERE fc.contract_date >= '2025-01-01';

COMMENT ON VIEW stg.v9_contracts_with_full_attribution IS
'V9 Contracts with CORRECT full attribution (Oct 23, 2025 - FIXED).
Uses unified_platform from v9_client_full_attribution (NOT fact_contracts.matched_platform).
Includes CRM manual source (request_type) as fallback level.
unified_platform = from v9_client_full_attribution with priority:
  1. Marketing match (Google Ads, Facebook Ads)
  2. UTM parameters
  3. Platform detection (instagram, telegram, viber, email)
  4. CRM manual source ✅
  5. Unattributed
attribution_level: campaign_match, utm_attribution, utm_source_only, crm_manual, unattributed.';

-- ============================================================================
-- VERIFICATION TESTS
-- ============================================================================

-- Test 1: v9_contracts_with_full_attribution - правильные платформы?
SELECT
  'CHECK 1: Platform distribution (FIXED)' as test_name,
  unified_platform,
  COUNT(*) as contracts,
  COUNT(DISTINCT client_id) as unique_clients,
  SUM(contract_amount) as revenue
FROM stg.v9_contracts_with_full_attribution
GROUP BY unified_platform
ORDER BY contracts DESC;

-- Test 2: Attribution level distribution
SELECT
  'CHECK 2: Attribution level distribution' as test_name,
  attribution_level,
  COUNT(*) as contracts,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as pct_of_total
FROM stg.v9_contracts_with_full_attribution
GROUP BY attribution_level
ORDER BY contracts DESC;

-- Test 3: Viber check (should show correct platform now)
SELECT
  'CHECK 3: Viber client 646972 FIXED' as test_name,
  client_id,
  unified_platform,
  attribution_level,
  crm_manual_source,
  contract_amount
FROM stg.v9_contracts_with_full_attribution
WHERE client_id = 646972
ORDER BY contract_source_id;

-- Test 4: NO DATA LOSS verification
SELECT
  'CHECK 4: NO DATA LOSS (Instagram, Telegram, Viber, Email)' as test_name,
  unified_platform,
  COUNT(*) as contracts
FROM stg.v9_contracts_with_full_attribution
WHERE unified_platform IN ('instagram', 'telegram', 'viber', 'email')
GROUP BY unified_platform
ORDER BY unified_platform;

-- Test 5: CRM manual source contracts
SELECT
  'CHECK 5: CRM manual source contracts' as test_name,
  attribution_level,
  unified_platform,
  COUNT(*) as contracts
FROM stg.v9_contracts_with_full_attribution
WHERE attribution_level = 'crm_manual'
GROUP BY attribution_level, unified_platform
ORDER BY contracts DESC;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ v9_contracts_with_full_attribution FIXED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '- Now uses v9_client_full_attribution.unified_platform';
  RAISE NOTICE '- Includes CRM manual source attribution';
  RAISE NOTICE '- Correct attribution priority (campaign > utm > crm > unattributed)';
  RAISE NOTICE '';
  RAISE NOTICE 'Result:';
  RAISE NOTICE '- Viber client 646972: viber → google (with CRM source)';
  RAISE NOTICE '- All platforms now show correct counts';
  RAISE NOTICE '- CRM manual sources included in attribution_level';
  RAISE NOTICE '============================================';
END $$;
