-- ============================================================================
-- V9 CONTRACT ATTRIBUTION IMPROVEMENT
-- ============================================================================
-- Problem: 193 contracts loaded but 0 have campaign attribution
-- Root Cause: Marketing_match only covers Facebook/Google with tracking IDs (gclid, fbclid)
-- Solution: Multi-level attribution with UTM fallback
-- Date: 22 октября 2025
-- ============================================================================

-- ============================================================================
-- ANALYSIS: Current State
-- ============================================================================
-- fact_contracts properly JOINs fact_leads (campaign attribution should work)
-- fact_leads properly JOINs marketing_match (campaign data should flow)
-- BUT marketing_match only covers:
--   - Facebook: 41 first_touch events → 17 (41.46%) with campaign_name
--   - Google: 108 first_touch events → 11 (10.19%) with campaign_name
--   - Total coverage: 28/4570 (0.61%) first_touch events
--
-- WHY SO LOW:
--   - Form (2,569), Direct (1,837), Event (15) don't have campaigns
--   - Google: only 15/108 have gclid (93 classified via UTM but no gclid)
--   - Facebook: only 41 detected (rest may use UTM)
--
-- SOLUTION: Use UTM data as fallback when marketing_match not available

-- ============================================================================
-- No changes needed to tables - fact_leads/contracts already have UTM fields
-- We just need to ensure UTM attribution is visible in contracts
-- ============================================================================

-- ============================================================================
-- TEST 1: Check current contract attribution state
-- ============================================================================
SELECT
  'CONTRACTS ATTRIBUTION BEFORE' as test_stage,
  COUNT(*) as total_contracts,
  COUNT(*) FILTER (WHERE matched_platform IS NOT NULL) as with_matched_platform,
  COUNT(*) FILTER (WHERE campaign_name IS NOT NULL) as with_campaign_name,
  COUNT(*) FILTER (WHERE utm_campaign IS NOT NULL) as with_utm_campaign,
  ROUND(100.0 * COUNT(*) FILTER (WHERE campaign_name IS NOT NULL) / COUNT(*), 2) as campaign_coverage_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE utm_campaign IS NOT NULL) / COUNT(*), 2) as utm_coverage_pct
FROM stg.fact_contracts;

-- ============================================================================
-- TEST 2: Detailed breakdown by platform
-- ============================================================================
SELECT
  'Contracts by Platform' as analysis,
  dominant_platform,
  COUNT(*) as contracts,
  SUM(contract_amount) as revenue,
  COUNT(*) FILTER (WHERE matched_platform IS NOT NULL) as with_campaign_match,
  COUNT(*) FILTER (WHERE utm_campaign IS NOT NULL) as with_utm_campaign,
  ROUND(100.0 * COUNT(*) FILTER (WHERE matched_platform IS NOT NULL) / COUNT(*), 2) as campaign_match_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE utm_campaign IS NOT NULL) / COUNT(*), 2) as utm_pct
FROM stg.fact_contracts
GROUP BY dominant_platform
ORDER BY contracts DESC;

-- ============================================================================
-- VIEW: v9_contracts_with_full_attribution
-- Multi-level attribution view for contracts
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_contracts_with_full_attribution AS
SELECT
  contract_source_id,
  client_id,
  contract_date,
  contract_day,
  contract_amount,

  -- Lead details
  lead_source_id,
  lead_day,
  days_to_contract,

  -- LEVEL 1: Platform classification
  dominant_platform,
  source_type,

  -- LEVEL 2: Campaign match (most detailed - from marketing_match)
  matched_platform as campaign_matched_platform,
  campaign_id,
  campaign_name,
  ad_id,
  ad_name,
  fb_adset_id,
  fb_adset_name,

  -- LEVEL 3: UTM attribution (fallback when no campaign match)
  utm_source,
  utm_campaign,
  utm_medium,

  -- Attribution quality indicator
  CASE
    WHEN campaign_name IS NOT NULL THEN 'campaign_match'  -- Best: Full campaign details
    WHEN utm_campaign IS NOT NULL THEN 'utm_attribution'  -- Good: UTM tracking
    WHEN utm_source IS NOT NULL THEN 'utm_source_only'    -- Basic: Source only
    WHEN dominant_platform != 'direct' THEN 'platform_inferred'  -- Minimal: Platform classification
    ELSE 'unattributed'  -- Unknown
  END as attribution_level,

  -- Unified campaign name (for reporting)
  COALESCE(campaign_name, utm_campaign, 'Unknown Campaign') as unified_campaign_name,

  -- Unified platform (for reporting)
  COALESCE(matched_platform, dominant_platform, 'direct') as unified_platform

