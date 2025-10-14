-- ============================================================================
-- СТВОРЕННЯ АНАЛІТИЧНИХ VIEW для ДАШБОРДІВ
-- ============================================================================
-- Мета: Foundation для 5 дашбордів (Contracts, Campaigns, Creatives, Funnel, Real-time)
-- Час виконання: ~30-60 секунд
-- Виконати: ОДИН РАЗ вручну через psql
-- ============================================================================

\echo '=== 1/5: Створення v6_contracts_detail ==='

DROP MATERIALIZED VIEW IF EXISTS dashboards.v6_contracts_detail CASCADE;

CREATE MATERIALIZED VIEW dashboards.v6_contracts_detail AS
SELECT
  fl.id_source,
  fl.sk_lead,
  fl.created_date_txt::date as contract_date,
  fl.contract_amount,

  -- Platform attribution
  fl.dominant_platform,
  fl.utm_source,
  fl.utm_medium,
  fl.utm_campaign,
  fl.utm_content,
  fl.is_paid,

  -- Meta attribution (Facebook/Instagram)
  fl.meta_campaign_id,
  fl.meta_campaign_name,
  fl.meta_adset_id,
  fl.meta_adset_name,
  fl.meta_ad_id,
  fl.meta_ad_name,
  fl.meta_creative_id,
  fc.title as meta_creative_title,
  fc.body as meta_creative_body,
  fc.call_to_action_type as meta_cta,

  -- Google attribution
  fl.google_campaign_id,
  fl.google_campaign_name,
  fl.google_channel_type,
  fl.google_ad_group_id,
  fl.google_ad_group_name,
  fl.google_keyword_text,
  fl.google_search_term,

  -- Lead metadata
  fl.form_name,
  fl.request_type,
  fl.source_type_detected,

  -- Attribution completeness flags
  CASE WHEN fl.meta_creative_id IS NOT NULL THEN true ELSE false END as has_creative_attr,
  CASE WHEN fl.meta_campaign_id IS NOT NULL THEN true ELSE false END as has_meta_campaign_attr,
  CASE WHEN fl.google_campaign_id IS NOT NULL THEN true ELSE false END as has_google_campaign_attr,
  CASE WHEN fl.google_keyword_text IS NOT NULL THEN true ELSE false END as has_keyword_attr,

  -- Timestamps
  fl.row_created_at,
  fl.row_updated_at

FROM dashboards.fact_leads fl
LEFT JOIN raw.fb_ad_creative_details fc
  ON fc.ad_creative_id = fl.meta_creative_id
WHERE fl.contract_amount > 0
  AND fl.contract_amount IS NOT NULL;

CREATE UNIQUE INDEX idx_v6_contracts_detail_pk ON dashboards.v6_contracts_detail(id_source);
CREATE INDEX idx_v6_contracts_detail_date ON dashboards.v6_contracts_detail(contract_date);
CREATE INDEX idx_v6_contracts_detail_platform ON dashboards.v6_contracts_detail(dominant_platform);

\echo '✅ v6_contracts_detail створено'
\echo ''

-- ============================================================================

\echo '=== 2/5: Створення v6_campaign_roi_daily ==='

DROP MATERIALIZED VIEW IF EXISTS dashboards.v6_campaign_roi_daily CASCADE;

CREATE MATERIALIZED VIEW dashboards.v6_campaign_roi_daily AS

-- Meta campaigns
WITH meta_spend AS (
  SELECT
    date_start as date,
    campaign_id::text,
    SUM(spend) as spend,
    SUM(impressions) as impressions,
    SUM(clicks) as clicks
  FROM raw.fb_ad_insights
  GROUP BY date_start, campaign_id
),
meta_results AS (
  SELECT
    created_date_txt::date as date,
    meta_campaign_id,
    meta_campaign_name,
    COUNT(*) as leads,
    COUNT(CASE WHEN contract_amount > 0 THEN 1 END) as contracts,
    SUM(COALESCE(contract_amount, 0)) as revenue
  FROM dashboards.fact_leads
  WHERE meta_campaign_id IS NOT NULL
  GROUP BY created_date_txt::date, meta_campaign_id, meta_campaign_name
),
meta_combined AS (
  SELECT
    COALESCE(ms.date, mr.date) as date,
    'meta' as platform,
    COALESCE(ms.campaign_id, mr.meta_campaign_id) as campaign_id,
    mr.meta_campaign_name as campaign_name,
    COALESCE(ms.spend, 0) as spend,
    COALESCE(ms.impressions, 0) as impressions,
    COALESCE(ms.clicks, 0) as clicks,
    COALESCE(mr.leads, 0) as leads,
    COALESCE(mr.contracts, 0) as contracts,
    COALESCE(mr.revenue, 0) as revenue
  FROM meta_spend ms
  FULL OUTER JOIN meta_results mr
    ON ms.date = mr.date AND ms.campaign_id = mr.meta_campaign_id
),

