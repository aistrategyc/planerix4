-- ============================================================================
-- V10: ETL from STG to PROD - Clean Data Pipeline
-- ============================================================================
-- Date: October 23, 2025
--
-- FLOW:
--   raw → stg (parsing, normalization, matching) → prod (clean, ready)
-- ============================================================================

-- ============================================================================
-- ETL 1: Populate prod.leads from stg
-- ============================================================================

CREATE OR REPLACE FUNCTION prod.refresh_prod_leads()
RETURNS TABLE(
  rows_inserted BIGINT,
  execution_time_ms INTEGER
) AS $$
DECLARE
  v_start_time TIMESTAMP;
  v_inserted BIGINT := 0;
BEGIN
  v_start_time := clock_timestamp();

  -- Clear table
  TRUNCATE TABLE prod.leads CASCADE;

  -- Insert clean leads
  INSERT INTO prod.leads (
    lead_id,
    client_id,
    lead_date,
    lead_timestamp,
    platform,
    channel,
    campaign_id,
    campaign_name,
    adset_id,
    adset_name,
    ad_id,
    ad_name,
    creative_id,
    creative_title,
    creative_body,
    creative_image_url,
    cta_type,
    utm_source,
    utm_campaign,
    utm_medium,
    utm_content,
    utm_term,
    fbclid,
    gclid,
    fb_lead_id,
    phone,
    email,
    attribution_method,
    attribution_quality_score,
    updated_at
  )
  SELECT
    fl.lead_source_id as lead_id,
    fl.client_id,
    fl.lead_day as lead_date,
    fl.lead_date as lead_timestamp,

    -- Platform (clean, standardized)
    CASE
        WHEN fl.matched_platform IN ('facebook', 'instagram') THEN fl.matched_platform
        WHEN fl.matched_platform = 'meta' THEN 'facebook'
        WHEN fl.matched_platform IN ('google', 'google_ads') THEN 'google'
        ELSE COALESCE(fl.matched_platform, 'direct')
    END as platform,

    -- Channel
    CASE
        WHEN fl.matched_platform IN ('facebook', 'instagram', 'google', 'paid_other', 'tiktok', 'linkedin') THEN 'paid'
        WHEN fl.matched_platform = 'organic' THEN 'organic'
        WHEN fl.matched_platform = 'email' THEN 'email'
        WHEN fl.matched_platform = 'event' THEN 'event'
        ELSE 'direct'
    END as channel,

    fl.campaign_id,
    fl.campaign_name,
    fl.fb_adset_id as adset_id,
    fl.fb_adset_name as adset_name,
    fl.ad_id,
    fl.ad_name,

    -- Creative details (from v9_facebook_ad_creatives_full)
    cr.ad_creative_id as creative_id,
    cr.title as creative_title,
    cr.body as creative_body,
    cr.media_image_src as creative_image_url,
    cr.cta_type,

    -- UTM
    fl.utm_source,
    fl.utm_campaign,
    fl.utm_medium,
    attr.utm_content,
    fl.utm_term,

    -- Tracking IDs
    attr.fbclid,
    attr.gclid,
    fbl.fb_lead_id,

    -- Contact
    attr.phone,
    attr.email,

    -- Attribution quality
    CASE
        WHEN fl.campaign_id IS NOT NULL AND fl.ad_id IS NOT NULL THEN 'exact_match'
        WHEN fl.campaign_id IS NOT NULL THEN 'campaign_match'
        WHEN fl.utm_campaign IS NOT NULL THEN 'utm_attribution'
        WHEN fbl.fb_lead_id IS NOT NULL THEN 'fb_leads_match'
        ELSE 'heuristic'
    END as attribution_method,

    CASE
        WHEN fl.campaign_id IS NOT NULL AND fl.ad_id IS NOT NULL THEN 100
        WHEN fl.campaign_id IS NOT NULL THEN 80
        WHEN fl.utm_campaign IS NOT NULL THEN 60
        WHEN fbl.fb_lead_id IS NOT NULL THEN 90
        ELSE 30
    END as attribution_quality_score,

    CURRENT_TIMESTAMP as updated_at

  FROM stg.fact_leads fl
  LEFT JOIN stg.source_attribution attr ON fl.lead_source_id = attr.id_source
  LEFT JOIN raw.fb_leads fbl ON (
      fbl.phone = REGEXP_REPLACE(attr.phone, '[^0-9]', '', 'g')
      OR fbl.email = attr.email
  )
  LEFT JOIN stg.v9_facebook_ad_creatives_full cr ON fl.ad_id = cr.ad_id;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RETURN QUERY SELECT
    v_inserted,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prod.refresh_prod_leads() IS
