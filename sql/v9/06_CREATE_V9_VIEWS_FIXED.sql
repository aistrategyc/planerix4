-- ============================================================================
-- V9 ANALYTICS VIEWS - FIXED VERSION
-- ============================================================================
-- Цель: Создать все 7 analytics views с учетом РЕАЛЬНОЙ структуры данных
-- Дата: 22 октября 2025
-- ============================================================================

-- DROP существующие views если есть
DROP VIEW IF EXISTS stg.v9_ads_analytics_daily CASCADE;
DROP VIEW IF EXISTS stg.v9_contracts_attribution CASCADE;
DROP VIEW IF EXISTS stg.v9_marketing_funnel_daily CASCADE;
DROP VIEW IF EXISTS stg.v9_platform_summary CASCADE;
DROP VIEW IF EXISTS stg.v9_campaign_performance CASCADE;
DROP VIEW IF EXISTS stg.v9_lead_source_breakdown CASCADE;
DROP VIEW IF EXISTS stg.v9_daily_overview CASCADE;

-- ============================================================================
-- VIEW 1: v9_ads_analytics_daily
-- Для страницы: /ads (детальная аналитика рекламы)
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_ads_analytics_daily AS
WITH ad_spend AS (
  -- Facebook spend
  SELECT
    date_start::date as dt,
    'facebook' as platform,
    campaign_id,
    campaign_name,
    adset_id,
    adset_name,
    ad_id,
    ad_name,
    SUM(spend) as spend,
    SUM(impressions) as impressions,
    SUM(clicks) as clicks,
    SUM(reach) as reach
  FROM raw.fb_ad_insights
  WHERE date_start >= '2025-01-01'
  GROUP BY 1,2,3,4,5,6,7,8

  UNION ALL

  -- Google spend
  SELECT
    date::date,
    'google',
    campaign_id::text,
    campaign_name,
    NULL::text as adset_id,
    NULL::text as adset_name,
    NULL::text as ad_id,
    NULL::text as ad_name,
    SUM(cost) as spend,
    SUM(impressions),
    SUM(clicks),
    NULL::numeric as reach
  FROM raw.google_ads_campaign_daily
  WHERE date >= '2025-01-01'
  GROUP BY 1,2,3,4
)
SELECT
  ad.dt,
  ad.platform,
  ad.campaign_id,
  ad.campaign_name,
  ad.adset_id,
  ad.adset_name,
  ad.ad_id,
  ad.ad_name,

  -- Ad metrics
  ad.spend,
  ad.impressions,
  ad.clicks,
  ad.reach,

  -- CRM metrics (leads на ту же дату)
  COUNT(DISTINCT CASE WHEN leads.lead_day = ad.dt THEN leads.client_id END) as crm_leads_same_day,
  COUNT(DISTINCT CASE WHEN leads.lead_day BETWEEN ad.dt AND ad.dt + INTERVAL '7 days' THEN leads.client_id END) as crm_leads_7d,
  COUNT(DISTINCT contracts.client_id) as contracts,
  SUM(contracts.contract_amount) as revenue,

  -- Calculated KPIs
  CASE WHEN ad.clicks > 0 THEN ROUND(ad.spend / ad.clicks, 2) ELSE NULL END as cpc,
  CASE WHEN COUNT(DISTINCT CASE WHEN leads.lead_day = ad.dt THEN leads.client_id END) > 0
    THEN ROUND(ad.spend / COUNT(DISTINCT CASE WHEN leads.lead_day = ad.dt THEN leads.client_id END), 2)
    ELSE NULL END as cpl,
  CASE WHEN ad.spend > 0 THEN ROUND(SUM(contracts.contract_amount) / ad.spend, 2) ELSE NULL END as roas,
  CASE WHEN COUNT(DISTINCT CASE WHEN leads.lead_day = ad.dt THEN leads.client_id END) > 0
    THEN ROUND(100.0 * COUNT(DISTINCT contracts.client_id) / COUNT(DISTINCT CASE WHEN leads.lead_day = ad.dt THEN leads.client_id END), 2)
    ELSE 0 END as conversion_rate