-- Google campaigns
google_spend AS (
  SELECT
    date,
    campaign_id::text,
    campaign_name,
    SUM(cost_micros)/1000000 as spend,
    SUM(impressions) as impressions,
    SUM(clicks) as clicks
  FROM raw.google_ads_campaign_daily
  GROUP BY date, campaign_id, campaign_name
),
google_results AS (
  SELECT
    created_date_txt::date as date,
    google_campaign_id,
    google_campaign_name,
    COUNT(*) as leads,
    COUNT(CASE WHEN contract_amount > 0 THEN 1 END) as contracts,
    SUM(COALESCE(contract_amount, 0)) as revenue
  FROM dashboards.fact_leads
  WHERE google_campaign_id IS NOT NULL
  GROUP BY created_date_txt::date, google_campaign_id, google_campaign_name
),
google_combined AS (
  SELECT
    COALESCE(gs.date, gr.date) as date,
    'google' as platform,
    COALESCE(gs.campaign_id, gr.google_campaign_id) as campaign_id,
    COALESCE(gs.campaign_name, gr.google_campaign_name) as campaign_name,
    COALESCE(gs.spend, 0) as spend,
    COALESCE(gs.impressions, 0) as impressions,
    COALESCE(gs.clicks, 0) as clicks,
    COALESCE(gr.leads, 0) as leads,
    COALESCE(gr.contracts, 0) as contracts,
    COALESCE(gr.revenue, 0) as revenue
  FROM google_spend gs
  FULL OUTER JOIN google_results gr
    ON gs.date = gr.date AND gs.campaign_id = gr.google_campaign_id
)

-- Combine both platforms
SELECT
  date,
  platform,
  campaign_id,
  campaign_name,
  spend,
  impressions,
  clicks,
  leads,
  contracts,
  revenue,

  -- Calculated metrics
  ROUND(spend / NULLIF(clicks, 0), 2) as cpc,
  ROUND(spend / NULLIF(leads, 0), 2) as cpl,
  ROUND(spend / NULLIF(contracts, 0), 2) as cpa,
  ROUND(100.0 * clicks / NULLIF(impressions, 0), 2) as ctr,
  ROUND(100.0 * leads / NULLIF(clicks, 0), 2) as click_to_lead_rate,
  ROUND(100.0 * contracts / NULLIF(leads, 0), 2) as cvr,
  ROUND((revenue - spend) / NULLIF(spend, 0) * 100, 2) as roi_pct,
  revenue - spend as profit

FROM meta_combined
UNION ALL
SELECT
  date, platform, campaign_id, campaign_name,
  spend, impressions, clicks, leads, contracts, revenue,
  ROUND(spend / NULLIF(clicks, 0), 2),
  ROUND(spend / NULLIF(leads, 0), 2),
  ROUND(spend / NULLIF(contracts, 0), 2),
  ROUND(100.0 * clicks / NULLIF(impressions, 0), 2),
  ROUND(100.0 * leads / NULLIF(clicks, 0), 2),
  ROUND(100.0 * contracts / NULLIF(leads, 0), 2),
  ROUND((revenue - spend) / NULLIF(spend, 0) * 100, 2),
  revenue - spend
FROM google_combined;

CREATE UNIQUE INDEX idx_v6_campaign_roi_pk ON dashboards.v6_campaign_roi_daily(date, platform, campaign_id);
CREATE INDEX idx_v6_campaign_roi_date ON dashboards.v6_campaign_roi_daily(date);
CREATE INDEX idx_v6_campaign_roi_platform ON dashboards.v6_campaign_roi_daily(platform);

\echo '✅ v6_campaign_roi_daily створено'
\echo ''

-- ============================================================================

\echo '=== 3/5: Створення v6_creative_performance ==='

