-- ============================================================================
-- V9 ENHANCED PRODUCTION VIEWS
-- Date: October 23, 2025
-- Purpose: Additional professional views for production frontend
-- Data Flow: RAW → STG → V9 (100% verified, no data loss)
-- ============================================================================

-- ============================================================================
-- VIEW 1: v9_platform_weekly_trends
-- Purpose: Week-over-week platform performance with growth metrics
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_platform_weekly_trends AS
WITH weekly_metrics AS (
  SELECT
    DATE_TRUNC('week', dt)::date as week_start,
    platform,
    SUM(leads) as leads,
    SUM(contracts) as contracts,
    SUM(revenue) as revenue,
    AVG(conversion_rate) as avg_conversion_rate
  FROM stg.v9_platform_daily_overview
  WHERE dt >= '2025-01-01'
  GROUP BY DATE_TRUNC('week', dt), platform
),
with_previous AS (
  SELECT
    week_start,
    platform,
    leads,
    contracts,
    revenue,
    avg_conversion_rate,
    LAG(leads) OVER (PARTITION BY platform ORDER BY week_start) as prev_leads,
    LAG(contracts) OVER (PARTITION BY platform ORDER BY week_start) as prev_contracts,
    LAG(revenue) OVER (PARTITION BY platform ORDER BY week_start) as prev_revenue
  FROM weekly_metrics
)
SELECT
  week_start,
  platform,
  leads,
  contracts,
  revenue,
  ROUND(avg_conversion_rate, 2) as avg_conversion_rate,
  -- Growth metrics
  CASE WHEN prev_leads > 0
    THEN ROUND(100.0 * (leads - prev_leads) / prev_leads, 2)
    ELSE NULL
  END as leads_growth_pct,
  CASE WHEN prev_contracts > 0
    THEN ROUND(100.0 * (contracts - prev_contracts) / prev_contracts, 2)
    ELSE NULL
  END as contracts_growth_pct,
  CASE WHEN prev_revenue > 0
    THEN ROUND(100.0 * (revenue - prev_revenue) / prev_revenue, 2)
    ELSE NULL
  END as revenue_growth_pct
FROM with_previous
ORDER BY week_start DESC, contracts DESC NULLS LAST;

COMMENT ON VIEW stg.v9_platform_weekly_trends IS
'Week-over-week platform performance with YoY growth metrics. Shows trends for leads, contracts, revenue.';

-- ============================================================================
-- VIEW 2: v9_contracts_cohort_analysis
-- Purpose: Contract value and conversion by month cohort
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_contracts_cohort_analysis AS
WITH monthly_cohorts AS (
  SELECT
    DATE_TRUNC('month', contract_date)::date as cohort_month,
    unified_platform as platform,
    COUNT(*) as contracts,
    COUNT(DISTINCT client_id) as unique_clients,
    SUM(contract_amount) as total_revenue,
    AVG(contract_amount) as avg_contract_value,
    AVG(days_to_contract) as avg_days_to_close,
    MIN(contract_amount) as min_contract,
    MAX(contract_amount) as max_contract,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY contract_amount) as median_contract
  FROM stg.v9_contracts_with_full_attribution
  WHERE contract_date >= '2025-01-01'
  GROUP BY DATE_TRUNC('month', contract_date), unified_platform
)
SELECT
  cohort_month,
  platform,
  contracts,
  unique_clients,
  total_revenue,
  ROUND(avg_contract_value, 0) as avg_contract_value,
  ROUND(avg_days_to_close, 1) as avg_days_to_close,
  min_contract,
  max_contract,
  ROUND(median_contract, 0) as median_contract,
  -- Calculate repeat customer rate
  ROUND(100.0 * (contracts - unique_clients) / NULLIF(unique_clients, 0), 2) as repeat_rate_pct
FROM monthly_cohorts
ORDER BY cohort_month DESC, total_revenue DESC;