FROM stg.fact_contracts
WHERE contract_date >= '2025-01-01';

COMMENT ON VIEW stg.v9_contracts_with_full_attribution IS 'V9: Contracts with multi-level attribution (campaign match → UTM → platform)';

-- ============================================================================
-- VIEW: v9_contracts_attribution_summary
-- Summary of contract attribution by level
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_contracts_attribution_summary AS
SELECT
  attribution_level,
  COUNT(*) as contracts,
  SUM(contract_amount) as revenue,
  ROUND(AVG(contract_amount), 0) as avg_contract_value,
  ROUND(AVG(days_to_contract), 1) as avg_days_to_close,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percent_of_total,
  ROUND(100.0 * SUM(contract_amount) / SUM(SUM(contract_amount)) OVER(), 2) as percent_of_revenue
FROM stg.v9_contracts_with_full_attribution
GROUP BY attribution_level
ORDER BY
  CASE attribution_level
    WHEN 'campaign_match' THEN 1
    WHEN 'utm_attribution' THEN 2
    WHEN 'utm_source_only' THEN 3
    WHEN 'platform_inferred' THEN 4
    ELSE 5
  END;

COMMENT ON VIEW stg.v9_contracts_attribution_summary IS 'V9: Contract attribution quality breakdown';

-- ============================================================================
-- VIEW: v9_contracts_by_campaign
-- Contracts grouped by campaign (campaign_match or UTM fallback)
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_contracts_by_campaign AS
SELECT
  unified_platform,
  unified_campaign_name,
  attribution_level,

  -- Metrics
  COUNT(*) as contracts,
  SUM(contract_amount) as revenue,
  ROUND(AVG(contract_amount), 0) as avg_contract_value,
  ROUND(AVG(days_to_contract), 1) as avg_days_to_close,

  -- Date range
  MIN(contract_day) as first_contract,
  MAX(contract_day) as last_contract,

  -- Attribution details
  COUNT(DISTINCT CASE WHEN campaign_name IS NOT NULL THEN campaign_id END) as unique_matched_campaigns,
  COUNT(*) FILTER (WHERE campaign_name IS NOT NULL) as with_full_campaign_details

FROM stg.v9_contracts_with_full_attribution
WHERE unified_campaign_name != 'Unknown Campaign'
GROUP BY unified_platform, unified_campaign_name, attribution_level
HAVING COUNT(*) > 0
ORDER BY revenue DESC, contracts DESC;

COMMENT ON VIEW stg.v9_contracts_by_campaign IS 'V9: Contracts grouped by campaign (multi-level attribution)';