DROP MATERIALIZED VIEW IF EXISTS dashboards.v6_creative_performance CASCADE;

CREATE MATERIALIZED VIEW dashboards.v6_creative_performance AS

WITH creative_spend AS (
  SELECT
    fa.ad_creative_id,
    SUM(fai.spend) as total_spend,
    SUM(fai.impressions) as total_impressions,
    SUM(fai.clicks) as total_clicks,
    MIN(fai.date_start) as first_seen_date,
    MAX(fai.date_start) as last_seen_date
  FROM raw.fb_ad_insights fai
  JOIN raw.fb_ads fa ON fa.ad_id = fai.ad_id
  WHERE fa.ad_creative_id IS NOT NULL
  GROUP BY fa.ad_creative_id
),
creative_results AS (
  SELECT
    meta_creative_id,
    COUNT(*) as leads,
    COUNT(CASE WHEN contract_amount > 0 THEN 1 END) as contracts,
    SUM(COALESCE(contract_amount, 0)) as revenue,
    MIN(created_date_txt::date) as first_lead_date,
    MAX(created_date_txt::date) as last_lead_date
  FROM dashboards.fact_leads
  WHERE meta_creative_id IS NOT NULL
  GROUP BY meta_creative_id
)

SELECT
  cs.ad_creative_id as creative_id,
  fc.title,
  fc.body,
  fc.call_to_action_type,
  fc.link_url,

  -- Spend metrics
  COALESCE(cs.total_spend, 0) as total_spend,
  COALESCE(cs.total_impressions, 0) as total_impressions,
  COALESCE(cs.total_clicks, 0) as total_clicks,

  -- Lead/Contract metrics
  COALESCE(cr.leads, 0) as leads,
  COALESCE(cr.contracts, 0) as contracts,
  COALESCE(cr.revenue, 0) as revenue,

  -- Calculated metrics
  ROUND(cs.total_spend / NULLIF(cr.leads, 0), 2) as cpl,
  ROUND(cs.total_spend / NULLIF(cr.contracts, 0), 2) as cpa,
  ROUND(100.0 * cs.total_clicks / NULLIF(cs.total_impressions, 0), 2) as ctr,
  ROUND(100.0 * cr.leads / NULLIF(cs.total_clicks, 0), 2) as click_to_lead_rate,
  ROUND(100.0 * cr.contracts / NULLIF(cr.leads, 0), 2) as cvr,
  ROUND((cr.revenue - cs.total_spend) / NULLIF(cs.total_spend, 0) * 100, 2) as roi_pct,

  -- Date ranges
  cs.first_seen_date,
  cs.last_seen_date,
  cr.first_lead_date,
  cr.last_lead_date,
  COALESCE(cs.last_seen_date::date - cs.first_seen_date::date + 1, 0) as days_active,

  -- Performance flags
  CASE
    WHEN cr.contracts >= 3 AND (cr.revenue - COALESCE(cs.total_spend, 0)) / NULLIF(cs.total_spend, 0) > 1 THEN 'top_performer'
    WHEN cr.leads >= 20 AND COALESCE(cr.contracts, 0) = 0 THEN 'underperformer'
    WHEN cr.leads >= 10 AND (cr.revenue - COALESCE(cs.total_spend, 0)) / NULLIF(cs.total_spend, 0) < -0.5 THEN 'loss_maker'
    WHEN cr.leads >= 5 AND cr.contracts > 0 THEN 'normal'
    WHEN cr.leads >= 1 THEN 'testing'
    ELSE 'no_results'
  END as performance_status

FROM creative_spend cs
FULL OUTER JOIN creative_results cr
  ON cs.ad_creative_id = cr.meta_creative_id
LEFT JOIN raw.fb_ad_creative_details fc
  ON fc.ad_creative_id = COALESCE(cs.ad_creative_id, cr.meta_creative_id)
WHERE cs.total_spend > 0 OR cr.leads > 0;

CREATE UNIQUE INDEX idx_v6_creative_perf_pk ON dashboards.v6_creative_performance(creative_id);
CREATE INDEX idx_v6_creative_perf_status ON dashboards.v6_creative_performance(performance_status);

\echo '✅ v6_creative_performance створено'
\echo ''

-- ============================================================================

\echo '=== 4/5: Створення v6_attribution_coverage ==='

