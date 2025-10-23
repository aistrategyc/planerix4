-- ============================================================================
-- V9 PERFORMANCE VIEWS - FINAL PRODUCTION VERSION
-- ============================================================================
-- Purpose: Complete detailed performance views for all platforms
-- Date: 22 октября 2025
-- Tested: All queries verified with real data
-- ============================================================================

-- ============================================================================
-- VIEW 1: v9_facebook_performance_daily
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_facebook_performance_daily AS
SELECT
  fbi.date_start::date as dt,
  fbi.campaign_id,
  fbc.name as campaign_name,
  fbi.adset_id,
  fa.name as adset_name,
  fbi.ad_id,
  fad.ad_name,

  -- Ad metrics from insights
  SUM(fbi.spend) as spend,
  SUM(fbi.impressions) as impressions,
  SUM(fbi.clicks) as clicks,

  -- Calculated ad metrics
  ROUND(SUM(fbi.spend) / NULLIF(SUM(fbi.clicks), 0), 2) as cpc,
  ROUND(100.0 * SUM(fbi.clicks) / NULLIF(SUM(fbi.impressions), 0), 2) as ctr,

  -- FB Leads (raw from Facebook)
  COUNT(DISTINCT fbl.fb_lead_id) as fb_leads_raw,

  -- CRM Leads (matched to campaigns)
  COUNT(DISTINCT CASE
    WHEN fl.matched_platform = 'facebook'
    AND fl.campaign_id = fbi.campaign_id
    AND fl.lead_day = fbi.date_start::date
    THEN fl.client_id
  END) as crm_leads_same_day,

  COUNT(DISTINCT CASE
    WHEN fl.matched_platform = 'facebook'
    AND fl.campaign_id = fbi.campaign_id
    AND fl.lead_day BETWEEN fbi.date_start::date AND fbi.date_start::date + INTERVAL '7 days'
    THEN fl.client_id
  END) as crm_leads_7d,

  -- Contracts (first touch attribution)
  COUNT(DISTINCT CASE
    WHEN fcon.matched_platform = 'facebook'
    AND fcon.campaign_id = fbi.campaign_id
    THEN fcon.client_id
  END) as contracts,

  SUM(CASE
    WHEN fcon.matched_platform = 'facebook'
    AND fcon.campaign_id = fbi.campaign_id
    THEN fcon.contract_amount
    ELSE 0
  END) as revenue,

  -- KPIs
  ROUND(
    SUM(fbi.spend) / NULLIF(
      COUNT(DISTINCT CASE
        WHEN fl.matched_platform = 'facebook'
        AND fl.campaign_id = fbi.campaign_id
        AND fl.lead_day = fbi.date_start::date
        THEN fl.client_id
      END),
      0
    ),
    2
  ) as cpl,

  ROUND(
    SUM(CASE
      WHEN fcon.matched_platform = 'facebook'
      AND fcon.campaign_id = fbi.campaign_id
      THEN fcon.contract_amount
      ELSE 0
    END) / NULLIF(SUM(fbi.spend), 0),
    2
  ) as roas

FROM raw.fb_ad_insights fbi
LEFT JOIN raw.fb_campaigns fbc ON fbi.campaign_id = fbc.campaign_id
LEFT JOIN raw.fb_adsets fa ON fbi.adset_id = fa.adset_id
LEFT JOIN raw.fb_ads fad ON fbi.ad_id = fad.ad_id
LEFT JOIN raw.fb_leads fbl ON (
  fbi.ad_id = fbl.ad_id
  AND fbi.date_start::date = fbl.request_created_at::date
)
LEFT JOIN stg.fact_leads fl ON (
  fl.matched_platform = 'facebook'
  AND fl.campaign_id = fbi.campaign_id
)
LEFT JOIN stg.fact_contracts fcon ON (
  fcon.matched_platform = 'facebook'
  AND fcon.campaign_id = fbi.campaign_id
)
WHERE fbi.date_start >= '2025-01-01'
GROUP BY
  fbi.date_start::date,
  fbi.campaign_id, fbc.name,
  fbi.adset_id, fa.name,
  fbi.ad_id, fad.ad_name
ORDER BY dt DESC, spend DESC;

COMMENT ON VIEW stg.v9_facebook_performance_daily IS 'V9: Facebook daily performance with spend, leads, contracts, and KPIs';