'V10: ETL stg → prod for leads (clean, enriched, ready for BI)';

-- ============================================================================
-- ETL 2: Populate prod.contracts from stg
-- ============================================================================

CREATE OR REPLACE FUNCTION prod.refresh_prod_contracts()
RETURNS TABLE(
  rows_inserted BIGINT,
  execution_time_ms INTEGER
) AS $$
DECLARE
  v_start_time TIMESTAMP;
  v_inserted BIGINT := 0;
BEGIN
  v_start_time := clock_timestamp();

  TRUNCATE TABLE prod.contracts CASCADE;

  INSERT INTO prod.contracts (
    contract_id,
    client_id,
    contract_date,
    contract_timestamp,
    contract_amount,
    currency,
    product_name,
    product_category,
    course_name,
    platform,
    channel,
    campaign_id,
    campaign_name,
    adset_id,
    adset_name,
    ad_id,
    ad_name,
    creative_id,
    creative_image_url,
    lead_id,
    lead_date,
    days_to_convert,
    attribution_method,
    attribution_quality_score,
    updated_at
  )
  SELECT
    fc.contract_source_id as contract_id,
    fc.client_id,
    fc.contract_day as contract_date,
    fc.contract_date as contract_timestamp,
    fc.contract_amount,
    'UAH' as currency,

    -- Product details (from form_name or course mapping)
    COALESCE(req.form_name, 'Unknown Product') as product_name,
    CASE
        WHEN req.form_name ILIKE '%МКА%' OR req.form_name ILIKE '%Мала Комп%' THEN 'Мала Комп''ютерна Академія'
        WHEN req.form_name ILIKE '%табір%' OR req.form_name ILIKE '%табор%' THEN 'Табори'
        WHEN req.form_name ILIKE '%Step2talk%' THEN 'Step2talk'
        WHEN req.form_name ILIKE '%розробка%' THEN 'Професійні курси'
        WHEN req.form_name ILIKE '%тестування%' THEN 'Тестування ПЗ'
        ELSE 'Інші курси'
    END as product_category,
    req.form_name as course_name,

    -- Attribution (from first paid touch)
    CASE
        WHEN fc.matched_platform IN ('facebook', 'instagram') THEN fc.matched_platform
        WHEN fc.matched_platform = 'meta' THEN 'facebook'
        WHEN fc.matched_platform IN ('google', 'google_ads') THEN 'google'
        ELSE COALESCE(fc.matched_platform, 'direct')
    END as platform,

    CASE
        WHEN fc.matched_platform IN ('facebook', 'instagram', 'google', 'paid_other') THEN 'paid'
        WHEN fc.matched_platform = 'organic' THEN 'organic'
        WHEN fc.matched_platform = 'email' THEN 'email'
        WHEN fc.matched_platform = 'event' THEN 'event'
        ELSE 'direct'
    END as channel,

    fc.campaign_id,
    fc.campaign_name,
    fc.fb_adset_id as adset_id,
    fc.fb_adset_name as adset_name,
    fc.ad_id,
    fc.ad_name,

    -- Creative
    cr.ad_creative_id as creative_id,
    cr.media_image_src as creative_image_url,

    -- Journey
    pl.lead_id,
    fc.lead_day as lead_date,
    fc.days_to_contract,

    -- Attribution quality
    CASE
        WHEN fc.campaign_id IS NOT NULL AND fc.ad_id IS NOT NULL THEN 'exact_match'
        WHEN fc.campaign_id IS NOT NULL THEN 'campaign_match'
        WHEN fc.utm_campaign IS NOT NULL THEN 'utm_attribution'
        ELSE 'heuristic'
    END as attribution_method,

    CASE
        WHEN fc.campaign_id IS NOT NULL AND fc.ad_id IS NOT NULL THEN 100
        WHEN fc.campaign_id IS NOT NULL THEN 80
        WHEN fc.utm_campaign IS NOT NULL THEN 60
        ELSE 30
    END as attribution_quality_score,

    CURRENT_TIMESTAMP as updated_at

  FROM stg.fact_contracts fc
  LEFT JOIN prod.leads pl ON fc.lead_source_id = pl.lead_id
  LEFT JOIN raw.itcrm_internet_request req ON fc.lead_source_id::text = req.request_id::text
  LEFT JOIN stg.v9_facebook_ad_creatives_full cr ON fc.ad_id = cr.ad_id;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RETURN QUERY SELECT
    v_inserted,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prod.refresh_prod_contracts() IS
