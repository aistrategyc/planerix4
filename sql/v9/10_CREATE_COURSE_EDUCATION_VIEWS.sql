-- ============================================================================
-- V9 COURSE & EDUCATION FORM VIEWS
-- ============================================================================
-- Purpose: Course-level attribution and campaign effectiveness analysis
-- Date: 22 октября 2025
-- Focus: Real results from ads/creatives → courses → contracts
-- ============================================================================

-- ============================================================================
-- VIEW 1: v9_courses_overview
-- Basic course performance
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_courses_overview AS
SELECT
  c.id_course,
  c.name_course,

  -- Lead metrics
  COUNT(DISTINCT fl.client_id) as total_leads,
  MIN(fl.lead_day) as first_lead_date,
  MAX(fl.lead_day) as last_lead_date,

  -- Contract metrics
  COUNT(DISTINCT fc.client_id) as total_contracts,
  SUM(fc.contract_amount) as total_revenue,
  ROUND(AVG(fc.contract_amount), 0) as avg_contract_value,

  -- Performance
  ROUND(100.0 * COUNT(DISTINCT fc.client_id) / NULLIF(COUNT(DISTINCT fl.client_id), 0), 2) as conversion_rate,
  ROUND(AVG(fc.days_to_contract), 1) as avg_days_to_close

FROM raw.itcrm_courses c
INNER JOIN raw.itcrm_course_relations cr ON c.id_course = cr.id_course
INNER JOIN stg.fact_leads fl ON cr.id_source = fl.lead_source_id
LEFT JOIN stg.fact_contracts fc ON fl.client_id = fc.client_id

WHERE c.id_course IS NOT NULL
GROUP BY c.id_course, c.name_course
HAVING COUNT(DISTINCT fl.client_id) > 0
ORDER BY total_leads DESC;

COMMENT ON VIEW stg.v9_courses_overview IS 'V9: Course-level performance overview';

-- ============================================================================
-- VIEW 2: v9_courses_by_platform
-- Course performance by marketing platform
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_courses_by_platform AS
SELECT
  c.id_course,
  c.name_course,
  fl.dominant_platform,
  fl.source_type,

  -- Lead & contract metrics
  COUNT(DISTINCT fl.client_id) as leads,
  COUNT(DISTINCT fc.client_id) as contracts,
  SUM(fc.contract_amount) as revenue,

  -- Performance
  ROUND(100.0 * COUNT(DISTINCT fc.client_id) / NULLIF(COUNT(DISTINCT fl.client_id), 0), 2) as cvr

FROM raw.itcrm_courses c
INNER JOIN raw.itcrm_course_relations cr ON c.id_course = cr.id_course
INNER JOIN stg.fact_leads fl ON cr.id_source = fl.lead_source_id
LEFT JOIN stg.fact_contracts fc ON fl.client_id = fc.client_id

WHERE c.id_course IS NOT NULL
GROUP BY c.id_course, c.name_course, fl.dominant_platform, fl.source_type
HAVING COUNT(DISTINCT fl.client_id) > 0
ORDER BY c.name_course, leads DESC;

COMMENT ON VIEW stg.v9_courses_by_platform IS 'V9: Course performance by marketing platform';

-- ============================================================================
-- VIEW 3: v9_courses_by_campaign
-- Course performance by specific campaigns (Facebook, Google)
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_courses_by_campaign AS
SELECT
  c.id_course,
  c.name_course,

  -- Campaign details
  fl.matched_platform,
  fl.campaign_id,
  fl.campaign_name,
  fl.ad_name,

  -- Facebook-specific
  fl.fb_adset_id,
  fl.fb_adset_name,

  -- Metrics
  COUNT(DISTINCT fl.client_id) as leads,
  COUNT(DISTINCT fc.client_id) as contracts,
  SUM(fc.contract_amount) as revenue,

  -- Dates
  MIN(fl.lead_day) as first_lead,
  MAX(fl.lead_day) as last_lead,

  -- Performance
  ROUND(100.0 * COUNT(DISTINCT fc.client_id) / NULLIF(COUNT(DISTINCT fl.client_id), 0), 2) as cvr

FROM raw.itcrm_courses c
INNER JOIN raw.itcrm_course_relations cr ON c.id_course = cr.id_course
INNER JOIN stg.fact_leads fl ON cr.id_source = fl.lead_source_id
LEFT JOIN stg.fact_contracts fc ON fl.client_id = fc.client_id

WHERE c.id_course IS NOT NULL
  AND fl.matched_platform IS NOT NULL
  AND fl.campaign_name IS NOT NULL

GROUP BY
  c.id_course, c.name_course,
  fl.matched_platform, fl.campaign_id, fl.campaign_name, fl.ad_name,
  fl.fb_adset_id, fl.fb_adset_name

HAVING COUNT(DISTINCT fl.client_id) > 0
ORDER BY leads DESC;

COMMENT ON VIEW stg.v9_courses_by_campaign IS 'V9: Course attribution to specific campaigns';

-- ============================================================================
-- VIEW 4: v9_campaign_to_course_effectiveness
-- Which campaigns drive which courses (reverse view)
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_campaign_to_course_effectiveness AS
SELECT
  fl.matched_platform as platform,
  fl.campaign_id,
  fl.campaign_name,
  fl.ad_name,

  -- Course breakdown
  c.id_course,
  c.name_course,

  -- Metrics
  COUNT(DISTINCT fl.client_id) as leads,
  COUNT(DISTINCT fc.client_id) as contracts,
  SUM(fc.contract_amount) as revenue,

  -- Performance
  ROUND(AVG(fc.days_to_contract), 1) as avg_days_to_close,
  ROUND(100.0 * COUNT(DISTINCT fc.client_id) / NULLIF(COUNT(DISTINCT fl.client_id), 0), 2) as cvr,

  -- Share of campaign
  ROUND(100.0 * COUNT(DISTINCT fl.client_id) / SUM(COUNT(DISTINCT fl.client_id)) OVER (PARTITION BY fl.campaign_id), 2) as course_share_of_campaign

