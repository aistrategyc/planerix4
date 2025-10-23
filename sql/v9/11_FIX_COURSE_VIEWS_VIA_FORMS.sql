-- ============================================================================
-- V9 COURSE VIEWS - FIXED VIA FORMS LINKAGE
-- ============================================================================
-- Purpose: Fix course attribution by linking through forms
-- Date: 22 октября 2025
-- Linkage: leads → forms → product_form_relations → courses
-- ============================================================================

-- Drop old views
DROP VIEW IF EXISTS stg.v9_courses_overview CASCADE;
DROP VIEW IF EXISTS stg.v9_courses_by_platform CASCADE;
DROP VIEW IF EXISTS stg.v9_courses_by_campaign CASCADE;
DROP VIEW IF EXISTS stg.v9_campaign_to_course_effectiveness CASCADE;
DROP VIEW IF EXISTS stg.v9_performance_max_courses CASCADE;
DROP VIEW IF EXISTS stg.v9_ad_creative_to_course CASCADE;
DROP VIEW IF EXISTS stg.v9_course_daily_funnel CASCADE;

-- ============================================================================
-- VIEW 1: v9_courses_overview (FIXED)
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
INNER JOIN raw.itcrm_product_form_relations pfr ON c.id_course = pfr.id_product
INNER JOIN raw.itcrm_new_form nf ON pfr.id_form = nf.id_form
INNER JOIN stg.fact_leads fl ON nf.id_source = fl.lead_source_id
LEFT JOIN stg.fact_contracts fc ON fl.client_id = fc.client_id

WHERE c.id_course IS NOT NULL
GROUP BY c.id_course, c.name_course
HAVING COUNT(DISTINCT fl.client_id) > 0
ORDER BY total_leads DESC;

COMMENT ON VIEW stg.v9_courses_overview IS 'V9: Course performance via form linkage';

-- ============================================================================
-- VIEW 2: v9_courses_by_platform (FIXED)
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_courses_by_platform AS
SELECT
  c.id_course,
  c.name_course,
  fl.dominant_platform,
  fl.source_type,

  -- Metrics
  COUNT(DISTINCT fl.client_id) as leads,
  COUNT(DISTINCT fc.client_id) as contracts,
  SUM(fc.contract_amount) as revenue,
  ROUND(100.0 * COUNT(DISTINCT fc.client_id) / NULLIF(COUNT(DISTINCT fl.client_id), 0), 2) as cvr

FROM raw.itcrm_courses c
INNER JOIN raw.itcrm_product_form_relations pfr ON c.id_course = pfr.id_product
INNER JOIN raw.itcrm_new_form nf ON pfr.id_form = nf.id_form
INNER JOIN stg.fact_leads fl ON nf.id_source = fl.lead_source_id
LEFT JOIN stg.fact_contracts fc ON fl.client_id = fc.client_id

WHERE c.id_course IS NOT NULL
GROUP BY c.id_course, c.name_course, fl.dominant_platform, fl.source_type
HAVING COUNT(DISTINCT fl.client_id) > 0
ORDER BY c.name_course, leads DESC;

COMMENT ON VIEW stg.v9_courses_by_platform IS 'V9: Course performance by platform (via forms)';

-- ============================================================================
-- VIEW 3: v9_courses_by_campaign (FIXED)
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
  fl.fb_adset_id,
  fl.fb_adset_name,

  -- Metrics
  COUNT(DISTINCT fl.client_id) as leads,
  COUNT(DISTINCT fc.client_id) as contracts,
  SUM(fc.contract_amount) as revenue,

  MIN(fl.lead_day) as first_lead,
  MAX(fl.lead_day) as last_lead,

  ROUND(100.0 * COUNT(DISTINCT fc.client_id) / NULLIF(COUNT(DISTINCT fl.client_id), 0), 2) as cvr

FROM raw.itcrm_courses c
INNER JOIN raw.itcrm_product_form_relations pfr ON c.id_course = pfr.id_product
INNER JOIN raw.itcrm_new_form nf ON pfr.id_form = nf.id_form
INNER JOIN stg.fact_leads fl ON nf.id_source = fl.lead_source_id
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

COMMENT ON VIEW stg.v9_courses_by_campaign IS 'V9: Course attribution to campaigns (via forms)';

-- ============================================================================
-- VIEW 4: v9_campaign_to_course_effectiveness (FIXED)
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_campaign_to_course_effectiveness AS
SELECT
  fl.matched_platform as platform,
  fl.campaign_id,
  fl.campaign_name,
  fl.ad_name,

  c.id_course,
  c.name_course,

  COUNT(DISTINCT fl.client_id) as leads,
  COUNT(DISTINCT fc.client_id) as contracts,
  SUM(fc.contract_amount) as revenue,

  ROUND(AVG(fc.days_to_contract), 1) as avg_days_to_close,
  ROUND(100.0 * COUNT(DISTINCT fc.client_id) / NULLIF(COUNT(DISTINCT fl.client_id), 0), 2) as cvr,

  ROUND(100.0 * COUNT(DISTINCT fl.client_id) / SUM(COUNT(DISTINCT fl.client_id)) OVER (PARTITION BY fl.campaign_id), 2) as course_share_of_campaign