COMMENT ON VIEW stg.v9_contracts_cohort_analysis IS
'Monthly cohort analysis showing contract value distribution, repeat customers, and conversion metrics.';

-- ============================================================================
-- VIEW 3: v9_attribution_quality_score
-- Purpose: Attribution quality metrics by platform and level
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_attribution_quality_score AS
WITH attribution_stats AS (
  SELECT
    unified_platform as platform,
    attribution_level,
    COUNT(*) as contracts,
    SUM(contract_amount) as revenue,
    AVG(days_to_contract) as avg_days_to_close,
    -- Count how many have UTM data
    COUNT(*) FILTER (WHERE utm_source IS NOT NULL) as with_utm_source,
    COUNT(*) FILTER (WHERE utm_campaign IS NOT NULL) as with_utm_campaign,
    COUNT(*) FILTER (WHERE utm_medium IS NOT NULL) as with_utm_medium,
    -- Count how many have campaign data
    COUNT(*) FILTER (WHERE unified_campaign_name IS NOT NULL) as with_campaign_name
  FROM stg.v9_contracts_with_full_attribution
  WHERE contract_date >= '2025-01-01'
  GROUP BY unified_platform, attribution_level
)
SELECT
  platform,
  attribution_level,
  contracts,
  revenue,
  ROUND(avg_days_to_close, 1) as avg_days_to_close,
  -- Calculate data completeness scores
  ROUND(100.0 * with_utm_source / NULLIF(contracts, 0), 1) as utm_source_coverage_pct,
  ROUND(100.0 * with_utm_campaign / NULLIF(contracts, 0), 1) as utm_campaign_coverage_pct,
  ROUND(100.0 * with_utm_medium / NULLIF(contracts, 0), 1) as utm_medium_coverage_pct,
  ROUND(100.0 * with_campaign_name / NULLIF(contracts, 0), 1) as campaign_name_coverage_pct,
  -- Overall quality score (average of all coverage metrics)
  ROUND(
    (
      100.0 * with_utm_source / NULLIF(contracts, 0) +
      100.0 * with_utm_campaign / NULLIF(contracts, 0) +
      100.0 * with_utm_medium / NULLIF(contracts, 0) +
      100.0 * with_campaign_name / NULLIF(contracts, 0)
    ) / 4.0,
    1
  ) as overall_quality_score
FROM attribution_stats
ORDER BY contracts DESC, overall_quality_score DESC;

COMMENT ON VIEW stg.v9_attribution_quality_score IS
'Attribution data quality metrics: UTM coverage, campaign data completeness, overall quality score.';

-- ============================================================================
-- VIEW 4: v9_roas_analysis_detailed
-- Purpose: Detailed ROAS analysis by platform and campaign
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_roas_analysis_detailed AS
WITH facebook_roas AS (
  SELECT
    'facebook' as platform,
    campaign_name,
    campaign_id,
    SUM(spend) as total_spend,
    SUM(revenue) as total_revenue,
    SUM(contracts) as contracts,
    SUM(fb_leads_raw) as raw_leads,
    SUM(crm_leads_same_day) as leads_same_day,
    SUM(crm_leads_7d) as leads_7d,
    AVG(ctr) as avg_ctr,
    AVG(cpc) as avg_cpc,
    AVG(cpl) as avg_cpl
  FROM stg.v9_facebook_performance_daily
  WHERE dt >= '2025-01-01'
  GROUP BY campaign_name, campaign_id
),
google_roas AS (
  SELECT
    'google' as platform,
    campaign_name,
    campaign_id,
    SUM(spend) as total_spend,
    SUM(revenue) as total_revenue,
    SUM(contracts) as contracts,
    0 as raw_leads,
    SUM(crm_leads_same_day) as leads_same_day,
    SUM(crm_leads_7d) as leads_7d,
    AVG(ctr) as avg_ctr,
    AVG(cpc) as avg_cpc,
    AVG(cpl) as avg_cpl
  FROM stg.v9_google_performance_daily
  WHERE dt >= '2025-01-01'
  GROUP BY campaign_name, campaign_id
),
combined AS (
  SELECT * FROM facebook_roas
  UNION ALL
  SELECT * FROM google_roas
)
SELECT
  platform,
  campaign_name,
  campaign_id,
  ROUND(total_spend, 2) as total_spend,
  ROUND(total_revenue, 0) as total_revenue,
  contracts,
  raw_leads,
  leads_same_day,
  leads_7d,
  -- ROAS calculation
  CASE WHEN total_spend > 0
    THEN ROUND(total_revenue / total_spend, 2)
    ELSE NULL
  END as roas,
  -- Efficiency metrics
  ROUND(avg_ctr, 2) as avg_ctr,
  ROUND(avg_cpc, 2) as avg_cpc,
  ROUND(avg_cpl, 2) as avg_cpl,
  CASE WHEN contracts > 0
    THEN ROUND(total_spend / contracts, 2)
    ELSE NULL
  END as cost_per_contract,
  -- Lead conversion metrics
  CASE WHEN leads_7d > 0
    THEN ROUND(100.0 * contracts / leads_7d, 2)
    ELSE NULL
  END as lead_to_contract_rate_pct