'V10: ETL stg → prod for contracts (clean, enriched with product details)';

-- ============================================================================
-- ETL 3: Populate prod.campaign_performance
-- ============================================================================

CREATE OR REPLACE FUNCTION prod.refresh_prod_campaign_performance()
RETURNS TABLE(
  rows_inserted BIGINT,
  execution_time_ms INTEGER
) AS $$
DECLARE
  v_start_time TIMESTAMP;
  v_inserted BIGINT := 0;
BEGIN
  v_start_time := clock_timestamp();

  TRUNCATE TABLE prod.campaign_performance CASCADE;

  -- Facebook/Instagram campaigns
  INSERT INTO prod.campaign_performance (
    performance_date,
    platform,
    campaign_id,
    campaign_name,
    impressions,
    clicks,
    spend,
    ctr,
    cpc,
    cpm,
    leads,
    contracts,
    revenue,
    cpl,
    cpa,
    roas,
    conversion_rate
  )
  SELECT
    ads.date_start as performance_date,
    'facebook' as platform,
    ads.campaign_id,
    camp.campaign_name,
    SUM(ads.impressions) as impressions,
    SUM(ads.clicks) as clicks,
    SUM(ads.spend) as spend,
    CASE WHEN SUM(ads.impressions) > 0 THEN SUM(ads.clicks)::numeric / SUM(ads.impressions) * 100 ELSE 0 END as ctr,
    CASE WHEN SUM(ads.clicks) > 0 THEN SUM(ads.spend) / SUM(ads.clicks) ELSE 0 END as cpc,
    CASE WHEN SUM(ads.impressions) > 0 THEN SUM(ads.spend) / SUM(ads.impressions) * 1000 ELSE 0 END as cpm,
    COUNT(DISTINCT pl.lead_id) as leads,
    COUNT(DISTINCT pc.contract_id) as contracts,
    COALESCE(SUM(pc.contract_amount), 0) as revenue,
    CASE WHEN COUNT(DISTINCT pl.lead_id) > 0 THEN SUM(ads.spend) / COUNT(DISTINCT pl.lead_id) ELSE 0 END as cpl,
    CASE WHEN COUNT(DISTINCT pc.contract_id) > 0 THEN SUM(ads.spend) / COUNT(DISTINCT pc.contract_id) ELSE 0 END as cpa,
    CASE WHEN SUM(ads.spend) > 0 THEN COALESCE(SUM(pc.contract_amount), 0) / SUM(ads.spend) ELSE 0 END as roas,
    CASE WHEN COUNT(DISTINCT pl.lead_id) > 0 THEN COUNT(DISTINCT pc.contract_id)::numeric / COUNT(DISTINCT pl.lead_id) * 100 ELSE 0 END as conversion_rate
  FROM raw.fb_ad_insights ads
  LEFT JOIN raw.fb_campaigns camp ON ads.campaign_id = camp.campaign_id
  LEFT JOIN prod.leads pl ON ads.campaign_id = pl.campaign_id AND ads.date_start = pl.lead_date
  LEFT JOIN prod.contracts pc ON ads.campaign_id = pc.campaign_id AND ads.date_start = pc.contract_date
  WHERE ads.date_start >= '2025-01-01'
  GROUP BY ads.date_start, ads.campaign_id, camp.campaign_name;

  -- Google campaigns
  INSERT INTO prod.campaign_performance (
    performance_date,
    platform,
    campaign_id,
    campaign_name,
    impressions,
    clicks,
    spend,
    ctr,
    cpc,
    leads,
    contracts,
    revenue,
    cpl,
    cpa,
    roas,
    conversion_rate
  )
  SELECT
    ads.date as performance_date,
    'google' as platform,
    ads.campaign_id,
    camp.campaign_name,
    SUM(ads.impressions) as impressions,
    SUM(ads.clicks) as clicks,
    SUM(ads.cost_micros::numeric / 1000000) as spend,
    CASE WHEN SUM(ads.impressions) > 0 THEN SUM(ads.clicks)::numeric / SUM(ads.impressions) * 100 ELSE 0 END as ctr,
    CASE WHEN SUM(ads.clicks) > 0 THEN SUM(ads.cost_micros::numeric / 1000000) / SUM(ads.clicks) ELSE 0 END as cpc,
    COUNT(DISTINCT pl.lead_id) as leads,
    COUNT(DISTINCT pc.contract_id) as contracts,
    COALESCE(SUM(pc.contract_amount), 0) as revenue,
    CASE WHEN COUNT(DISTINCT pl.lead_id) > 0 THEN SUM(ads.cost_micros::numeric / 1000000) / COUNT(DISTINCT pl.lead_id) ELSE 0 END as cpl,
    CASE WHEN COUNT(DISTINCT pc.contract_id) > 0 THEN SUM(ads.cost_micros::numeric / 1000000) / COUNT(DISTINCT pc.contract_id) ELSE 0 END as cpa,
    CASE WHEN SUM(ads.cost_micros::numeric / 1000000) > 0 THEN COALESCE(SUM(pc.contract_amount), 0) / SUM(ads.cost_micros::numeric / 1000000) ELSE 0 END as roas,
    CASE WHEN COUNT(DISTINCT pl.lead_id) > 0 THEN COUNT(DISTINCT pc.contract_id)::numeric / COUNT(DISTINCT pl.lead_id) * 100 ELSE 0 END as conversion_rate
  FROM raw.google_ads_campaign_daily ads
  LEFT JOIN raw.google_ads_names camp ON ads.campaign_id = camp.campaign_id AND camp.resource_type = 'campaign'
  LEFT JOIN prod.leads pl ON ads.campaign_id = pl.campaign_id AND ads.date = pl.lead_date
  LEFT JOIN prod.contracts pc ON ads.campaign_id = pc.campaign_id AND ads.date = pc.contract_date
  WHERE ads.date >= '2025-01-01'
  GROUP BY ads.date, ads.campaign_id, camp.campaign_name;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RETURN QUERY SELECT
    v_inserted,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prod.refresh_prod_campaign_performance() IS
