-- ============================================================================
-- V9 FACEBOOK CREATIVES VIEWS - SUPER DETAIL FOR /ADS PAGE
-- ============================================================================
-- Purpose: Provide creative-level detail (images, texts, CTAs) for Facebook ads
-- Date: 22 октября 2025
-- User requirement: "супер детализация по мете - до картинок и текста"
-- ============================================================================

-- ============================================================================
-- VIEW 1: v9_facebook_ad_creatives_full
-- Complete creative details with ad linkage
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_facebook_ad_creatives_full AS
SELECT
  -- Ad identifiers
  ad.ad_id,
  ad.ad_name,
  ad.adset_id,
  adset.name as adset_name,
  ad.campaign_id,
  camp.name as campaign_name,

  -- Creative identifiers
  ad.ad_creative_id,
  cd.creative_name,
  cd.object_type,

  -- Creative content - Text
  cd.title,
  cd.body,
  cd.description,
  cd.link_description,
  cd.link_message,
  cd.link_name,

  -- Creative content - Media
  cd.media_image_src,
  cd.thumbnail_url,
  cd.video_id,

  -- Creative content - Links
  cd.link_url,
  cd.object_url,
  cd.permalink_url,

  -- Creative content - CTA
  cd.cta_type,
  cd.cta_link,
  cd.video_cta_type,
  cd.video_cta_link,

  -- Post details (if available)
  cp.post_id,
  cp.message as post_message,
  cp.media_type,
  cp.created_time as post_created_time,

  -- Metadata
  cd.updated_time as creative_updated_time,
  ad.load_timestamp as ad_updated_time

FROM raw.fb_ads ad

-- Link to creative details
LEFT JOIN raw.fb_ad_creative_details cd ON ad.ad_creative_id = cd.ad_creative_id

-- Link to creative posts
LEFT JOIN raw.fb_creative_posts cp ON ad.ad_creative_id = cp.ad_creative_id

-- Link to adset
LEFT JOIN raw.fb_adsets adset ON ad.adset_id = adset.adset_id

-- Link to campaign
LEFT JOIN raw.fb_campaigns camp ON ad.campaign_id = camp.campaign_id

WHERE ad.ad_creative_id IS NOT NULL;

COMMENT ON VIEW stg.v9_facebook_ad_creatives_full IS 'V9: Complete Facebook ad creative details (images, texts, CTAs)';

-- ============================================================================
-- VIEW 2: v9_facebook_creatives_performance
-- Creative performance with leads, contracts, spend
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_facebook_creatives_performance AS
WITH creative_spend AS (
  SELECT
    ad.ad_id,
    SUM(ins.spend) as total_spend,
    SUM(ins.impressions) as total_impressions,
    SUM(ins.clicks) as total_clicks,
    MIN(ins.date_start) as first_date,
    MAX(ins.date_start) as last_date
  FROM raw.fb_ads ad
  INNER JOIN raw.fb_ad_insights ins ON ad.ad_id = ins.ad_id
  WHERE ins.date_start >= '2025-01-01'
  GROUP BY ad.ad_id
),
creative_leads AS (
  SELECT
    fl.ad_id,
    COUNT(DISTINCT fl.client_id) as total_leads
  FROM stg.fact_leads fl
  WHERE fl.matched_platform = 'facebook'
    AND fl.ad_id IS NOT NULL
  GROUP BY fl.ad_id
),
creative_contracts AS (
  SELECT
    fc.fb_adset_id,
    COUNT(*) as total_contracts,
    SUM(fc.contract_amount) as total_revenue
  FROM stg.fact_contracts fc
  WHERE fc.matched_platform = 'facebook'
  GROUP BY fc.fb_adset_id
)
SELECT
  cr.ad_id,
  cr.ad_name,
  cr.ad_creative_id,
  cr.creative_name,
  cr.campaign_name,
  cr.adset_name,

  -- Creative content summary
  cr.title,
  cr.body,
  cr.media_image_src,
  cr.cta_type,
  cr.object_type,

  -- Performance metrics
  COALESCE(sp.total_spend, 0) as spend,
  COALESCE(sp.total_impressions, 0) as impressions,
  COALESCE(sp.total_clicks, 0) as clicks,
  COALESCE(ld.total_leads, 0) as leads,
  COALESCE(con.total_contracts, 0) as contracts,
  COALESCE(con.total_revenue, 0) as revenue,

  -- Efficiency metrics
  CASE WHEN sp.total_spend > 0 THEN ROUND(sp.total_spend / NULLIF(sp.total_clicks, 0), 2) ELSE NULL END as cpc,
  CASE WHEN sp.total_spend > 0 THEN ROUND(sp.total_spend / NULLIF(ld.total_leads, 0), 2) ELSE NULL END as cpl,
  CASE WHEN sp.total_spend > 0 THEN ROUND(sp.total_spend / NULLIF(con.total_contracts, 0), 2) ELSE NULL END as cpa,
  CASE WHEN sp.total_spend > 0 THEN ROUND(con.total_revenue / NULLIF(sp.total_spend, 0), 2) ELSE NULL END as roas,

  -- Conversion rates
  ROUND(100.0 * sp.total_clicks / NULLIF(sp.total_impressions, 0), 2) as ctr,
  ROUND(100.0 * ld.total_leads / NULLIF(sp.total_clicks, 0), 2) as click_to_lead_rate,
  ROUND(100.0 * con.total_contracts / NULLIF(ld.total_leads, 0), 2) as lead_to_contract_rate,

  -- Date range
  sp.first_date,
  sp.last_date