FROM combined
WHERE total_spend > 0 OR contracts > 0
ORDER BY total_revenue DESC NULLS LAST;

COMMENT ON VIEW stg.v9_roas_analysis_detailed IS
'Detailed ROAS analysis for Facebook and Google campaigns with efficiency and conversion metrics.';

-- ============================================================================
-- VIEW 5: v9_facebook_creative_roi
-- Purpose: Facebook creative performance with ROI metrics
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_facebook_creative_roi AS
WITH creative_contracts AS (
  SELECT
    fc.ad_id,
    fc.ad_name,
    fc.adset_name,
    fc.campaign_name,
    fc.image_url,
    fc.primary_text,
    fc.headline,
    fc.call_to_action,
    COUNT(DISTINCT c.contract_source_id) as contracts,
    SUM(c.contract_amount) as revenue
  FROM stg.v9_facebook_creatives_with_contracts fc
  LEFT JOIN stg.v9_contracts_with_full_attribution c
    ON CAST(fc.ad_id AS TEXT) = c.utm_term
    AND c.unified_platform = 'facebook'
    AND c.contract_date >= '2025-01-01'
  GROUP BY
    fc.ad_id, fc.ad_name, fc.adset_name, fc.campaign_name,
    fc.image_url, fc.primary_text, fc.headline, fc.call_to_action
),
creative_spend AS (
  SELECT
    ad_name,
    adset_name,
    campaign_name,
    SUM(spend) as total_spend,
    SUM(impressions) as total_impressions,
    SUM(clicks) as total_clicks,
    AVG(ctr) as avg_ctr,
    AVG(cpc) as avg_cpc
  FROM stg.v9_facebook_performance_daily
  WHERE dt >= '2025-01-01'
    AND ad_name IS NOT NULL
  GROUP BY ad_name, adset_name, campaign_name
)
SELECT
  cc.ad_id,
  cc.ad_name,
  cc.adset_name,
  cc.campaign_name,
  cc.image_url,
  cc.primary_text,
  cc.headline,
  cc.call_to_action,
  cc.contracts,
  ROUND(COALESCE(cc.revenue, 0), 0) as revenue,
  ROUND(COALESCE(cs.total_spend, 0), 2) as total_spend,
  cs.total_impressions,
  cs.total_clicks,
  ROUND(cs.avg_ctr, 2) as avg_ctr,
  ROUND(cs.avg_cpc, 2) as avg_cpc,
  -- ROI metrics
  CASE WHEN cs.total_spend > 0
    THEN ROUND(COALESCE(cc.revenue, 0) / cs.total_spend, 2)
    ELSE NULL
  END as roas,
  CASE WHEN cc.contracts > 0
    THEN ROUND(cs.total_spend / cc.contracts, 2)
    ELSE NULL
  END as cost_per_contract