'V10: Aggregate campaign performance (ad spend + conversions + revenue)';

-- ============================================================================
-- ETL 4: Populate prod.ad_creatives
-- ============================================================================

CREATE OR REPLACE FUNCTION prod.refresh_prod_ad_creatives()
RETURNS TABLE(
  rows_inserted BIGINT,
  execution_time_ms INTEGER
) AS $$
DECLARE
  v_start_time TIMESTAMP;
  v_inserted BIGINT := 0;
BEGIN
  v_start_time := clock_timestamp();

  TRUNCATE TABLE prod.ad_creatives CASCADE;

  INSERT INTO prod.ad_creatives (
    creative_id,
    platform,
    creative_name,
    title,
    body,
    cta_type,
    image_url,
    thumbnail_url,
    link_url,
    campaign_id,
    campaign_name,
    adset_id,
    ad_id,
    total_impressions,
    total_clicks,
    total_leads,
    total_contracts,
    total_revenue,
    first_seen,
    last_seen
  )
  SELECT
    cr.ad_creative_id as creative_id,
    'facebook' as platform,
    cr.creative_name,
    cr.title,
    cr.body,
    cr.cta_type,
    cr.media_image_src as image_url,
    cr.thumbnail_url,
    cr.link_url,
    cr.campaign_id,
    cr.campaign_name,
    cr.adset_id,
    cr.ad_id,
    COALESCE(SUM(ads.impressions), 0) as total_impressions,
    COALESCE(SUM(ads.clicks), 0) as total_clicks,
    COUNT(DISTINCT pl.lead_id) as total_leads,
    COUNT(DISTINCT pc.contract_id) as total_contracts,
    COALESCE(SUM(pc.contract_amount), 0) as total_revenue,
    MIN(ads.date_start) as first_seen,
    MAX(ads.date_start) as last_seen
  FROM stg.v9_facebook_ad_creatives_full cr
  LEFT JOIN raw.fb_ad_insights ads ON cr.ad_id = ads.ad_id
  LEFT JOIN prod.leads pl ON cr.ad_id = pl.ad_id
  LEFT JOIN prod.contracts pc ON cr.ad_id = pc.ad_id
  WHERE cr.ad_creative_id IS NOT NULL
  GROUP BY cr.ad_creative_id, cr.creative_name, cr.title, cr.body, cr.cta_type,
           cr.media_image_src, cr.thumbnail_url, cr.link_url,
           cr.campaign_id, cr.campaign_name, cr.adset_id, cr.ad_id;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RETURN QUERY SELECT
    v_inserted,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prod.refresh_prod_ad_creatives() IS