FROM ad_spend ad
LEFT JOIN stg.fact_leads leads ON (
  ad.platform = leads.matched_platform AND
  ad.campaign_id = leads.campaign_id
)
LEFT JOIN stg.fact_contracts contracts ON (
  leads.client_id = contracts.client_id
)
GROUP BY ad.dt, ad.platform, ad.campaign_id, ad.campaign_name, ad.adset_id, ad.adset_name, ad.ad_id, ad.ad_name, ad.spend, ad.impressions, ad.clicks, ad.reach;

COMMENT ON VIEW stg.v9_ads_analytics_daily IS 'V9: Ежедневная аналитика рекламы с CRM метриками';

-- ============================================================================
-- VIEW 2: v9_contracts_attribution
-- Для страницы: /contracts-analytics
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_contracts_attribution AS
SELECT
  fc.dominant_platform as platform,
  fc.utm_source as traffic_source,
  fc.utm_campaign as campaign,
  fc.matched_platform,
  fc.campaign_name,
  fc.ad_name,

  COUNT(DISTINCT fc.client_id) as total_contracts,
  SUM(fc.contract_amount) as revenue,
  ROUND(AVG(fc.contract_amount), 0) as avg_contract_value,
  ROUND(AVG(fc.days_to_contract), 1) as avg_days_to_contract,
  MIN(fc.contract_day) as first_contract_date,
  MAX(fc.contract_day) as last_contract_date

FROM stg.fact_contracts fc
WHERE fc.contract_day >= '2025-01-01'
GROUP BY fc.dominant_platform, fc.utm_source, fc.utm_campaign, fc.matched_platform, fc.campaign_name, fc.ad_name
HAVING COUNT(DISTINCT fc.client_id) > 0
ORDER BY revenue DESC NULLS LAST;

COMMENT ON VIEW stg.v9_contracts_attribution IS 'V9: Атрибуция договоров к источникам трафика';

-- ============================================================================
-- VIEW 3: v9_marketing_funnel_daily
-- Для страницы: /data-analytics (воронка маркетинга)
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_marketing_funnel_daily AS
WITH daily_metrics AS (
  SELECT
    dt,
    platform,
    SUM(spend) as spend,
    SUM(impressions) as impressions,
    SUM(clicks) as clicks,
    SUM(crm_leads_same_day) as leads,
    SUM(contracts) as contracts,
    SUM(revenue) as revenue
  FROM stg.v9_ads_analytics_daily
  GROUP BY 1,2
)
SELECT
  dt,
  platform,
  spend,
  impressions,
  clicks,
  leads,
  contracts,
  revenue,

  -- Funnel rates
  ROUND(100.0 * clicks / NULLIF(impressions, 0), 2) as ctr,
  ROUND(100.0 * leads / NULLIF(clicks, 0), 2) as click_to_lead_rate,
  ROUND(100.0 * contracts / NULLIF(leads, 0), 2) as lead_to_contract_rate,

  -- Economics
  ROUND(spend / NULLIF(clicks, 0), 2) as cpc,
  ROUND(spend / NULLIF(leads, 0), 2) as cpl,
  ROUND(revenue / NULLIF(spend, 0), 2) as roas,
  ROUND(revenue / NULLIF(contracts, 0), 0) as avg_contract_value

FROM daily_metrics
ORDER BY dt DESC, platform;

COMMENT ON VIEW stg.v9_marketing_funnel_daily IS 'V9: Ежедневная воронка маркетинга';

-- ============================================================================
-- VIEW 4: v9_platform_summary
-- Общая статистика по платформам
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_platform_summary AS
SELECT
  matched_platform as platform,

  -- Leads metrics
  COUNT(DISTINCT fl.client_id) as total_leads,
  COUNT(DISTINCT fc.client_id) as contracts,
  SUM(fc.contract_amount) as revenue,

  -- Performance metrics
  ROUND(AVG(fc.contract_amount), 0) as avg_contract_value,
  ROUND(100.0 * COUNT(DISTINCT fc.client_id) / NULLIF(COUNT(DISTINCT fl.client_id), 0), 2) as conversion_rate,
  ROUND(AVG(fc.days_to_contract), 1) as avg_days_to_contract,

  -- Time range
  MIN(fl.lead_day) as first_lead_date,
  MAX(fl.lead_day) as last_lead_date

