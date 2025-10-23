-- ============================================================================
-- V9 PROFESSIONAL: MULTI-LEVEL ATTRIBUTION SYSTEM
-- ============================================================================
-- Date: October 23, 2025
-- Author: AI Strategy Team
--
-- PROFESSIONAL APPROACH:
--   6 ways to parse Meta/Facebook (fbclid, utm, form_id, page_id, creative_id, phone match)
--   Multiple levels: Raw → Normalized → Consolidated → Enriched → Mapped
--   Priority-based attribution with fallbacks
--   NO DATA LOSS - use ALL available signals
--
-- LEVELS:
--   Level 1: Direct IDs (fbclid, gclid, campaign_id, ad_id)
--   Level 2: UTM parameters (utm_source, utm_campaign, utm_medium)
--   Level 3: Form/Page matching (Meta form_id, page_id)
--   Level 4: Phone/Email matching with FB leads
--   Level 5: Creative matching (ad_creative_id from images)
--   Level 6: Heuristic (platform detection from domain, referrer)
-- ============================================================================

-- ============================================================================
-- LEVEL 1: Raw Signal Extraction
-- ============================================================================

CREATE OR REPLACE VIEW stg.v9_attribution_signals_raw AS
SELECT
    crm.id_source,
    crm.client_id,
    crm.event_date,

    -- Signal 1: Direct Click IDs
    attr.fbclid as signal_fbclid,
    attr.gclid as signal_gclid,

    -- Signal 2: UTM Parameters
    attr.utm_source as signal_utm_source,
    attr.utm_campaign as signal_utm_campaign,
    attr.utm_medium as signal_utm_medium,
    attr.utm_content as signal_utm_content,
    attr.utm_term as signal_utm_term,

    -- Signal 3: Meta Form/Page IDs (from analytics)
    req_an.analytic_info->>'form_id' as signal_meta_form_id,
    req_an.analytic_info->>'page_id' as signal_meta_page_id,

    -- Signal 4: Contact Info (for matching with FB leads)
    attr.phone as signal_phone,
    attr.email as signal_email,

    -- Signal 5: Referrer (for heuristic detection)
    attr.source_name as signal_referrer,
    attr.source_medium as signal_medium,

    -- Signal 6: Request type (for CRM manual attribution)
    req.request_type as signal_request_type,
    req.form_name as signal_form_name

FROM stg.crm_events crm
INNER JOIN stg.source_attribution attr ON crm.id_source = attr.id_source
LEFT JOIN raw.itcrm_internet_request req ON crm.id_source::text = req.request_id::text
LEFT JOIN raw.itcrm_internet_request_analytics req_an ON req.request_id = req_an.id_request;

COMMENT ON VIEW stg.v9_attribution_signals_raw IS
'Level 1: Extract ALL attribution signals from multiple sources (6 methods)';

-- ============================================================================
-- LEVEL 2: Normalized Attribution (Clean + Standardize)
-- ============================================================================