'V10: Build creative library with performance summary';

-- ============================================================================
-- Master Refresh Function
-- ============================================================================

CREATE OR REPLACE FUNCTION prod.refresh_all_prod_tables()
RETURNS TABLE(
  table_name TEXT,
  rows_inserted BIGINT,
  execution_time_ms INTEGER
) AS $$
BEGIN
  RAISE NOTICE 'Refreshing all prod tables...';

  -- 1. Leads
  RETURN QUERY
  SELECT 'prod.leads'::TEXT, * FROM prod.refresh_prod_leads();

  -- 2. Contracts
  RETURN QUERY
  SELECT 'prod.contracts'::TEXT, * FROM prod.refresh_prod_contracts();

  -- 3. Campaign Performance
  RETURN QUERY
  SELECT 'prod.campaign_performance'::TEXT, * FROM prod.refresh_prod_campaign_performance();

  -- 4. Ad Creatives
  RETURN QUERY
  SELECT 'prod.ad_creatives'::TEXT, * FROM prod.refresh_prod_ad_creatives();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prod.refresh_all_prod_tables() IS
'V10: Master refresh for ALL prod tables (leads, contracts, performance, creatives)';

-- ============================================================================
-- Execute Initial Load
-- ============================================================================

SELECT * FROM prod.refresh_all_prod_tables();

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ V10 PROD TABLES POPULATED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'ETL Flow: raw → stg → prod';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables populated:';
  RAISE NOTICE '  1. prod.leads';
  RAISE NOTICE '  2. prod.contracts';
  RAISE NOTICE '  3. prod.campaign_performance';
  RAISE NOTICE '  4. prod.ad_creatives';
  RAISE NOTICE '';
  RAISE NOTICE 'Ready for BI and API consumption!';
  RAISE NOTICE '============================================';
END $$;
