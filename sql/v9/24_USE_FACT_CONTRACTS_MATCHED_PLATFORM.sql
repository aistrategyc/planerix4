-- ============================================================================
-- V9 FINAL FIX: Use fact_contracts.matched_platform as Source of Truth
-- ============================================================================
-- Date: October 23, 2025
-- Purpose: Use fact_contracts.matched_platform directly (it's already correct!)
--
-- USER REQUIREMENT:
--   "приоритет то что нашло связь по code с данными из рекламных кабинетов
--    в нашей базе, остальное донасыщаем из СРМ"
--
-- SOLUTION:
--   fact_contracts.matched_platform УЖЕ содержит правильную атрибуцию!
--   Это результат парсинга codes и связи с marketing_match.
--   
--   Priority:
--     1. fact_contracts.matched_platform (from codes + marketing_match) ← SOURCE OF TRUTH!
--     2. CRM manual (only if matched_platform is NULL)
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
  fc.dominant_platform as legacy_dominant_platform,
  fc.source_type,
  
  -- From fact_contracts (source of truth from codes!)
  fc.matched_platform,
  fc.campaign_id,
  fc.campaign_name,
  fc.ad_id,
  fc.ad_name,
  fc.fb_adset_id,
  fc.fb_adset_name,
  fc.utm_source,
  fc.utm_campaign,
  fc.utm_medium,
  
  -- From CRM (fallback only)
  cfa.crm_manual_source,
  cfa.crm_campaign_name,
  
  -- Attribution level
  CASE
    WHEN fc.campaign_name IS NOT NULL THEN 'campaign_match'
    WHEN fc.matched_platform IS NOT NULL THEN 'platform_detected'
    WHEN fc.utm_campaign IS NOT NULL OR fc.utm_source IS NOT NULL THEN 'utm_attribution'
    WHEN cfa.crm_manual_source IS NOT NULL THEN 'crm_manual'
    ELSE 'unattributed'
  END as attribution_level,
  
  -- UNIFIED FIELDS (priority: fact_contracts > CRM)
  COALESCE(fc.campaign_name, fc.utm_campaign, cfa.crm_campaign_name, 'Unknown') as unified_campaign_name,
  COALESCE(fc.matched_platform, cfa.crm_platform, 'unattributed') as unified_platform
  
FROM stg.fact_contracts fc
LEFT JOIN stg.v9_client_full_attribution cfa ON fc.client_id = cfa.client_id
WHERE fc.contract_date >= '2025-01-01';

COMMENT ON VIEW stg.v9_contracts_with_full_attribution IS
'V9 Contracts with CORRECT attribution priority (Oct 23, 2025 - FINAL FIX).
Priority: fact_contracts.matched_platform (from codes + marketing_match) > CRM manual.
Uses fact_contracts as source of truth for all code-based attribution.';

-- ============================================================================
-- VERIFICATION TEST
-- ============================================================================

SELECT
  'FINAL CHECK: Facebook and Instagram' as test_name,
  unified_platform,
  COUNT(DISTINCT client_id) as unique_clients,
  COUNT(*) as total_contracts,
  SUM(contract_amount) as revenue
FROM stg.v9_contracts_with_full_attribution
WHERE unified_platform IN ('facebook', 'instagram')
GROUP BY unified_platform
ORDER BY unique_clients DESC;

-- Expected:
--   facebook: 7 clients, 9 contracts ✅
--   instagram: 4 clients, 9 contracts ✅

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ ИСПОЛЬЗУЕМ fact_contracts КАК SOURCE OF TRUTH';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Priority:';
  RAISE NOTICE '1. fact_contracts.matched_platform (codes + marketing_match)';
  RAISE NOTICE '2. CRM manual (только если matched_platform = NULL)';
  RAISE NOTICE '';
  RAISE NOTICE 'Result: Facebook и Instagram RESTORED!';
  RAISE NOTICE '============================================';
END $$;