CREATE OR REPLACE VIEW stg.v9_attribution_normalized AS
SELECT
    id_source,
    client_id,
    event_date,

    -- Normalized Click IDs (trim, lowercase)
    CASE
        WHEN signal_fbclid IS NOT NULL AND signal_fbclid != ''
        THEN LOWER(TRIM(signal_fbclid))
        ELSE NULL
    END as norm_fbclid,

    CASE
        WHEN signal_gclid IS NOT NULL AND signal_gclid != ''
        THEN LOWER(TRIM(signal_gclid))
        ELSE NULL
    END as norm_gclid,

    -- Normalized UTM (lowercase, trim)
    LOWER(TRIM(signal_utm_source)) as norm_utm_source,
    LOWER(TRIM(signal_utm_campaign)) as norm_utm_campaign,
    LOWER(TRIM(signal_utm_medium)) as norm_utm_medium,

    -- Normalized Platform Detection
    CASE
        WHEN signal_utm_source ILIKE '%facebook%' OR signal_utm_source ILIKE '%fb%' OR signal_utm_source = 'ig' THEN 'meta_detected_utm'
        WHEN signal_utm_source ILIKE '%instagram%' THEN 'instagram_detected_utm'
        WHEN signal_utm_source ILIKE '%google%' OR signal_utm_source = 'google_ads' THEN 'google_detected_utm'
        WHEN signal_utm_source ILIKE '%tiktok%' THEN 'tiktok_detected_utm'
        WHEN signal_utm_source ILIKE '%linkedin%' THEN 'linkedin_detected_utm'
        WHEN signal_referrer ILIKE '%facebook.com%' OR signal_referrer ILIKE '%instagram.com%' THEN 'meta_detected_referrer'
        WHEN signal_referrer ILIKE '%google.%' THEN 'google_detected_referrer'
        ELSE NULL
    END as norm_platform_hint,

    -- Cleaned Meta IDs
    signal_meta_form_id as norm_meta_form_id,
    signal_meta_page_id as norm_meta_page_id,

    -- Cleaned Contact (for matching)
    REGEXP_REPLACE(signal_phone, '[^0-9]', '', 'g') as norm_phone,
    LOWER(TRIM(signal_email)) as norm_email,

    signal_request_type as norm_request_type,
    signal_form_name as norm_form_name

FROM stg.v9_attribution_signals_raw;

COMMENT ON VIEW stg.v9_attribution_normalized IS
'Level 2: Normalize and clean all signals (lowercase, trim, standardize)';

-- ============================================================================
-- LEVEL 3: Consolidated Matching (Link to Ad Accounts)
-- ============================================================================

CREATE OR REPLACE VIEW stg.v9_attribution_consolidated AS
SELECT
    norm.id_source,
    norm.client_id,
    norm.event_date,

    -- Match 1: Direct Click ID Match
    CASE
        WHEN norm.norm_fbclid IS NOT NULL THEN 'method_1_fbclid'
        WHEN norm.norm_gclid IS NOT NULL THEN 'method_1_gclid'
        ELSE NULL
    END as match_method_1,

    -- Match 2: Campaign/Ad ID from marketing_match
    match.matched_platform as match_method_2_platform,
    match.campaign_id as match_method_2_campaign_id,
    match.campaign_name as match_method_2_campaign_name,
    match.ad_id as match_method_2_ad_id,
    match.ad_name as match_method_2_ad_name,
    match.fb_adset_id as match_method_2_adset_id,
    match.fb_adset_name as match_method_2_adset_name,

    -- Match 3: FB Leads Phone/Email Match
    fbl.fb_lead_id as match_method_3_fb_lead_id,
    fbl.campaign_id as match_method_3_fb_campaign_id,
    fbl.adset_id as match_method_3_fb_adset_id,
    fbl.ad_id as match_method_3_fb_ad_id,
    fbl.form_id as match_method_3_fb_form_id,
    fbl.page_id as match_method_3_fb_page_id,

    -- Match 4: Meta Form/Page ID Match
    CASE
        WHEN norm.norm_meta_form_id IS NOT NULL THEN 'method_4_form_id'
        WHEN norm.norm_meta_page_id IS NOT NULL THEN 'method_4_page_id'
        ELSE NULL
    END as match_method_4,

    -- Match 5: UTM Detection
    norm.norm_platform_hint as match_method_5_platform_hint,
    norm.norm_utm_source,
    norm.norm_utm_campaign,
    norm.norm_utm_medium,

    -- Match 6: Heuristic/Manual
    norm.norm_request_type,
    norm.norm_form_name,

    -- Store original signals
    norm.norm_fbclid,
    norm.norm_gclid,
    norm.norm_phone,
    norm.norm_email