-- ============================================================================
-- VIEW: v9_campaign_performance_with_contracts
-- Full funnel: Spend → Leads → Contracts → Revenue
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_campaign_performance_with_contracts AS
WITH facebook_campaigns AS (
  SELECT
    'facebook' as platform,
    fc.name as campaign_name,
    SUM(fbi.spend) as total_spend,
    SUM(fbi.clicks) as total_clicks
  FROM raw.fb_ad_insights fbi
  INNER JOIN raw.fb_campaigns fc ON fbi.campaign_id = fc.campaign_id
  WHERE fbi.date_start >= '2025-01-01'
  GROUP BY fc.name
),
google_campaigns AS (
  SELECT
    'google' as platform,
    campaign_name,
    SUM(cost_micros) / 1000000.0 as total_spend,
    SUM(clicks) as total_clicks
  FROM raw.google_ads_campaign_daily
  WHERE date >= '2025-01-01'
  GROUP BY campaign_name
),
all_campaigns AS (
  SELECT * FROM facebook_campaigns
  UNION ALL
  SELECT * FROM google_campaigns
),
campaign_leads AS (
  SELECT
    COALESCE(matched_platform, dominant_platform) as platform,
    COALESCE(campaign_name, utm_campaign) as campaign_name,
    COUNT(DISTINCT client_id) as total_leads
  FROM stg.fact_leads
  WHERE lead_day >= '2025-01-01'
    AND (campaign_name IS NOT NULL OR utm_campaign IS NOT NULL)
  GROUP BY COALESCE(matched_platform, dominant_platform), COALESCE(campaign_name, utm_campaign)
),
campaign_contracts AS (
  SELECT
    unified_platform,
    unified_campaign_name,
    COUNT(*) as total_contracts,
    SUM(contract_amount) as total_revenue
  FROM stg.v9_contracts_with_full_attribution
  WHERE unified_campaign_name != 'Unknown Campaign'
  GROUP BY unified_platform, unified_campaign_name
)
SELECT
  c.platform,
  c.campaign_name,

  -- Spend
  c.total_spend,
  c.total_clicks,

  -- Leads
  COALESCE(l.total_leads, 0) as leads,

  -- Contracts
  COALESCE(con.total_contracts, 0) as contracts,
  COALESCE(con.total_revenue, 0) as revenue,

  -- Performance metrics
  CASE WHEN c.total_spend > 0 THEN ROUND(c.total_spend / NULLIF(l.total_leads, 0), 2) ELSE NULL END as cpl,
  CASE WHEN c.total_spend > 0 THEN ROUND(c.total_spend / NULLIF(con.total_contracts, 0), 2) ELSE NULL END as cpa,
  CASE WHEN c.total_spend > 0 THEN ROUND(con.total_revenue / NULLIF(c.total_spend, 0), 2) ELSE NULL END as roas,
  ROUND(100.0 * con.total_contracts / NULLIF(l.total_leads, 0), 2) as conversion_rate

FROM all_campaigns c
LEFT JOIN campaign_leads l ON c.platform = l.platform AND c.campaign_name = l.campaign_name
LEFT JOIN campaign_contracts con ON c.platform = con.unified_platform AND c.campaign_name = con.unified_campaign_name
WHERE c.total_spend > 0
ORDER BY c.total_spend DESC;

COMMENT ON VIEW stg.v9_campaign_performance_with_contracts IS 'V9: Full funnel campaign performance (Spend → Leads → Contracts → Revenue)';

-- ============================================================================
-- SUCCESS CHECKS
-- ============================================================================

-- Check 1: Attribution improvement
SELECT
  'AFTER VIEWS CREATED' as test_stage,
  COUNT(*) as total_contracts,
  COUNT(*) FILTER (WHERE campaign_name IS NOT NULL) as with_campaign_match,
  COUNT(*) FILTER (WHERE utm_campaign IS NOT NULL) as with_utm_attribution,
  COUNT(*) FILTER (WHERE utm_source IS NOT NULL) as with_utm_source,
  ROUND(100.0 * COUNT(*) FILTER (WHERE campaign_name IS NOT NULL OR utm_campaign IS NOT NULL) / COUNT(*), 2) as combined_attribution_pct
FROM stg.v9_contracts_with_full_attribution;

-- Check 2: Attribution levels distribution
SELECT * FROM stg.v9_contracts_attribution_summary;

-- Check 3: Top campaigns by revenue
SELECT * FROM stg.v9_contracts_by_campaign LIMIT 10;

-- Check 4: Campaign performance with ROAS
SELECT * FROM stg.v9_campaign_performance_with_contracts LIMIT 10;

-- ============================================================================
-- SUCCESS CRITERIA
-- ============================================================================
-- ✅ Contracts now visible with multi-level attribution
-- ✅ Campaign match (best quality): ~28 contracts expected
-- ✅ UTM attribution (good quality): Should cover most paid traffic
-- ✅ Full funnel view: Spend → Leads → Contracts → Revenue → ROAS
-- ============================================================================