FROM stg.fact_leads fl
INNER JOIN raw.itcrm_new_form nf ON fl.lead_source_id = nf.id_source
INNER JOIN raw.itcrm_product_form_relations pfr ON nf.id_form = pfr.id_form
INNER JOIN raw.itcrm_courses c ON pfr.id_product = c.id_course
LEFT JOIN stg.fact_contracts fc ON fl.client_id = fc.client_id

WHERE fl.matched_platform IS NOT NULL
  AND fl.campaign_name IS NOT NULL

GROUP BY
  fl.matched_platform, fl.campaign_id, fl.campaign_name, fl.ad_name,
  c.id_course, c.name_course

HAVING COUNT(DISTINCT fl.client_id) > 0
ORDER BY fl.campaign_name, leads DESC;

COMMENT ON VIEW stg.v9_campaign_to_course_effectiveness IS 'V9: Campaign → Course effectiveness (via forms)';

-- ============================================================================
-- VIEW 5: v9_performance_max_courses (FIXED)
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
INNER JOIN raw.itcrm_new_form nf ON fl.lead_source_id = nf.id_source
INNER JOIN raw.itcrm_product_form_relations pfr ON nf.id_form = pfr.id_form
INNER JOIN raw.itcrm_courses c ON pfr.id_product = c.id_course
LEFT JOIN stg.fact_contracts fc ON fl.client_id = fc.client_id

WHERE (fl.campaign_name LIKE '%Performance%Max%' OR fl.campaign_name LIKE '%pmax%')

GROUP BY fl.campaign_name, c.id_course, c.name_course
HAVING COUNT(DISTINCT fl.client_id) > 0
ORDER BY leads DESC;

COMMENT ON VIEW stg.v9_performance_max_courses IS 'V9: Performance Max → Course delivery (via forms)';

-- ============================================================================
-- VIEW 6: v9_ad_creative_to_course (FIXED)
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_ad_creative_to_course AS
SELECT
  fl.matched_platform,
  fl.campaign_name,
  fl.ad_name,
  fl.fb_adset_name,
  c.name_course,

  COUNT(DISTINCT fl.client_id) as leads,
  COUNT(DISTINCT fc.client_id) as contracts,
  SUM(fc.contract_amount) as revenue,

  ROUND(100.0 * COUNT(DISTINCT fc.client_id) / NULLIF(COUNT(DISTINCT fl.client_id), 0), 2) as cvr,

  MIN(fl.lead_day) as first_lead,
  MAX(fl.lead_day) as last_lead

FROM stg.fact_leads fl
INNER JOIN raw.itcrm_new_form nf ON fl.lead_source_id = nf.id_source
INNER JOIN raw.itcrm_product_form_relations pfr ON nf.id_form = pfr.id_form
INNER JOIN raw.itcrm_courses c ON pfr.id_product = c.id_course
LEFT JOIN stg.fact_contracts fc ON fl.client_id = fc.client_id

WHERE fl.matched_platform IS NOT NULL
  AND fl.ad_name IS NOT NULL

GROUP BY fl.matched_platform, fl.campaign_name, fl.ad_name, fl.fb_adset_name, c.name_course
HAVING COUNT(DISTINCT fl.client_id) > 0
ORDER BY leads DESC;

COMMENT ON VIEW stg.v9_ad_creative_to_course IS 'V9: Ad creative → Course delivery (via forms)';

-- ============================================================================
-- VIEW 7: v9_course_daily_funnel (FIXED)
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
INNER JOIN raw.itcrm_new_form nf ON fl.lead_source_id = nf.id_source
INNER JOIN raw.itcrm_product_form_relations pfr ON nf.id_form = pfr.id_form
INNER JOIN raw.itcrm_courses c ON pfr.id_product = c.id_course
LEFT JOIN stg.fact_contracts fc ON fl.client_id = fc.client_id

WHERE fl.lead_day >= '2025-01-01'

GROUP BY fl.lead_day, c.id_course, c.name_course, fl.dominant_platform
HAVING COUNT(DISTINCT fl.client_id) > 0
ORDER BY fl.lead_day DESC, leads DESC;

COMMENT ON VIEW stg.v9_course_daily_funnel IS 'V9: Daily course funnel (via forms)';

-- ============================================================================
-- SUCCESS CHECK
-- ============================================================================
SELECT
  'COURSE VIEWS FIXED VIA FORMS' as status,
  COUNT(*) FILTER (WHERE table_name LIKE '%course%') as course_views_count
FROM information_schema.views
WHERE table_schema = 'stg' AND table_name LIKE 'v9_%';