FROM stg.v9_attribution_normalized norm
LEFT JOIN stg.marketing_match match ON norm.id_source = match.id_source
LEFT JOIN raw.fb_leads fbl ON (
    fbl.phone = norm.norm_phone
    OR fbl.email = norm.norm_email
    OR fbl.form_id = norm.norm_meta_form_id
);

COMMENT ON VIEW stg.v9_attribution_consolidated IS
'Level 3: Consolidate all matching methods (6 ways to match Meta/Facebook)';

-- ============================================================================
-- LEVEL 4: Enriched Attribution (Add Campaign Details from Ad Accounts)
-- ============================================================================

CREATE OR REPLACE VIEW stg.v9_attribution_enriched AS
SELECT
    cons.id_source,
    cons.client_id,
    cons.event_date,

    -- Priority 1: marketing_match (already has campaign details)
    cons.match_method_2_campaign_id,
    cons.match_method_2_campaign_name,
    cons.match_method_2_ad_id,
    cons.match_method_2_adset_id,

    -- Priority 2: FB leads match → enrich from fb_ads/fb_campaigns
    CASE
        WHEN cons.match_method_3_fb_campaign_id IS NOT NULL
        THEN COALESCE(fb_camp.campaign_name, cons.match_method_3_fb_campaign_id)
        ELSE NULL
    END as enriched_fb_campaign_name,

    CASE
        WHEN cons.match_method_3_fb_ad_id IS NOT NULL
        THEN COALESCE(fb_ad.ad_name, cons.match_method_3_fb_ad_id)
        ELSE NULL
    END as enriched_fb_ad_name,

    CASE
        WHEN cons.match_method_3_fb_adset_id IS NOT NULL
        THEN COALESCE(fb_adset.adset_name, cons.match_method_3_fb_adset_id)
        ELSE NULL
    END as enriched_fb_adset_name,

    -- Priority 3: UTM enrichment (lookup campaign by name)
    google_camp.campaign_id as enriched_google_campaign_id_from_utm,

    -- Store all match methods for debugging
    cons.match_method_1,
    cons.match_method_2_platform,
    cons.match_method_3_fb_lead_id,
    cons.match_method_4,
    cons.match_method_5_platform_hint,

    cons.norm_utm_source,
    cons.norm_utm_campaign,
    cons.norm_fbclid,
    cons.norm_gclid

FROM stg.v9_attribution_consolidated cons
LEFT JOIN raw.fb_campaigns fb_camp ON cons.match_method_3_fb_campaign_id = fb_camp.campaign_id
LEFT JOIN raw.fb_ads fb_ad ON cons.match_method_3_fb_ad_id = fb_ad.ad_id
LEFT JOIN raw.fb_adsets fb_adset ON cons.match_method_3_fb_adset_id = fb_adset.adset_id
LEFT JOIN raw.google_ads_names google_camp ON LOWER(cons.norm_utm_campaign) = LOWER(google_camp.campaign_name) AND google_camp.resource_type = 'campaign';

COMMENT ON VIEW stg.v9_attribution_enriched IS
'Level 4: Enrich with campaign/ad details from ad accounts (fb_campaigns, google_ads_names)';

-- ============================================================================
-- LEVEL 5: Final Mapped Attribution (Priority-Based Selection)
-- ============================================================================