FROM stg.fact_leads fl
INNER JOIN raw.itcrm_course_relations cr ON fl.lead_source_id = cr.id_source
INNER JOIN raw.itcrm_courses c ON cr.id_course = c.id_course
LEFT JOIN stg.fact_contracts fc ON fl.client_id = fc.client_id

WHERE fl.matched_platform IS NOT NULL
  AND fl.campaign_name IS NOT NULL

GROUP BY
  fl.matched_platform, fl.campaign_id, fl.campaign_name, fl.ad_name,
  c.id_course, c.name_course

HAVING COUNT(DISTINCT fl.client_id) > 0
ORDER BY fl.campaign_name, leads DESC;

COMMENT ON VIEW stg.v9_campaign_to_course_effectiveness IS 'V9: Campaign effectiveness by course delivery';

-- ============================================================================
-- VIEW 5: v9_performance_max_courses
-- Performance Max campaign course breakdown
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_performance_max_courses AS
SELECT
  fl.campaign_name,
  c.id_course,
  c.name_course,

  COUNT(DISTINCT fl.client_id) as leads,
  COUNT(DISTINCT fc.client_id) as contracts,
  SUM(fc.contract_amount) as revenue,

  MIN(fl.lead_day) as first_lead,
  MAX(fl.lead_day) as last_lead,

  ROUND(100.0 * COUNT(DISTINCT fc.client_id) / NULLIF(COUNT(DISTINCT fl.client_id), 0), 2) as cvr,
  ROUND(AVG(fc.contract_amount), 0) as avg_contract_value

FROM stg.fact_leads fl
INNER JOIN raw.itcrm_course_relations cr ON fl.lead_source_id = cr.id_source
INNER JOIN raw.itcrm_courses c ON cr.id_course = c.id_course
LEFT JOIN stg.fact_contracts fc ON fl.client_id = fc.client_id

WHERE fl.campaign_name LIKE '%Performance%Max%'
  OR fl.campaign_name LIKE '%pmax%'

GROUP BY fl.campaign_name, c.id_course, c.name_course
HAVING COUNT(DISTINCT fl.client_id) > 0
ORDER BY leads DESC;

COMMENT ON VIEW stg.v9_performance_max_courses IS 'V9: Performance Max campaigns - course delivery breakdown';

-- ============================================================================
-- VIEW 6: v9_ad_creative_to_course
-- Ad creative effectiveness by course delivery
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_ad_creative_to_course AS
SELECT
  fl.matched_platform,
  fl.campaign_name,
  fl.ad_name,
  fl.fb_adset_name,

  -- Course delivery
  c.name_course,

  -- Metrics
  COUNT(DISTINCT fl.client_id) as leads,
  COUNT(DISTINCT fc.client_id) as contracts,
  SUM(fc.contract_amount) as revenue,

  -- Performance
  ROUND(100.0 * COUNT(DISTINCT fc.client_id) / NULLIF(COUNT(DISTINCT fl.client_id), 0), 2) as cvr,

  -- Time range
  MIN(fl.lead_day) as first_lead,
  MAX(fl.lead_day) as last_lead

FROM stg.fact_leads fl
INNER JOIN raw.itcrm_course_relations cr ON fl.lead_source_id = cr.id_source
INNER JOIN raw.itcrm_courses c ON cr.id_course = c.id_course
LEFT JOIN stg.fact_contracts fc ON fl.client_id = fc.client_id

WHERE fl.matched_platform IS NOT NULL
  AND fl.ad_name IS NOT NULL

GROUP BY
  fl.matched_platform, fl.campaign_name, fl.ad_name, fl.fb_adset_name,
  c.name_course

HAVING COUNT(DISTINCT fl.client_id) > 0
ORDER BY leads DESC;

COMMENT ON VIEW stg.v9_ad_creative_to_course IS 'V9: Ad creative effectiveness by course';

-- ============================================================================
-- VIEW 7: v9_course_daily_funnel
-- Daily course funnel metrics
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_course_daily_funnel AS
SELECT
  fl.lead_day as dt,
  c.id_course,
  c.name_course,
  fl.dominant_platform,

  COUNT(DISTINCT fl.client_id) as leads,
  COUNT(DISTINCT fc.client_id) as contracts,
  SUM(fc.contract_amount) as revenue,

  ROUND(100.0 * COUNT(DISTINCT fc.client_id) / NULLIF(COUNT(DISTINCT fl.client_id), 0), 2) as cvr

FROM stg.fact_leads fl
INNER JOIN raw.itcrm_course_relations cr ON fl.lead_source_id = cr.id_source
INNER JOIN raw.itcrm_courses c ON cr.id_course = c.id_course
LEFT JOIN stg.fact_contracts fc ON fl.client_id = fc.client_id

WHERE fl.lead_day >= '2025-01-01'

GROUP BY fl.lead_day, c.id_course, c.name_course, fl.dominant_platform
HAVING COUNT(DISTINCT fl.client_id) > 0
ORDER BY fl.lead_day DESC, leads DESC;

COMMENT ON VIEW stg.v9_course_daily_funnel IS 'V9: Daily course funnel metrics';

-- ============================================================================
-- SUCCESS CHECK
-- ============================================================================
SELECT
  'COURSE VIEWS CREATED' as status,
  COUNT(*) FILTER (WHERE table_name LIKE '%course%') as course_views
FROM information_schema.views
WHERE table_schema = 'stg' AND table_name LIKE 'v9_%';