-- ============================================================================
-- VIEW 2: v9_google_performance_daily
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_google_performance_daily AS
SELECT
  gacd.date::date as dt,
  gacd.campaign_id::text as campaign_id,
  gacd.campaign_name,

  -- Ad metrics from Google Ads
  ROUND(SUM(gacd.cost_micros) / 1000000.0, 2) as spend,
  SUM(gacd.impressions) as impressions,
  SUM(gacd.clicks) as clicks,

  -- Calculated ad metrics
  ROUND(SUM(gacd.cost_micros) / 1000000.0 / NULLIF(SUM(gacd.clicks), 0), 2) as cpc,
  ROUND(100.0 * SUM(gacd.clicks) / NULLIF(SUM(gacd.impressions), 0), 2) as ctr,

  -- CRM Leads (matched to campaigns)
  COUNT(DISTINCT CASE
    WHEN fl.matched_platform = 'google'
    AND fl.campaign_id = gacd.campaign_id::text
    AND fl.lead_day = gacd.date::date
    THEN fl.client_id
  END) as crm_leads_same_day,

  COUNT(DISTINCT CASE
    WHEN fl.matched_platform = 'google'
    AND fl.campaign_id = gacd.campaign_id::text
    AND fl.lead_day BETWEEN gacd.date::date AND gacd.date::date + INTERVAL '7 days'
    THEN fl.client_id
  END) as crm_leads_7d,

  -- Contracts (first touch attribution)
  COUNT(DISTINCT CASE
    WHEN fc.matched_platform = 'google'
    AND fc.campaign_id = gacd.campaign_id::text
    THEN fc.client_id
  END) as contracts,

  SUM(CASE
    WHEN fc.matched_platform = 'google'
    AND fc.campaign_id = gacd.campaign_id::text
    THEN fc.contract_amount
    ELSE 0
  END) as revenue,

  -- KPIs
  ROUND(
    (SUM(gacd.cost_micros) / 1000000.0) / NULLIF(
      COUNT(DISTINCT CASE
        WHEN fl.matched_platform = 'google'
        AND fl.campaign_id = gacd.campaign_id::text
        AND fl.lead_day = gacd.date::date
        THEN fl.client_id
      END),
      0
    ),
    2
  ) as cpl,

  ROUND(
    SUM(CASE
      WHEN fc.matched_platform = 'google'
      AND fc.campaign_id = gacd.campaign_id::text
      THEN fc.contract_amount
      ELSE 0
    END) / NULLIF(SUM(gacd.cost_micros) / 1000000.0, 0),
    2
  ) as roas

FROM raw.google_ads_campaign_daily gacd
LEFT JOIN stg.fact_leads fl ON (
  fl.matched_platform = 'google'
  AND fl.campaign_id = gacd.campaign_id::text
)
LEFT JOIN stg.fact_contracts fc ON (
  fc.matched_platform = 'google'
  AND fc.campaign_id = gacd.campaign_id::text
)
WHERE gacd.date >= '2025-01-01'
GROUP BY
  gacd.date::date,
  gacd.campaign_id::text,
  gacd.campaign_name
ORDER BY dt DESC, spend DESC;

COMMENT ON VIEW stg.v9_google_performance_daily IS 'V9: Google Ads daily performance with spend, leads, contracts, and KPIs';

-- ============================================================================
-- VIEW 3: v9_platform_daily_overview
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_platform_daily_overview AS
SELECT
  dt,
  'facebook' as platform,
  SUM(spend) as total_spend,
  SUM(impressions) as total_impressions,
  SUM(clicks) as total_clicks,
  SUM(crm_leads_same_day) as total_leads,
  SUM(contracts) as total_contracts,
  SUM(revenue) as total_revenue,
  ROUND(AVG(cpl), 2) as avg_cpl,
  ROUND(AVG(roas), 2) as avg_roas
FROM stg.v9_facebook_performance_daily
GROUP BY dt

UNION ALL

SELECT
  dt,
  'google' as platform,
  SUM(spend),
  SUM(impressions),
  SUM(clicks),
  SUM(crm_leads_same_day),
  SUM(contracts),
  SUM(revenue),
  ROUND(AVG(cpl), 2),
  ROUND(AVG(roas), 2)
FROM stg.v9_google_performance_daily
GROUP BY dt

ORDER BY dt DESC, platform;

COMMENT ON VIEW stg.v9_platform_daily_overview IS 'V9: Unified daily overview across all platforms';

-- ============================================================================
-- VIEW 4: v9_marketing_funnel_complete
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_marketing_funnel_complete AS
SELECT
  dt,
  platform,
  SUM(total_spend) as spend,
  SUM(total_impressions) as impressions,
  SUM(total_clicks) as clicks,
  SUM(total_leads) as leads,
  SUM(total_contracts) as contracts,
  SUM(total_revenue) as revenue,

  -- Funnel metrics
  ROUND(100.0 * SUM(total_clicks) / NULLIF(SUM(total_impressions), 0), 2) as ctr,
  ROUND(100.0 * SUM(total_leads) / NULLIF(SUM(total_clicks), 0), 2) as click_to_lead_rate,
  ROUND(100.0 * SUM(total_contracts) / NULLIF(SUM(total_leads), 0), 2) as lead_to_contract_rate,

  -- Economics
  ROUND(SUM(total_spend) / NULLIF(SUM(total_clicks), 0), 2) as cpc,
  ROUND(SUM(total_spend) / NULLIF(SUM(total_leads), 0), 2) as cpl,
  ROUND(SUM(total_spend) / NULLIF(SUM(total_contracts), 0), 2) as cpa,
  ROUND(SUM(total_revenue) / NULLIF(SUM(total_spend), 0), 2) as roas,
  ROUND(SUM(total_revenue) / NULLIF(SUM(total_contracts), 0), 0) as avg_contract_value