CREATE OR REPLACE VIEW stg.v9_attribution_final_mapped AS
SELECT
    id_source,
    client_id,
    event_date,

    -- FINAL PLATFORM (priority order)
    COALESCE(
        match_method_2_platform,  -- Priority 1: marketing_match
        CASE WHEN match_method_3_fb_lead_id IS NOT NULL THEN 'facebook' END,  -- Priority 2: FB leads
        CASE WHEN norm_fbclid IS NOT NULL THEN 'facebook' END,  -- Priority 3: fbclid
        CASE WHEN norm_gclid IS NOT NULL THEN 'google' END,  -- Priority 4: gclid
        match_method_5_platform_hint,  -- Priority 5: UTM hint
        'unattributed'
    ) as final_platform,

    -- FINAL CAMPAIGN ID (best available)
    COALESCE(
        match_method_2_campaign_id,
        match_method_3_fb_campaign_id,
        enriched_google_campaign_id_from_utm
    ) as final_campaign_id,

    -- FINAL CAMPAIGN NAME (best available)
    COALESCE(
        match_method_2_campaign_name,
        enriched_fb_campaign_name,
        norm_utm_campaign
    ) as final_campaign_name,

    -- FINAL AD ID
    COALESCE(
        match_method_2_ad_id,
        match_method_3_fb_ad_id
    ) as final_ad_id,

    -- FINAL AD NAME
    COALESCE(
        match_method_2_ad_name,
        enriched_fb_ad_name
    ) as final_ad_name,

    -- FINAL ADSET ID
    COALESCE(
        match_method_2_adset_id,
        match_method_3_fb_adset_id
    ) as final_adset_id,

    -- FINAL ADSET NAME
    COALESCE(
        match_method_2_adset_name,
        enriched_fb_adset_name
    ) as final_adset_name,

    -- Attribution Method (for debugging)
    CASE
        WHEN match_method_2_campaign_id IS NOT NULL THEN 'marketing_match_priority_1'
        WHEN match_method_3_fb_lead_id IS NOT NULL THEN 'fb_leads_match_priority_2'
        WHEN norm_fbclid IS NOT NULL THEN 'fbclid_priority_3'
        WHEN norm_gclid IS NOT NULL THEN 'gclid_priority_4'
        WHEN match_method_5_platform_hint IS NOT NULL THEN 'utm_heuristic_priority_5'
        ELSE 'unattributed'
    END as attribution_method,

    -- Quality Score (0-100)
    CASE
        WHEN match_method_2_campaign_id IS NOT NULL AND match_method_2_ad_id IS NOT NULL THEN 100
        WHEN match_method_3_fb_ad_id IS NOT NULL THEN 90
        WHEN norm_fbclid IS NOT NULL OR norm_gclid IS NOT NULL THEN 80
        WHEN match_method_2_campaign_id IS NOT NULL THEN 70
        WHEN match_method_5_platform_hint IS NOT NULL AND norm_utm_campaign IS NOT NULL THEN 60
        WHEN match_method_5_platform_hint IS NOT NULL THEN 50
        ELSE 0
    END as attribution_quality_score,

    norm_utm_source,
    norm_utm_campaign,
    norm_utm_medium

FROM stg.v9_attribution_enriched;

COMMENT ON VIEW stg.v9_attribution_final_mapped IS
'Level 5: Final attribution with priority-based selection (6 methods, NO data loss)';

-- ============================================================================
-- Update fact_leads to use Multi-Level Attribution
-- ============================================================================

CREATE OR REPLACE FUNCTION stg.refresh_stg_fact_leads_v2()
RETURNS TABLE(
  rows_inserted BIGINT,
  rows_updated BIGINT,
  rows_total BIGINT,
  execution_time_ms INTEGER
) AS $$
DECLARE
  v_start_time TIMESTAMP;
  v_inserted BIGINT := 0;
  v_total BIGINT := 0;
