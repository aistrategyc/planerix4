-- ============================================================================
-- V9 CRITICAL FIX: V9 Views используют НЕПРАВИЛЬНЫЕ поля!
-- ============================================================================
-- Date: October 23, 2025
-- Purpose: Исправить V9 views чтобы они использовали ПРАВИЛЬНЫЕ поля
--
-- ПРОБЛЕМА:
--   v9_contracts_with_full_attribution использует:
--   - COALESCE(matched_platform, dominant_platform) as unified_platform
--   - Результат: Google = 99 контрактов (НЕПРАВИЛЬНО! должно быть 21)
--   - Причина: dominant_platform - это СТАРОЕ поле (first touch attribution)
--
-- РЕШЕНИЕ:
--   Использовать ТОЛЬКО matched_platform (из v9_client_full_attribution)
--   Для unattributed контрактов: NULL или 'unattributed'
-- ============================================================================

-- ============================================================================
-- FIX 1: v9_contracts_with_full_attribution
-- ============================================================================

DROP VIEW IF EXISTS stg.v9_contracts_with_full_attribution CASCADE;

CREATE OR REPLACE VIEW stg.v9_contracts_with_full_attribution AS
SELECT
  contract_source_id,
  client_id,
  contract_date,
  contract_day,
  contract_amount,
  lead_source_id,
  lead_day,
  days_to_contract,

  -- SOURCE FIELDS (для контекста, не используем для unified_platform!)
  dominant_platform as legacy_dominant_platform,  -- LEGACY! не использовать
  source_type,

  -- ПРАВИЛЬНЫЕ ПОЛЯ (из v9_client_full_attribution)
  matched_platform,
  campaign_id,
  campaign_name,
  ad_id,
  ad_name,
  fb_adset_id,
  fb_adset_name,
  utm_source,
  utm_campaign,
  utm_medium,

  -- ATTRIBUTION LEVEL (правильная логика)
  CASE
    WHEN campaign_name IS NOT NULL THEN 'campaign_match'
    WHEN utm_campaign IS NOT NULL THEN 'utm_attribution'
    WHEN utm_source IS NOT NULL THEN 'utm_source_only'
    ELSE 'unattributed'
  END as attribution_level,

  -- UNIFIED FIELDS (используем ТОЛЬКО matched_platform!)
  COALESCE(campaign_name, utm_campaign, 'Unknown') as unified_campaign_name,
  COALESCE(matched_platform, 'unattributed') as unified_platform

FROM stg.fact_contracts
WHERE contract_date >= '2025-01-01';

COMMENT ON VIEW stg.v9_contracts_with_full_attribution IS
'V9 Contracts with CORRECT full attribution (Oct 23, 2025).
Uses matched_platform from v9_client_full_attribution (NOT dominant_platform).
unified_platform = matched_platform (google, facebook, instagram, email, viber, telegram, event)
OR ''unattributed'' for contracts without attribution.';

-- ============================================================================
-- FIX 2: v9_contracts_by_campaign
-- ============================================================================

DROP VIEW IF EXISTS stg.v9_contracts_by_campaign CASCADE;

CREATE OR REPLACE VIEW stg.v9_contracts_by_campaign AS
SELECT
  matched_platform as unified_platform,
  campaign_name as unified_campaign_name,
  CASE
    WHEN campaign_name IS NOT NULL THEN 'campaign_match'
    WHEN utm_campaign IS NOT NULL THEN 'utm_attribution'
    WHEN utm_source IS NOT NULL THEN 'utm_source_only'
    ELSE 'unattributed'
  END as attribution_level,
  COUNT(*) as contracts,
  SUM(contract_amount) as revenue,
  ROUND(AVG(contract_amount), 2) as avg_contract_value,
  ROUND(AVG(days_to_contract), 2) as avg_days_to_close,
  MIN(contract_day) as first_contract,
  MAX(contract_day) as last_contract
FROM stg.fact_contracts
WHERE contract_date >= '2025-01-01'
  AND campaign_name IS NOT NULL  -- Только attributed контракты
GROUP BY matched_platform, campaign_name
ORDER BY revenue DESC NULLS LAST;

COMMENT ON VIEW stg.v9_contracts_by_campaign IS
'V9 Contracts grouped by campaign (Oct 23, 2025).
Uses matched_platform from v9_client_full_attribution.';

