-- ============================================================================
-- V9 ANALYTICS VIEWS - INCREMENTAL APPROACH
-- ============================================================================
-- Стратегия: Сначала CRM, потом каждый источник отдельно, затем объединение
-- Дата: 22 октября 2025
-- ============================================================================

-- ============================================================================
-- STEP 1: CRM NORMALIZED VIEWS (базовая нормализация данных)
-- ============================================================================

-- 1.1: CRM Leads Summary (нормализованные лиды из CRM)
CREATE OR REPLACE VIEW stg.v9_crm_leads_summary AS
SELECT
  lead_day,
  dominant_platform,
  source_type,
  COUNT(DISTINCT client_id) as total_leads,
  COUNT(DISTINCT CASE WHEN matched_platform IS NOT NULL THEN client_id END) as matched_to_campaigns
FROM stg.fact_leads
WHERE lead_day >= '2025-01-01'
GROUP BY lead_day, dominant_platform, source_type
ORDER BY lead_day DESC;

COMMENT ON VIEW stg.v9_crm_leads_summary IS 'V9: CRM лиды - базовая нормализация';

-- 1.2: CRM Contracts Summary (нормализованные договора)
CREATE OR REPLACE VIEW stg.v9_crm_contracts_summary AS
SELECT
  contract_day,
  dominant_platform,
  COUNT(DISTINCT client_id) as total_contracts,
  SUM(contract_amount) as revenue,
  ROUND(AVG(contract_amount), 0) as avg_contract_value,
  ROUND(AVG(days_to_contract), 1) as avg_days_to_close
FROM stg.fact_contracts
WHERE contract_day >= '2025-01-01'
GROUP BY contract_day, dominant_platform
ORDER BY contract_day DESC;

COMMENT ON VIEW stg.v9_crm_contracts_summary IS 'V9: CRM договора - базовая нормализация';

-- ============================================================================
-- STEP 2: FACEBOOK DETAILED VIEWS (детализация Facebook)
-- ============================================================================

-- 2.1: Facebook Ad Spend (расходы из FB кабинета)
CREATE OR REPLACE VIEW stg.v9_facebook_ad_spend AS
SELECT
  date_start::date as dt,
  campaign_id,
  campaign_name,
  adset_id,
  adset_name,
  ad_id,
  ad_name,
  SUM(spend) as spend,
  SUM(impressions) as impressions,
  SUM(clicks) as clicks,
  SUM(reach) as reach,
  ROUND(SUM(spend) / NULLIF(SUM(clicks), 0), 2) as cpc,
  ROUND(100.0 * SUM(clicks) / NULLIF(SUM(impressions), 0), 2) as ctr
FROM raw.fb_ad_insights
WHERE date_start >= '2025-01-01'
GROUP BY 1,2,3,4,5,6,7
ORDER BY 1 DESC, spend DESC;

COMMENT ON VIEW stg.v9_facebook_ad_spend IS 'V9: Facebook расходы по кампаниям/adsets/ads';

-- 2.2: Facebook Leads (лиды из FB)
CREATE OR REPLACE VIEW stg.v9_facebook_leads AS
SELECT
  request_created_at::date as dt,
  campaign_id,
  adset_id,
  ad_id,
  COUNT(*) as fb_leads_raw,
  COUNT(DISTINCT phone) as unique_phones,
  COUNT(DISTINCT email) as unique_emails
FROM raw.fb_leads
WHERE request_created_at >= '2025-01-01'
GROUP BY 1,2,3,4
ORDER BY 1 DESC;

COMMENT ON VIEW stg.v9_facebook_leads IS 'V9: Facebook лиды из raw.fb_leads';

-- 2.3: Facebook Performance (объединение spend + CRM leads)
CREATE OR REPLACE VIEW stg.v9_facebook_performance AS
SELECT
  fb.dt,
  fb.campaign_id,
  fb.campaign_name,
  fb.adset_id,
  fb.adset_name,
  fb.ad_id,
  fb.ad_name,

  -- Facebook metrics
  fb.spend,
  fb.impressions,
  fb.clicks,
  fb.reach,
  fb.cpc,
  fb.ctr,

  -- FB Leads (raw)
  COALESCE(fbl.fb_leads_raw, 0) as fb_leads_raw,

  -- CRM Leads (matched)
  COUNT(DISTINCT CASE WHEN fl.lead_day = fb.dt THEN fl.client_id END) as crm_leads_same_day,
  COUNT(DISTINCT CASE WHEN fl.lead_day BETWEEN fb.dt AND fb.dt + 7 THEN fl.client_id END) as crm_leads_7d,

  -- Contracts
  COUNT(DISTINCT fc.client_id) as contracts,
  SUM(fc.contract_amount) as revenue,

  -- KPIs
  ROUND(fb.spend / NULLIF(COUNT(DISTINCT CASE WHEN fl.lead_day = fb.dt THEN fl.client_id END), 0), 2) as cpl,
  ROUND(SUM(fc.contract_amount) / NULLIF(fb.spend, 0), 2) as roas