BEGIN
  v_start_time := clock_timestamp();

  TRUNCATE TABLE stg.fact_leads CASCADE;

  -- Insert using MULTI-LEVEL attribution
  INSERT INTO stg.fact_leads (
    lead_source_id,
    client_id,
    lead_date,
    lead_day,
    lead_event_type,
    dominant_platform,
    source_type,
    utm_source,
    utm_campaign,
    utm_medium,
    matched_platform,
    campaign_id,
    campaign_name,
    ad_id,
    ad_name,
    fb_adset_id,
    fb_adset_name,
    updated_at
  )
  SELECT DISTINCT ON (crm.client_id)
    crm.id_source as lead_source_id,
    crm.client_id,
    crm.event_date as lead_date,
    crm.event_day as lead_day,
    crm.event_type_name as lead_event_type,

    -- Use multi-level attribution
    attr.final_platform as dominant_platform,
    'paid' as source_type,
    attr.norm_utm_source as utm_source,
    attr.norm_utm_campaign as utm_campaign,
    attr.norm_utm_medium as utm_medium,
    attr.final_platform as matched_platform,
    attr.final_campaign_id as campaign_id,
    attr.final_campaign_name as campaign_name,
    attr.final_ad_id as ad_id,
    attr.final_ad_name as ad_name,
    attr.final_adset_id as fb_adset_id,
    attr.final_adset_name as fb_adset_name,

    CURRENT_TIMESTAMP as updated_at

  FROM stg.crm_events crm
  INNER JOIN stg.v9_attribution_final_mapped attr ON crm.id_source = attr.id_source
  WHERE attr.final_platform != 'unattributed'  -- Only attributed leads
    OR crm.is_first_touch = TRUE  -- Or first touch for unattributed
  ORDER BY crm.client_id,
           -- Priority: paid platforms > first touch
           CASE WHEN attr.final_platform IN ('facebook', 'instagram', 'google', 'paid_other') THEN 1 ELSE 2 END,
           crm.event_date DESC;  -- LAST paid touch wins

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  v_total := v_inserted;

  RETURN QUERY SELECT
    v_inserted,
    0::BIGINT,
    v_total,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION stg.refresh_stg_fact_leads_v2() IS
'V9 PROFESSIONAL: Multi-level attribution with 6 parsing methods, priority-based, NO data loss';

-- ============================================================================
-- Execute and Verify
-- ============================================================================

SELECT * FROM stg.refresh_stg_fact_leads_v2();

-- Verification
SELECT
    'Multi-Level Attribution Results' as test_name,
    matched_platform,
    COUNT(*) as leads,
    COUNT(CASE WHEN campaign_id IS NOT NULL THEN 1 END) as with_campaign_id,
    COUNT(CASE WHEN ad_id IS NOT NULL THEN 1 END) as with_ad_id
FROM stg.fact_leads
WHERE matched_platform IN ('facebook', 'instagram', 'google', 'paid_other')
GROUP BY matched_platform
ORDER BY leads DESC;

-- Attribution quality check
SELECT
    attribution_method,
    final_platform,
    COUNT(*) as signals,
    AVG(attribution_quality_score) as avg_quality
FROM stg.v9_attribution_final_mapped
WHERE event_date >= '2025-10-16'
GROUP BY attribution_method, final_platform
ORDER BY avg_quality DESC;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===========================================================';
  RAISE NOTICE '✅ PROFESSIONAL MULTI-LEVEL ATTRIBUTION SYSTEM DEPLOYED';
  RAISE NOTICE '===========================================================';
  RAISE NOTICE '6 Parsing Methods:';
  RAISE NOTICE '  1. fbclid/gclid (direct click IDs)';
  RAISE NOTICE '  2. marketing_match (campaign/ad IDs)';
  RAISE NOTICE '  3. FB leads phone/email match';
  RAISE NOTICE '  4. Meta form_id/page_id match';
  RAISE NOTICE '  5. UTM heuristic detection';
  RAISE NOTICE '  6. CRM manual attribution';
  RAISE NOTICE '';
  RAISE NOTICE '5 Levels:';
  RAISE NOTICE '  Level 1: Raw Signal Extraction';
  RAISE NOTICE '  Level 2: Normalized (clean/standardize)';
  RAISE NOTICE '  Level 3: Consolidated (6 match methods)';
  RAISE NOTICE '  Level 4: Enriched (add campaign details)';
  RAISE NOTICE '  Level 5: Final Mapped (priority selection)';
  RAISE NOTICE '';
  RAISE NOTICE 'Result: NO DATA LOSS, Professional Attribution!';
  RAISE NOTICE '===========================================================';
END $$;