DROP MATERIALIZED VIEW IF EXISTS dashboards.v6_attribution_coverage CASCADE;

CREATE MATERIALIZED VIEW dashboards.v6_attribution_coverage AS

SELECT
  created_date_txt::date as date,

  -- Total counts
  COUNT(*) as total_leads,
  COUNT(CASE WHEN contract_amount > 0 THEN 1 END) as total_contracts,
  SUM(COALESCE(contract_amount, 0)) as total_revenue,

  -- Platform attribution
  COUNT(CASE WHEN dominant_platform IS NOT NULL AND dominant_platform != 'direct' THEN 1 END) as with_platform_attr,
  COUNT(CASE WHEN utm_source IS NOT NULL THEN 1 END) as with_utm,
  COUNT(CASE WHEN is_paid THEN 1 END) as is_paid_traffic,

  -- Meta attribution levels
  COUNT(CASE WHEN meta_campaign_id IS NOT NULL THEN 1 END) as with_meta_campaign,
  COUNT(CASE WHEN meta_adset_id IS NOT NULL THEN 1 END) as with_meta_adset,
  COUNT(CASE WHEN meta_ad_id IS NOT NULL THEN 1 END) as with_meta_ad,
  COUNT(CASE WHEN meta_creative_id IS NOT NULL THEN 1 END) as with_meta_creative,

  -- Google attribution levels
  COUNT(CASE WHEN google_campaign_id IS NOT NULL THEN 1 END) as with_google_campaign,
  COUNT(CASE WHEN google_ad_group_id IS NOT NULL THEN 1 END) as with_google_adgroup,
  COUNT(CASE WHEN google_keyword_text IS NOT NULL THEN 1 END) as with_google_keyword,

  -- Contract attribution
  COUNT(CASE WHEN contract_amount > 0 AND meta_creative_id IS NOT NULL THEN 1 END) as contracts_with_creative,
  COUNT(CASE WHEN contract_amount > 0 AND meta_campaign_id IS NOT NULL THEN 1 END) as contracts_with_meta,
  COUNT(CASE WHEN contract_amount > 0 AND google_campaign_id IS NOT NULL THEN 1 END) as contracts_with_google,
  COUNT(CASE WHEN contract_amount > 0 AND dominant_platform = 'direct' THEN 1 END) as contracts_direct,

  -- Coverage percentages
  ROUND(100.0 * COUNT(CASE WHEN meta_creative_id IS NOT NULL THEN 1 END) / NULLIF(COUNT(*), 0), 2) as pct_with_creative,
  ROUND(100.0 * COUNT(CASE WHEN contract_amount > 0 AND meta_creative_id IS NOT NULL THEN 1 END) /
    NULLIF(COUNT(CASE WHEN contract_amount > 0 THEN 1 END), 0), 2) as pct_contracts_with_creative,
  ROUND(100.0 * COUNT(CASE WHEN contract_amount > 0 AND (meta_campaign_id IS NOT NULL OR google_campaign_id IS NOT NULL) THEN 1 END) /
    NULLIF(COUNT(CASE WHEN contract_amount > 0 THEN 1 END), 0), 2) as pct_contracts_with_campaign

FROM dashboards.fact_leads
GROUP BY created_date_txt::date;

CREATE UNIQUE INDEX idx_v6_attr_coverage_pk ON dashboards.v6_attribution_coverage(date);

\echo '✅ v6_attribution_coverage створено'
\echo ''

-- ============================================================================

\echo '=== 5/5: Створення v6_funnel_daily ==='

DROP MATERIALIZED VIEW IF EXISTS dashboards.v6_funnel_daily CASCADE;

CREATE MATERIALIZED VIEW dashboards.v6_funnel_daily AS