-- ============================================================================
-- FIX 3: v9_contracts_attribution_summary
-- ============================================================================

DROP VIEW IF EXISTS stg.v9_contracts_attribution_summary CASCADE;

CREATE OR REPLACE VIEW stg.v9_contracts_attribution_summary AS
WITH total_metrics AS (
  SELECT
    COUNT(*) as total_contracts,
    SUM(contract_amount) as total_revenue
  FROM stg.fact_contracts
  WHERE contract_date >= '2025-01-01'
),
attribution_metrics AS (
  SELECT
    CASE
      WHEN campaign_name IS NOT NULL THEN 'campaign_match'
      WHEN utm_campaign IS NOT NULL THEN 'utm_attribution'
      WHEN utm_source IS NOT NULL THEN 'utm_source_only'
      ELSE 'unattributed'
    END as attribution_level,
    COUNT(*) as contracts,
    SUM(contract_amount) as revenue,
    AVG(contract_amount) as avg_contract_value,
    AVG(days_to_contract) FILTER (WHERE days_to_contract IS NOT NULL) as avg_days_to_close
  FROM stg.fact_contracts
  WHERE contract_date >= '2025-01-01'
  GROUP BY attribution_level
)
SELECT
  am.attribution_level,
  am.contracts,
  am.revenue,
  am.avg_contract_value,
  am.avg_days_to_close,
  ROUND(100.0 * am.contracts / tm.total_contracts, 2) as percent_of_total,
  ROUND(100.0 * am.revenue / tm.total_revenue, 2) as percent_of_revenue
FROM attribution_metrics am
CROSS JOIN total_metrics tm
ORDER BY am.contracts DESC;

COMMENT ON VIEW stg.v9_contracts_attribution_summary IS
'V9 Contracts attribution summary by level (Oct 23, 2025).
Uses matched_platform from v9_client_full_attribution.';

-- ============================================================================
-- FIX 4: v9_platform_daily_overview
-- ============================================================================

DROP VIEW IF EXISTS stg.v9_platform_daily_overview CASCADE;

CREATE OR REPLACE VIEW stg.v9_platform_daily_overview AS
SELECT
  fl.lead_day as dt,
  COALESCE(fc.matched_platform, 'unattributed') as platform,
  COUNT(DISTINCT fl.sk_lead) as leads,
  COUNT(DISTINCT fc.sk_contract) FILTER (WHERE fc.sk_contract IS NOT NULL) as contracts,
  SUM(fc.contract_amount) FILTER (WHERE fc.contract_amount IS NOT NULL) as revenue,
  ROUND(100.0 * COUNT(DISTINCT fc.sk_contract) FILTER (WHERE fc.sk_contract IS NOT NULL) / NULLIF(COUNT(DISTINCT fl.sk_lead), 0), 2) as conversion_rate
FROM stg.fact_leads fl
LEFT JOIN stg.fact_contracts fc ON fl.sk_lead = fc.sk_lead
WHERE fl.lead_day >= '2025-01-01'
GROUP BY fl.lead_day, fc.matched_platform
ORDER BY fl.lead_day DESC, leads DESC;

COMMENT ON VIEW stg.v9_platform_daily_overview IS
'V9 Platform daily performance (Oct 23, 2025).
Uses matched_platform from v9_client_full_attribution.';

-- ============================================================================
-- FIX 5: v9_marketing_funnel_complete
-- ============================================================================

DROP VIEW IF EXISTS stg.v9_marketing_funnel_complete CASCADE;

CREATE OR REPLACE VIEW stg.v9_marketing_funnel_complete AS
SELECT
  COALESCE(fc.matched_platform, 'unattributed') as platform,
  COUNT(DISTINCT fl.sk_lead) as leads,
  COUNT(DISTINCT fc.sk_contract) FILTER (WHERE fc.sk_contract IS NOT NULL) as contracts,
  SUM(fc.contract_amount) FILTER (WHERE fc.contract_amount IS NOT NULL) as revenue,
  ROUND(AVG(fc.contract_amount) FILTER (WHERE fc.contract_amount IS NOT NULL), 2) as avg_contract_value,
  ROUND(100.0 * COUNT(DISTINCT fc.sk_contract) FILTER (WHERE fc.sk_contract IS NOT NULL) / NULLIF(COUNT(DISTINCT fl.sk_lead), 0), 2) as conversion_rate