FROM stg.v9_facebook_ad_creatives_full cr
LEFT JOIN creative_spend sp ON cr.ad_id = sp.ad_id
LEFT JOIN creative_leads ld ON cr.ad_id = ld.ad_id
LEFT JOIN creative_contracts con ON cr.adset_id = con.fb_adset_id

WHERE sp.total_spend > 0 OR ld.total_leads > 0;

COMMENT ON VIEW stg.v9_facebook_creatives_performance IS 'V9: Creative performance with spend, leads, contracts, ROAS';

-- ============================================================================
-- VIEW 3: v9_facebook_creative_types_analysis
-- Performance by creative type (image, video, carousel, etc.)
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_facebook_creative_types_analysis AS
SELECT
  object_type,
  COUNT(DISTINCT ad_creative_id) as unique_creatives,
  COUNT(DISTINCT ad_id) as ads_using_type,
  COUNT(DISTINCT campaign_name) as campaigns_using_type,

  -- Aggregated performance
  SUM(spend) as total_spend,
  SUM(impressions) as total_impressions,
  SUM(clicks) as total_clicks,
  SUM(leads) as total_leads,
  SUM(contracts) as total_contracts,
  SUM(revenue) as total_revenue,

  -- Average metrics
  ROUND(AVG(spend), 2) as avg_spend_per_creative,
  ROUND(AVG(cpl), 2) as avg_cpl,
  ROUND(AVG(roas), 2) as avg_roas,
  ROUND(AVG(ctr), 2) as avg_ctr,
  ROUND(AVG(lead_to_contract_rate), 2) as avg_conversion_rate

FROM stg.v9_facebook_creatives_performance
WHERE object_type IS NOT NULL
GROUP BY object_type
ORDER BY total_spend DESC;

COMMENT ON VIEW stg.v9_facebook_creative_types_analysis IS 'V9: Performance analysis by creative type (image, video, etc.)';

-- ============================================================================
-- VIEW 4: v9_facebook_top_creatives_by_revenue
-- Top performing creatives by revenue
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_facebook_top_creatives_by_revenue AS
SELECT
  ad_id,
  ad_name,
  ad_creative_id,
  creative_name,
  campaign_name,

  -- Creative preview
  title,
  LEFT(body, 100) as body_preview,
  media_image_src,
  cta_type,

  -- Performance
  spend,
  leads,
  contracts,
  revenue,
  roas,
  cpl,
  cpa,

  -- Rankings
  ROW_NUMBER() OVER (ORDER BY revenue DESC NULLS LAST) as revenue_rank,
  ROW_NUMBER() OVER (ORDER BY roas DESC NULLS LAST) as roas_rank,
  ROW_NUMBER() OVER (ORDER BY contracts DESC NULLS LAST) as contracts_rank