WITH meta_funnel AS (
  SELECT
    fai.date_start as date,
    'meta' as platform,
    SUM(fai.impressions) as impressions,
    SUM(fai.clicks) as clicks
  FROM raw.fb_ad_insights fai
  GROUP BY fai.date_start
),
google_funnel AS (
  SELECT
    gac.date,
    'google' as platform,
    SUM(gac.impressions) as impressions,
    SUM(gac.clicks) as clicks
  FROM raw.google_ads_campaign_daily gac
  GROUP BY gac.date
),
combined_funnel AS (
  SELECT * FROM meta_funnel
  UNION ALL
  SELECT * FROM google_funnel
),
leads_by_platform AS (
  SELECT
    created_date_txt::date as date,
    CASE
      WHEN dominant_platform IN ('meta', 'facebook') THEN 'meta'
      WHEN dominant_platform = 'google' THEN 'google'
      ELSE 'other'
    END as platform,
    COUNT(*) as leads,
    COUNT(CASE WHEN contract_amount > 0 THEN 1 END) as contracts,
    SUM(COALESCE(contract_amount, 0)) as revenue
  FROM dashboards.fact_leads
  GROUP BY created_date_txt::date,
    CASE
      WHEN dominant_platform IN ('meta', 'facebook') THEN 'meta'
      WHEN dominant_platform = 'google' THEN 'google'
      ELSE 'other'
    END
)

SELECT
  cf.date,
  cf.platform,

  -- Funnel stages
  cf.impressions,
  cf.clicks,
  COALESCE(lp.leads, 0) as leads,
  COALESCE(lp.contracts, 0) as contracts,
  COALESCE(lp.revenue, 0) as revenue,

  -- Conversion rates
  ROUND(100.0 * cf.clicks / NULLIF(cf.impressions, 0), 2) as ctr,
  ROUND(100.0 * lp.leads / NULLIF(cf.clicks, 0), 2) as click_to_lead_rate,
  ROUND(100.0 * lp.contracts / NULLIF(lp.leads, 0), 2) as lead_to_contract_rate,
  ROUND(100.0 * lp.contracts / NULLIF(cf.clicks, 0), 2) as click_to_contract_rate,

  -- Drop-off rates
  ROUND(100.0 * (cf.clicks - lp.leads) / NULLIF(cf.clicks, 0), 2) as click_dropoff_pct,
  ROUND(100.0 * (lp.leads - lp.contracts) / NULLIF(lp.leads, 0), 2) as lead_dropoff_pct

FROM combined_funnel cf
LEFT JOIN leads_by_platform lp
  ON cf.date = lp.date AND cf.platform = lp.platform
WHERE cf.impressions > 0 OR lp.leads > 0;

CREATE UNIQUE INDEX idx_v6_funnel_pk ON dashboards.v6_funnel_daily(date, platform);
CREATE INDEX idx_v6_funnel_date ON dashboards.v6_funnel_daily(date);

\echo '✅ v6_funnel_daily створено'
\echo ''

-- ============================================================================

\echo '=== ПЕРШИЙ REFRESH ВСІХ VIEWS ==='

REFRESH MATERIALIZED VIEW dashboards.v6_contracts_detail;
REFRESH MATERIALIZED VIEW dashboards.v6_campaign_roi_daily;
REFRESH MATERIALIZED VIEW dashboards.v6_creative_performance;
REFRESH MATERIALIZED VIEW dashboards.v6_attribution_coverage;
REFRESH MATERIALIZED VIEW dashboards.v6_funnel_daily;

\echo ''
\echo '=== ПЕРЕВІРКА РЕЗУЛЬТАТІВ ==='

SELECT 'v6_contracts_detail' as view_name,
  COUNT(*) as rows,
  MIN(contract_date) as earliest_date,
  MAX(contract_date) as latest_date,
  SUM(contract_amount) as total_revenue
FROM dashboards.v6_contracts_detail

UNION ALL

SELECT 'v6_campaign_roi_daily',
  COUNT(*),
  MIN(date),
  MAX(date),
  SUM(revenue)
FROM dashboards.v6_campaign_roi_daily

UNION ALL

SELECT 'v6_creative_performance',
  COUNT(*),
  MIN(first_lead_date),
  MAX(last_lead_date),
  SUM(revenue)
FROM dashboards.v6_creative_performance

UNION ALL

SELECT 'v6_attribution_coverage',
  COUNT(*),
  MIN(date),
  MAX(date),
  SUM(total_revenue)
FROM dashboards.v6_attribution_coverage

UNION ALL

SELECT 'v6_funnel_daily',
  COUNT(*),
  MIN(date),
  MAX(date),
  SUM(revenue)
FROM dashboards.v6_funnel_daily;

\echo ''
\echo '========================================='
\echo '✅ ВСІ 5 VIEWS СТВОРЕНО ТА ЗАПОВНЕНО'
\echo '========================================='
\echo ''
\echo 'Готово для використання в дашбордах!'