FROM stg.fact_leads fl
LEFT JOIN stg.fact_contracts fc ON fl.client_id = fc.client_id
WHERE fl.lead_day >= '2025-01-01'
GROUP BY matched_platform
ORDER BY total_leads DESC;

COMMENT ON VIEW stg.v9_platform_summary IS 'V9: Общая статистика по платформам';

-- ============================================================================
-- VIEW 5: v9_campaign_performance
-- Детализация: производительность кампаний
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_campaign_performance AS
SELECT
  matched_platform as platform,
  campaign_id,
  campaign_name,

  -- Lead metrics
  COUNT(DISTINCT fl.client_id) as total_leads,
  COUNT(DISTINCT fc.client_id) as contracts,
  SUM(fc.contract_amount) as revenue,

  -- Performance
  ROUND(AVG(fc.contract_amount), 0) as avg_contract_value,
  ROUND(100.0 * COUNT(DISTINCT fc.client_id) / NULLIF(COUNT(DISTINCT fl.client_id), 0), 2) as conversion_rate,
  ROUND(AVG(fc.days_to_contract), 1) as avg_days_to_contract,

  -- Date range
  MIN(fl.lead_day) as campaign_start_date,
  MAX(fl.lead_day) as campaign_last_lead_date,
  COUNT(DISTINCT fl.lead_day) as active_days

FROM stg.fact_leads fl
LEFT JOIN stg.fact_contracts fc ON fl.client_id = fc.client_id
WHERE fl.lead_day >= '2025-01-01'
  AND campaign_id IS NOT NULL
GROUP BY matched_platform, campaign_id, campaign_name
ORDER BY total_leads DESC;

COMMENT ON VIEW stg.v9_campaign_performance IS 'V9: Детальная производительность кампаний';

-- ============================================================================
-- VIEW 6: v9_lead_source_breakdown
-- Разбивка лидов по источникам
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_lead_source_breakdown AS
SELECT
  dominant_platform,
  source_type,
  utm_source,

  COUNT(DISTINCT client_id) as total_leads,
  COUNT(DISTINCT CASE WHEN matched_platform IS NOT NULL THEN client_id END) as matched_leads,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN matched_platform IS NOT NULL THEN client_id END) / COUNT(DISTINCT client_id), 2) as match_rate,

  -- Date range
  MIN(lead_day) as first_lead,
  MAX(lead_day) as last_lead

FROM stg.fact_leads
WHERE lead_day >= '2025-01-01'
GROUP BY dominant_platform, source_type, utm_source
ORDER BY total_leads DESC;

COMMENT ON VIEW stg.v9_lead_source_breakdown IS 'V9: Разбивка лидов по источникам';

-- ============================================================================
-- VIEW 7: v9_daily_overview
-- Для homepage дашборда (ежедневный обзор)
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_daily_overview AS
SELECT
  dt,
  SUM(spend) as total_spend,
  SUM(impressions) as total_impressions,
  SUM(clicks) as total_clicks,
  SUM(leads) as total_leads,
  SUM(contracts) as total_contracts,
  SUM(revenue) as total_revenue,

  -- KPIs
  ROUND(SUM(revenue) / NULLIF(SUM(spend), 0), 2) as roas,
  ROUND(SUM(spend) / NULLIF(SUM(leads), 0), 2) as cpl,
  ROUND(100.0 * SUM(contracts) / NULLIF(SUM(leads), 0), 2) as conversion_rate

FROM stg.v9_marketing_funnel_daily
WHERE dt >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY dt
ORDER BY dt DESC;

COMMENT ON VIEW stg.v9_daily_overview IS 'V9: Ежедневный обзор с KPIs';

-- ============================================================================
-- УСПЕШНО СОЗДАНЫ ВСЕ 7 ANALYTICS VIEWS
-- ============================================================================
SELECT
  'V9 VIEWS CREATED' as status,
  COUNT(*) as total_views
FROM information_schema.views
WHERE table_schema = 'stg' AND table_name LIKE 'v9_%';