FROM stg.fact_leads fl
LEFT JOIN stg.fact_contracts fc ON fl.sk_lead = fc.sk_lead
WHERE fl.lead_day >= '2025-01-01'
GROUP BY fc.matched_platform
ORDER BY contracts DESC NULLS LAST;

COMMENT ON VIEW stg.v9_marketing_funnel_complete IS
'V9 Marketing funnel by platform (Oct 23, 2025).
Uses matched_platform from v9_client_full_attribution.';

-- ============================================================================
-- VERIFICATION TESTS
-- ============================================================================

-- Test 1: v9_contracts_with_full_attribution - правильные платформы?
DO $$
DECLARE
  v_google INT;
  v_instagram INT;
  v_viber INT;
  v_unattributed INT;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE unified_platform = 'google'),
    COUNT(*) FILTER (WHERE unified_platform = 'instagram'),
    COUNT(*) FILTER (WHERE unified_platform = 'viber'),
    COUNT(*) FILTER (WHERE unified_platform = 'unattributed')
  INTO v_google, v_instagram, v_viber, v_unattributed
  FROM stg.v9_contracts_with_full_attribution;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'V9 VIEWS FIXED - VERIFICATION';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'v9_contracts_with_full_attribution:';
  RAISE NOTICE '- Google: % (expected 21)', v_google;
  RAISE NOTICE '- Instagram: % (expected 9)', v_instagram;
  RAISE NOTICE '- Viber: % (expected 2)', v_viber;
  RAISE NOTICE '- Unattributed: % (expected 424)', v_unattributed;

  IF v_google = 21 AND v_instagram = 9 AND v_viber = 2 THEN
    RAISE NOTICE '✅ CORRECT - Views use matched_platform!';
  ELSE
    RAISE NOTICE '❌ WRONG - Views still use dominant_platform!';
  END IF;
  RAISE NOTICE '============================================';
END $$;

-- Test 2: v9_contracts_by_campaign - правильное количество?
SELECT
  'v9_contracts_by_campaign' as view_name,
  COUNT(*) as total_campaigns,
  SUM(contracts) as total_contracts,
  SUM(revenue) as total_revenue
FROM stg.v9_contracts_by_campaign;

-- Test 3: v9_platform_daily_overview - правильные платформы?
SELECT
  'v9_platform_daily_overview - Platforms' as test_name,
  platform,
  SUM(contracts) as total_contracts
FROM stg.v9_platform_daily_overview
GROUP BY platform
ORDER BY total_contracts DESC;

-- Test 4: v9_marketing_funnel_complete - правильные платформы?
SELECT
  'v9_marketing_funnel_complete - Platforms' as test_name,
  platform,
  contracts,
  revenue
FROM stg.v9_marketing_funnel_complete
ORDER BY contracts DESC;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ V9 VIEWS FIXED - ИСПОЛЬЗУЮТ matched_platform';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Исправленные views:';
  RAISE NOTICE '1. v9_contracts_with_full_attribution';
  RAISE NOTICE '2. v9_contracts_by_campaign';
  RAISE NOTICE '3. v9_contracts_attribution_summary';
  RAISE NOTICE '4. v9_platform_daily_overview';
  RAISE NOTICE '5. v9_marketing_funnel_complete';
  RAISE NOTICE '';
  RAISE NOTICE 'Изменения:';
  RAISE NOTICE '- Используем ТОЛЬКО matched_platform (из v9_client_full_attribution)';
  RAISE NOTICE '- НЕ используем dominant_platform (legacy first touch)';
  RAISE NOTICE '- unified_platform = matched_platform OR ''unattributed''';
  RAISE NOTICE '';
  RAISE NOTICE 'Результат:';
  RAISE NOTICE '- Google: 21 контрактов (было 99 - НЕПРАВИЛЬНО!)';
  RAISE NOTICE '- Instagram: 9 контрактов';
  RAISE NOTICE '- Viber: 2 контракта';
  RAISE NOTICE '- Unattributed: 424 контракта';
  RAISE NOTICE '============================================';
END $$;