FROM stg.v9_facebook_ad_spend fb
LEFT JOIN stg.v9_facebook_leads fbl ON (
  fb.dt = fbl.dt AND
  fb.campaign_id = fbl.campaign_id AND
  fb.adset_id = fbl.adset_id AND
  fb.ad_id = fbl.ad_id
)
LEFT JOIN stg.fact_leads fl ON (
  fl.matched_platform = 'facebook' AND
  fl.campaign_id = fb.campaign_id
)
LEFT JOIN stg.fact_contracts fc ON fl.client_id = fc.client_id
GROUP BY fb.dt, fb.campaign_id, fb.campaign_name, fb.adset_id, fb.adset_name, fb.ad_id, fb.ad_name,
         fb.spend, fb.impressions, fb.clicks, fb.reach, fb.cpc, fb.ctr, fbl.fb_leads_raw
ORDER BY fb.dt DESC, fb.spend DESC;

COMMENT ON VIEW stg.v9_facebook_performance IS 'V9: Facebook полная производительность (spend + leads + contracts)';

-- ============================================================================
-- STEP 3: GOOGLE ADS DETAILED VIEWS (детализация Google)
-- ============================================================================

-- 3.1: Google Ad Spend
CREATE OR REPLACE VIEW stg.v9_google_ad_spend AS
SELECT
  date::date as dt,
  campaign_id::text,
  campaign_name,
  SUM(cost) as spend,
  SUM(impressions) as impressions,
  SUM(clicks) as clicks,
  ROUND(SUM(cost) / NULLIF(SUM(clicks), 0), 2) as cpc,
  ROUND(100.0 * SUM(clicks) / NULLIF(SUM(impressions), 0), 2) as ctr
FROM raw.google_ads_campaign_daily
WHERE date >= '2025-01-01'
GROUP BY 1,2,3
ORDER BY 1 DESC, spend DESC;

COMMENT ON VIEW stg.v9_google_ad_spend IS 'V9: Google Ads расходы по кампаниям';

-- 3.2: Google Performance (объединение spend + CRM)
CREATE OR REPLACE VIEW stg.v9_google_performance AS
SELECT
  g.dt,
  g.campaign_id,
  g.campaign_name,

  -- Google metrics
  g.spend,
  g.impressions,
  g.clicks,
  g.cpc,
  g.ctr,

  -- CRM Leads
  COUNT(DISTINCT CASE WHEN fl.lead_day = g.dt THEN fl.client_id END) as crm_leads_same_day,
  COUNT(DISTINCT CASE WHEN fl.lead_day BETWEEN g.dt AND g.dt + 7 THEN fl.client_id END) as crm_leads_7d,

  -- Contracts
  COUNT(DISTINCT fc.client_id) as contracts,
  SUM(fc.contract_amount) as revenue,

  -- KPIs
  ROUND(g.spend / NULLIF(COUNT(DISTINCT CASE WHEN fl.lead_day = g.dt THEN fl.client_id END), 0), 2) as cpl,
  ROUND(SUM(fc.contract_amount) / NULLIF(g.spend, 0), 2) as roas

FROM stg.v9_google_ad_spend g
LEFT JOIN stg.fact_leads fl ON (
  fl.matched_platform = 'google' AND
  fl.campaign_id = g.campaign_id
)
LEFT JOIN stg.fact_contracts fc ON fl.client_id = fc.client_id
GROUP BY g.dt, g.campaign_id, g.campaign_name, g.spend, g.impressions, g.clicks, g.cpc, g.ctr
ORDER BY g.dt DESC, g.spend DESC;

COMMENT ON VIEW stg.v9_google_performance IS 'V9: Google Ads полная производительность';

-- ============================================================================
-- STEP 4: UNIFIED VIEWS (объединенные представления)
-- ============================================================================

-- 4.1: Platform Daily Overview (все платформы в одной таблице)
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
FROM stg.v9_facebook_performance
GROUP BY dt

UNION ALL

SELECT
  dt,
  'google',
  SUM(spend),
  SUM(impressions),
  SUM(clicks),
  SUM(crm_leads_same_day),
  SUM(contracts),
  SUM(revenue),
  ROUND(AVG(cpl), 2),
  ROUND(AVG(roas), 2)
FROM stg.v9_google_performance
GROUP BY dt

ORDER BY dt DESC, platform;

COMMENT ON VIEW stg.v9_platform_daily_overview IS 'V9: Объединенный обзор всех платформ по дням';

-- 4.2: Full Marketing Funnel (полная воронка маркетинга)
CREATE OR REPLACE VIEW stg.v9_marketing_funnel_full AS
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
  ROUND(100.0 * SUM(total_leads) / NULLIF(SUM(total_clicks), 0), 2) as click_to_lead,
  ROUND(100.0 * SUM(total_contracts) / NULLIF(SUM(total_leads), 0), 2) as lead_to_contract,

  -- Economics
  ROUND(SUM(total_spend) / NULLIF(SUM(total_leads), 0), 2) as cpl,
  ROUND(SUM(total_revenue) / NULLIF(SUM(total_spend), 0), 2) as roas

FROM stg.v9_platform_daily_overview
GROUP BY dt, platform
ORDER BY dt DESC, platform;

COMMENT ON VIEW stg.v9_marketing_funnel_full IS 'V9: Полная маркетинговая воронка по платформам';

-- ============================================================================
-- SUCCESS CHECK
-- ============================================================================
SELECT
  'V9 VIEWS CREATED (INCREMENTAL)' as status,
  COUNT(*) as total_views
FROM information_schema.views
WHERE table_schema = 'stg' AND table_name LIKE 'v9_%';