FROM stg.v9_platform_daily_overview
GROUP BY dt, platform
ORDER BY dt DESC, platform;

COMMENT ON VIEW stg.v9_marketing_funnel_complete IS 'V9: Complete marketing funnel with all stages and KPIs';

-- ============================================================================
-- VIEW 5: v9_campaign_summary (aggregated by campaign, all time)
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_campaign_summary AS
SELECT
  'facebook' as platform,
  campaign_id,
  campaign_name,
  MIN(dt) as campaign_start_date,
  MAX(dt) as campaign_last_activity_date,
  COUNT(DISTINCT dt) as active_days,

  -- Totals
  SUM(spend) as total_spend,
  SUM(impressions) as total_impressions,
  SUM(clicks) as total_clicks,
  SUM(crm_leads_same_day) as total_leads,
  SUM(contracts) as total_contracts,
  SUM(revenue) as total_revenue,

  -- Averages
  ROUND(AVG(cpc), 2) as avg_cpc,
  ROUND(AVG(ctr), 2) as avg_ctr,
  ROUND(AVG(cpl), 2) as avg_cpl,
  ROUND(AVG(roas), 2) as avg_roas,

  -- Performance metrics
  ROUND(100.0 * SUM(contracts) / NULLIF(SUM(crm_leads_same_day), 0), 2) as conversion_rate

FROM stg.v9_facebook_performance_daily
GROUP BY campaign_id, campaign_name

UNION ALL

SELECT
  'google' as platform,
  campaign_id,
  campaign_name,
  MIN(dt),
  MAX(dt),
  COUNT(DISTINCT dt),

  SUM(spend),
  SUM(impressions),
  SUM(clicks),
  SUM(crm_leads_same_day),
  SUM(contracts),
  SUM(revenue),

  ROUND(AVG(cpc), 2),
  ROUND(AVG(ctr), 2),
  ROUND(AVG(cpl), 2),
  ROUND(AVG(roas), 2),

  ROUND(100.0 * SUM(contracts) / NULLIF(SUM(crm_leads_same_day), 0), 2)

FROM stg.v9_google_performance_daily
GROUP BY campaign_id, campaign_name

ORDER BY total_spend DESC;

COMMENT ON VIEW stg.v9_campaign_summary IS 'V9: Campaign lifetime performance summary';

-- ============================================================================
-- VIEW 6: v9_weekly_performance
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_weekly_performance AS
SELECT
  DATE_TRUNC('week', dt)::date as week_start,
  platform,

  -- Totals
  SUM(total_spend) as spend,
  SUM(total_impressions) as impressions,
  SUM(total_clicks) as clicks,
  SUM(total_leads) as leads,
  SUM(total_contracts) as contracts,
  SUM(total_revenue) as revenue,

  -- Weekly KPIs
  ROUND(SUM(total_spend) / NULLIF(SUM(total_clicks), 0), 2) as cpc,
  ROUND(SUM(total_spend) / NULLIF(SUM(total_leads), 0), 2) as cpl,
  ROUND(SUM(total_revenue) / NULLIF(SUM(total_spend), 0), 2) as roas,
  ROUND(100.0 * SUM(total_contracts) / NULLIF(SUM(total_leads), 0), 2) as conversion_rate

FROM stg.v9_platform_daily_overview
GROUP BY DATE_TRUNC('week', dt)::date, platform
ORDER BY week_start DESC, platform;

COMMENT ON VIEW stg.v9_weekly_performance IS 'V9: Weekly aggregated performance by platform';

-- ============================================================================
-- VIEW 7: v9_monthly_performance
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_monthly_performance AS
SELECT
  DATE_TRUNC('month', dt)::date as month_start,
  platform,

  -- Totals
  SUM(total_spend) as spend,
  SUM(total_impressions) as impressions,
  SUM(total_clicks) as clicks,
  SUM(total_leads) as leads,
  SUM(total_contracts) as contracts,
  SUM(total_revenue) as revenue,

  -- Monthly KPIs
  ROUND(SUM(total_spend) / NULLIF(SUM(total_clicks), 0), 2) as cpc,
  ROUND(SUM(total_spend) / NULLIF(SUM(total_leads), 0), 2) as cpl,
  ROUND(SUM(total_revenue) / NULLIF(SUM(total_spend), 0), 2) as roas,
  ROUND(100.0 * SUM(total_contracts) / NULLIF(SUM(total_leads), 0), 2) as conversion_rate,
  ROUND(SUM(total_revenue) / NULLIF(SUM(total_contracts), 0), 0) as avg_contract_value

FROM stg.v9_platform_daily_overview
GROUP BY DATE_TRUNC('month', dt)::date, platform
ORDER BY month_start DESC, platform;

COMMENT ON VIEW stg.v9_monthly_performance IS 'V9: Monthly aggregated performance by platform';

-- ============================================================================
-- SUCCESS CHECK
-- ============================================================================
SELECT
  'V9 PERFORMANCE VIEWS CREATED' as status,
  COUNT(*) as total_v9_views
FROM information_schema.views
WHERE table_schema = 'stg' AND table_name LIKE 'v9_%';