FROM stg.v9_facebook_creatives_performance
WHERE revenue > 0
ORDER BY revenue DESC;

COMMENT ON VIEW stg.v9_facebook_top_creatives_by_revenue IS 'V9: Top Facebook creatives by revenue with rankings';

-- ============================================================================
-- VIEW 5: v9_facebook_creative_images_library
-- Image library with performance metrics
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_facebook_creative_images_library AS
SELECT
  ad_creative_id,
  creative_name,
  media_image_src,
  title,
  body,
  cta_type,
  object_type,

  -- Usage stats
  COUNT(DISTINCT ad_id) as ads_using_image,
  COUNT(DISTINCT campaign_name) as campaigns_using_image,

  -- Aggregated performance
  SUM(spend) as total_spend,
  SUM(leads) as total_leads,
  SUM(contracts) as total_contracts,
  SUM(revenue) as total_revenue,

  -- Average performance
  ROUND(AVG(roas), 2) as avg_roas,
  ROUND(AVG(ctr), 2) as avg_ctr,
  ROUND(AVG(lead_to_contract_rate), 2) as avg_conversion_rate

FROM stg.v9_facebook_creatives_performance
WHERE media_image_src IS NOT NULL
GROUP BY
  ad_creative_id, creative_name, media_image_src,
  title, body, cta_type, object_type
HAVING SUM(spend) > 0
ORDER BY total_revenue DESC;

COMMENT ON VIEW stg.v9_facebook_creative_images_library IS 'V9: Image library with performance (for creative reuse)';

-- ============================================================================
-- VIEW 6: v9_facebook_cta_effectiveness
-- Call-to-action button effectiveness analysis
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_facebook_cta_effectiveness AS
SELECT
  cta_type,

  -- Usage stats
  COUNT(DISTINCT ad_creative_id) as creatives_count,
  COUNT(DISTINCT ad_id) as ads_count,

  -- Performance
  SUM(spend) as total_spend,
  SUM(clicks) as total_clicks,
  SUM(leads) as total_leads,
  SUM(contracts) as total_contracts,
  SUM(revenue) as total_revenue,

  -- Efficiency
  ROUND(AVG(ctr), 2) as avg_ctr,
  ROUND(AVG(click_to_lead_rate), 2) as avg_click_to_lead_rate,
  ROUND(AVG(cpl), 2) as avg_cpl,
  ROUND(AVG(roas), 2) as avg_roas

FROM stg.v9_facebook_creatives_performance
WHERE cta_type IS NOT NULL
GROUP BY cta_type
ORDER BY total_revenue DESC;

COMMENT ON VIEW stg.v9_facebook_cta_effectiveness IS 'V9: CTA button effectiveness analysis';

-- ============================================================================
-- SUCCESS CHECKS
-- ============================================================================

-- Check 1: Verify creative views created
SELECT
  'Creative views created' as check_name,
  COUNT(*) as creative_views_count
FROM information_schema.views
WHERE table_schema = 'stg'
  AND table_name LIKE '%facebook_creative%';

-- Check 2: Sample creative data
SELECT
  'Top 5 creatives by revenue' as analysis,
  ad_name,
  title,
  revenue,
  roas,
  contracts
FROM stg.v9_facebook_top_creatives_by_revenue
LIMIT 5;

-- Check 3: Creative types breakdown
SELECT * FROM stg.v9_facebook_creative_types_analysis;

-- Check 4: CTA effectiveness
SELECT * FROM stg.v9_facebook_cta_effectiveness;

-- ============================================================================
-- SUCCESS CRITERIA
-- ============================================================================
-- ✅ 6 creative views created for /ads page
-- ✅ Full creative details: images, texts, CTAs, links
-- ✅ Performance metrics: spend, leads, contracts, revenue, ROAS
-- ✅ Creative type analysis (image, video, carousel)
-- ✅ CTA effectiveness analysis
-- ✅ Image library for creative reuse
-- ============================================================================
