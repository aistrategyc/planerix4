-- ============================================================================
-- ФИНАЛЬНЫЙ VIEW: Contracts с полной атрибуцией из fact_leads
-- Date: October 19, 2025, 21:00
-- Базируется на ПРАВИЛЬНОЙ архитектуре: crm_requests + fact_leads
-- ============================================================================

CREATE OR REPLACE VIEW dashboards.v7_contracts_with_attribution AS
SELECT
  -- Contract Info
  cr.id_source,
  cr.contract_id,
  cr.contract_total as contract_amount,
  cr.source_date_time as request_date,
  cr.request_type,
  cr.form_name,
  cr.email,
  cr.manager_login,
  cr.branch_name,

  -- Attribution from fact_leads
  fl.dominant_platform as platform,
  fl.utm_source,
  fl.utm_medium,
  fl.utm_campaign,
  fl.utm_content,
  fl.utm_term,

  -- Google Attribution
  fl.gclid,
  fl.google_campaign_id,
  fl.google_campaign_name,
  fl.google_channel_type,
  fl.google_ad_group_id,
  fl.google_ad_group_name,
  fl.google_keyword_text,
  fl.google_search_term,

  -- Facebook Attribution
  fl.fb_lead_id,
  fl.fbclid,
  fl.meta_campaign_id,
  fl.meta_campaign_name,
  fl.meta_adset_id,
  fl.meta_adset_name,
  fl.meta_ad_id,
  fl.meta_ad_name,
  fl.meta_page_id,
  fl.meta_form_id,
  fl.meta_form_name,

  -- Attribution Classification
  CASE
    WHEN fl.gclid IS NOT NULL AND fl.gclid != '' THEN 'google_ads_click'
    WHEN fl.google_campaign_id IS NOT NULL THEN 'google_ads_campaign'
    WHEN fl.fb_lead_id IS NOT NULL AND fl.fb_lead_id != '' THEN 'facebook_lead'
    WHEN fl.fbclid IS NOT NULL AND fl.fbclid != '' THEN 'facebook_click'
    WHEN fl.utm_source = 'google' THEN 'google_organic'
    WHEN fl.utm_source IN ('facebook', 'facebook.com') THEN 'facebook_organic'
    WHEN fl.utm_source = 'email' THEN 'email_campaign'
    WHEN fl.utm_source = 'viber' THEN 'viber'
    WHEN fl.utm_source = 'instagram_reels' THEN 'instagram'
    WHEN fl.utm_source IS NOT NULL THEN 'other_utm'
    ELSE 'direct'
  END as attribution_type,

  -- Attribution Confidence
  CASE
    WHEN fl.gclid IS NOT NULL AND fl.gclid != '' THEN 0.95
    WHEN fl.fb_lead_id IS NOT NULL AND fl.fb_lead_id != '' THEN 0.95
    WHEN fl.google_campaign_id IS NOT NULL THEN 0.90
    WHEN fl.fbclid IS NOT NULL AND fl.fbclid != '' THEN 0.85
    WHEN fl.utm_source IS NOT NULL AND fl.utm_medium = 'cpc' THEN 0.80
    WHEN fl.utm_source IS NOT NULL THEN 0.70
    ELSE 0.00
  END as attribution_confidence

FROM dashboards.crm_requests cr
LEFT JOIN dashboards.fact_leads fl ON fl.id_source = cr.id_source
WHERE cr.contract_id IS NOT NULL
ORDER BY cr.contract_id DESC;

-- ============================================================================
-- VIEW 2: Contracts Summary by Attribution Type
-- ============================================================================

CREATE OR REPLACE VIEW dashboards.v7_contracts_attribution_summary AS
SELECT
  attribution_type,
  COUNT(*) as contracts_count,
  SUM(contract_amount) as total_revenue,
  AVG(contract_amount) as avg_contract_amount,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percent_of_total
FROM dashboards.v7_contracts_with_attribution
GROUP BY attribution_type
ORDER BY contracts_count DESC;

-- ============================================================================
-- VIEW 3: Contracts by Google Campaign
-- ============================================================================

CREATE OR REPLACE VIEW dashboards.v7_contracts_by_google_campaign AS
SELECT
  google_campaign_id,
  google_campaign_name,
  google_channel_type,
  COUNT(*) as contracts_count,
  SUM(contract_amount) as total_revenue,
  AVG(contract_amount) as avg_contract_amount,
  COUNT(DISTINCT google_ad_group_id) as ad_groups_count,
  STRING_AGG(DISTINCT google_keyword_text, ', ') as keywords_used
FROM dashboards.v7_contracts_with_attribution
WHERE google_campaign_id IS NOT NULL
GROUP BY google_campaign_id, google_campaign_name, google_channel_type
ORDER BY contracts_count DESC;

-- ============================================================================
-- VIEW 4: Contracts by Facebook Campaign
-- ============================================================================

CREATE OR REPLACE VIEW dashboards.v7_contracts_by_meta_campaign AS
SELECT
  meta_campaign_id,
  meta_campaign_name,
  COUNT(*) as contracts_count,
  SUM(contract_amount) as total_revenue,
  AVG(contract_amount) as avg_contract_amount,
  COUNT(DISTINCT meta_adset_id) as adsets_count,
  COUNT(DISTINCT meta_ad_id) as ads_count,
  STRING_AGG(DISTINCT meta_form_name, ', ') as forms_used
FROM dashboards.v7_contracts_with_attribution
WHERE meta_campaign_id IS NOT NULL
GROUP BY meta_campaign_id, meta_campaign_name
ORDER BY contracts_count DESC;

-- ============================================================================
-- VIEW 5: Daily Contracts Timeline
-- ============================================================================

CREATE OR REPLACE VIEW dashboards.v7_contracts_daily AS
SELECT
  request_date::DATE as dt,
  attribution_type,
  COUNT(*) as contracts_count,
  SUM(contract_amount) as revenue,
  AVG(contract_amount) as avg_contract
FROM dashboards.v7_contracts_with_attribution
GROUP BY request_date::DATE, attribution_type
ORDER BY dt DESC, contracts_count DESC;

-- ============================================================================
-- Проверка созданных views
-- ============================================================================

SELECT
  'v7_contracts_with_attribution' as view_name,
  COUNT(*) as total_contracts
FROM dashboards.v7_contracts_with_attribution

UNION ALL

SELECT
  'v7_contracts_attribution_summary',
  COUNT(*)
FROM dashboards.v7_contracts_attribution_summary

UNION ALL

SELECT
  'v7_contracts_by_google_campaign',
  COUNT(*)
FROM dashboards.v7_contracts_by_google_campaign

UNION ALL

SELECT
  'v7_contracts_by_meta_campaign',
  COUNT(*)
FROM dashboards.v7_contracts_by_meta_campaign

UNION ALL

SELECT
  'v7_contracts_daily (days)',
  COUNT(DISTINCT dt)
FROM dashboards.v7_contracts_daily;