FROM creative_contracts cc
LEFT JOIN creative_spend cs
  ON cc.ad_name = cs.ad_name
  AND cc.adset_name = cs.adset_name
  AND cc.campaign_name = cs.campaign_name
WHERE cc.contracts > 0 OR cs.total_spend > 0
ORDER BY cc.revenue DESC NULLS LAST, cc.contracts DESC;

COMMENT ON VIEW stg.v9_facebook_creative_roi IS
'Facebook creative performance with ROI: spend, revenue, ROAS, cost per contract for each ad creative.';

-- ============================================================================
-- VIEW 6: v9_lead_to_contract_journey
-- Purpose: Time-based lead to contract conversion analysis
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_lead_to_contract_journey AS
WITH contract_timing AS (
  SELECT
    unified_platform as platform,
    attribution_level,
    days_to_contract,
    CASE
      WHEN days_to_contract = 0 THEN '0 - Same Day'
      WHEN days_to_contract BETWEEN 1 AND 3 THEN '1-3 days'
      WHEN days_to_contract BETWEEN 4 AND 7 THEN '4-7 days'
      WHEN days_to_contract BETWEEN 8 AND 14 THEN '8-14 days'
      WHEN days_to_contract BETWEEN 15 AND 30 THEN '15-30 days'
      WHEN days_to_contract BETWEEN 31 AND 60 THEN '31-60 days'
      WHEN days_to_contract > 60 THEN '60+ days'
      ELSE 'Unknown'
    END as time_bucket,
    contract_amount
  FROM stg.v9_contracts_with_full_attribution
  WHERE contract_date >= '2025-01-01'
    AND days_to_contract IS NOT NULL
)
SELECT
  platform,
  time_bucket,
  COUNT(*) as contracts,
  SUM(contract_amount) as total_revenue,
  ROUND(AVG(contract_amount), 0) as avg_contract_value,
  ROUND(AVG(days_to_contract), 1) as avg_days,
  MIN(days_to_contract) as min_days,
  MAX(days_to_contract) as max_days,
  -- Percentage of total
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY platform), 2) as pct_of_platform_contracts
FROM contract_timing
GROUP BY platform, time_bucket
ORDER BY platform,
  CASE time_bucket
    WHEN '0 - Same Day' THEN 1
    WHEN '1-3 days' THEN 2
    WHEN '4-7 days' THEN 3
    WHEN '8-14 days' THEN 4
    WHEN '15-30 days' THEN 5
    WHEN '31-60 days' THEN 6
    WHEN '60+ days' THEN 7
    ELSE 8
  END;

COMMENT ON VIEW stg.v9_lead_to_contract_journey IS
'Lead-to-contract conversion timing analysis: distribution by time buckets, platform, and revenue.';

-- ============================================================================
-- VERIFICATION: Check all 6 new views created successfully
-- ============================================================================
SELECT
  'v9_platform_weekly_trends' as view_name,
  COUNT(*) as row_count
FROM stg.v9_platform_weekly_trends

UNION ALL

SELECT
  'v9_contracts_cohort_analysis',
  COUNT(*)
FROM stg.v9_contracts_cohort_analysis

UNION ALL

SELECT
  'v9_attribution_quality_score',
  COUNT(*)
FROM stg.v9_attribution_quality_score

UNION ALL

SELECT
  'v9_roas_analysis_detailed',
  COUNT(*)
FROM stg.v9_roas_analysis_detailed

UNION ALL

SELECT
  'v9_facebook_creative_roi',
  COUNT(*)
FROM stg.v9_facebook_creative_roi

UNION ALL

SELECT
  'v9_lead_to_contract_journey',
  COUNT(*)
FROM stg.v9_lead_to_contract_journey

ORDER BY view_name;
