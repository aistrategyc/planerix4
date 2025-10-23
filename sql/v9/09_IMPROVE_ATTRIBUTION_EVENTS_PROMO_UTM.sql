-- ============================================================================
-- V9 ATTRIBUTION IMPROVEMENT - Events, Promo, UTM Fallback
-- ============================================================================
-- Purpose: Reduce 'direct' attribution from 96% to 20-30%
-- Date: 22 октября 2025
-- Target: Improve attribution rate from 4% to 70-80%
-- ============================================================================

-- ============================================================================
-- STEP 1: Enhanced source_attribution with UTM parsing
-- ============================================================================
CREATE OR REPLACE FUNCTION stg.refresh_stg_source_attribution_enhanced()
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

  -- Очистить таблицу
  TRUNCATE TABLE stg.source_attribution CASCADE;

  -- Enhanced attribution с приоритизацией источников
  INSERT INTO stg.source_attribution (
    id_source,
    fbclid, fclid, gclid, fb_lead_id,
    utm_source, utm_campaign, utm_medium, utm_term, utm_content,
    dominant_platform,
    source_type,
    phone, email,
    internet_request_id,
    event_id,
    form_id,
    loaded_at
  )
  SELECT DISTINCT ON (id_source)
    id_source,
    fbclid, fclid, gclid, fb_lead_id,
    utm_source, utm_campaign, utm_medium, utm_term, utm_content,

    -- ENHANCED dominant_platform logic with Events, Promo, UTM fallback
    CASE
      -- Priority 1: Events (organic source)
      WHEN event_id IS NOT NULL THEN 'event'

      -- Priority 2: Facebook (paid)
      WHEN fb_lead_id IS NOT NULL OR fbclid IS NOT NULL OR fclid IS NOT NULL THEN 'facebook'

      -- Priority 3: Google (paid)
      WHEN gclid IS NOT NULL THEN 'google'

      -- Priority 4: UTM Source mapping (promo & organic)
      WHEN utm_source = 'email' THEN 'email'
      WHEN utm_source IN ('tgchanel', 'telegram') THEN 'telegram'
      WHEN utm_source = 'viber' THEN 'viber'
      WHEN utm_source IN ('Instagram_Reels', 'ig', 'instagram') THEN 'instagram'
      WHEN utm_source = 'an' THEN 'tiktok'  -- 'an' is likely TikTok ads
      WHEN utm_source = 'youtube' THEN 'youtube'
      WHEN utm_source = 'google' AND utm_medium = 'organic' THEN 'google_organic'
      WHEN utm_source = 'google' AND utm_medium IN ('cpc', 'ppc') THEN 'google'
      WHEN utm_source IN ('fb', 'facebook') AND utm_medium IN ('cpc', 'cpm', 'paid') THEN 'facebook'

      -- Priority 5: UTM Medium mapping
      WHEN utm_medium IN ('oldbase', 'partner', 'referral') THEN 'promo'
      WHEN utm_medium = 'organic' THEN 'organic'
      WHEN utm_medium IN ('cpc', 'ppc', 'cpm', 'paid') THEN 'paid_other'

      -- Priority 6: Internet request (web form)
      WHEN internet_request_id IS NOT NULL THEN 'internet_request'

      -- Priority 7: Form submission
      WHEN form_id IS NOT NULL THEN 'form'

      -- Fallback: direct (only if no attribution found)
      ELSE 'direct'
    END as dominant_platform,

    -- Source type classification
    CASE
      WHEN event_id IS NOT NULL THEN 'organic_event'
      WHEN utm_source = 'email' THEN 'promo_email'
      WHEN utm_source IN ('tgchanel', 'telegram', 'viber') THEN 'promo_messenger'
      WHEN utm_source IN ('Instagram_Reels', 'ig', 'instagram', 'an', 'youtube') THEN 'organic_social'
      WHEN utm_medium IN ('oldbase', 'partner', 'referral') THEN 'promo_partner'
      WHEN fb_lead_id IS NOT NULL OR fbclid IS NOT NULL OR fclid IS NOT NULL THEN 'paid_social'
      WHEN gclid IS NOT NULL THEN 'paid_search'
      WHEN utm_medium = 'organic' THEN 'organic_search'
      WHEN internet_request_id IS NOT NULL THEN 'web_form'
      ELSE 'unknown'
    END as source_type,

    phone, email,
    internet_request_id,
    event_id,
    form_id,
    CURRENT_TIMESTAMP as loaded_at
  FROM (
    SELECT
      ce.id_source,

      -- JSONB extraction from analytics
      ia.code->>'fbclid' as fbclid,
      ia.code->>'fclid' as fclid,
      ia.code->>'gclid' as gclid,
      ia.code->>'fb_lead_id' as fb_lead_id,

      -- UTM parameters (CRITICAL for fallback attribution)
      ia.code->>'utm_source' as utm_source,
      ia.code->>'utm_campaign' as utm_campaign,
      ia.code->>'utm_medium' as utm_medium,
      ia.code->>'utm_term' as utm_term,
      ia.code->>'utm_content' as utm_content,

      -- Contact info
      ia.phone,
      ia.email,

      -- Relation IDs
      ia.internet_request_id,
      er.id_event as event_id,
      nf.id_form as form_id,

      -- Priority for DISTINCT ON (best attribution first)
      CASE
        WHEN er.id_event IS NOT NULL THEN 1  -- Events have priority
        WHEN ia.code->>'fb_lead_id' IS NOT NULL THEN 2
        WHEN ia.code->>'gclid' IS NOT NULL THEN 3
        WHEN ia.code->>'fbclid' IS NOT NULL THEN 4
        WHEN ia.code->>'fclid' IS NOT NULL THEN 5
        WHEN ia.code ? 'utm_source' AND ia.code->>'utm_source' != '' THEN 6
        WHEN ia.code ? 'utm_medium' AND ia.code->>'utm_medium' != '' THEN 7
        WHEN ia.internet_request_id IS NOT NULL THEN 8
        WHEN nf.id_form IS NOT NULL THEN 9
        ELSE 10
      END as priority

    FROM stg.crm_events ce

    -- Analytics (marketing params)
    LEFT JOIN raw.itcrm_internet_request_relation irr ON ce.id_source = irr.id_source
    LEFT JOIN raw.itcrm_analytics ia ON irr.id_request = ia.internet_request_id

    -- Events (organic source)
    LEFT JOIN raw.itcrm_events_relations er ON ce.id_source = er.id_source

    -- Forms
    LEFT JOIN raw.itcrm_new_form nf ON ce.id_source = nf.id_source

  ) sub
  ORDER BY id_source, priority ASC;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  v_total := v_inserted;

  RETURN QUERY SELECT
    v_inserted,
    0::BIGINT,
    v_total,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION stg.refresh_stg_source_attribution_enhanced() IS 'V9: Enhanced source attribution with Events, Promo, UTM fallback';

-- ============================================================================
-- STEP 2: Update refresh_all_stg_tables to use enhanced function
-- ============================================================================
CREATE OR REPLACE FUNCTION stg.refresh_all_stg_tables()
RETURNS TABLE(
  step_name TEXT,
  rows_processed BIGINT,
  execution_time_ms INTEGER,
  status TEXT
) AS $$
BEGIN
  -- Step 1: CRM Events
  RETURN QUERY
  SELECT
    'crm_events'::TEXT,
    r.rows_total,
    r.execution_time_ms,
    'completed'::TEXT
  FROM stg.refresh_stg_crm_events() r;

  -- Step 2: Source Attribution (ENHANCED VERSION)
  RETURN QUERY
  SELECT
    'source_attribution_enhanced'::TEXT,
    r.rows_total,
    r.execution_time_ms,
    'completed'::TEXT
  FROM stg.refresh_stg_source_attribution_enhanced() r;

  -- Step 3: Marketing Match
  RETURN QUERY
  SELECT
    'marketing_match'::TEXT,
    r.rows_total,
    r.execution_time_ms,
    'completed'::TEXT
  FROM stg.refresh_stg_marketing_match() r;

  -- Step 4: Fact Leads
  RETURN QUERY
  SELECT
    'fact_leads'::TEXT,
    r.rows_total,
    r.execution_time_ms,
    'completed'::TEXT
  FROM stg.refresh_stg_fact_leads() r;

  -- Step 5: Fact Contracts
  RETURN QUERY
  SELECT
    'fact_contracts'::TEXT,
    r.rows_total,
    r.execution_time_ms,
    'completed'::TEXT
  FROM stg.refresh_stg_fact_contracts() r;

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION stg.refresh_all_stg_tables() IS 'V9: Refresh all staging tables (updated with enhanced attribution)';

-- ============================================================================
-- STEP 3: Create Events detail view
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_events_attribution AS
SELECT
  e.id_event,
  e.name_event,
  e.full_name_event,
  e.date_event,
  e.status_event,
  e.type_event,
  e.advertising_costs as event_ad_spend,

  COUNT(DISTINCT fl.client_id) as total_leads,
  COUNT(DISTINCT fc.client_id) as total_contracts,
  SUM(fc.contract_amount) as total_revenue,

  ROUND(AVG(fc.days_to_contract), 1) as avg_days_to_contract,
  ROUND(100.0 * COUNT(DISTINCT fc.client_id) / NULLIF(COUNT(DISTINCT fl.client_id), 0), 2) as conversion_rate

FROM raw.itcrm_events e
LEFT JOIN raw.itcrm_events_relations er ON e.id_event = er.id_event
LEFT JOIN stg.fact_leads fl ON er.id_source = fl.lead_source_id
LEFT JOIN stg.fact_contracts fc ON fl.client_id = fc.client_id

WHERE e.id_event IS NOT NULL
GROUP BY e.id_event, e.name_event, e.full_name_event, e.date_event, e.status_event, e.type_event, e.advertising_costs
HAVING COUNT(DISTINCT fl.client_id) > 0
ORDER BY total_leads DESC;

COMMENT ON VIEW stg.v9_events_attribution IS 'V9: Events performance - organic source attribution';

-- ============================================================================
-- STEP 4: Create Promo Sources view
-- ============================================================================
CREATE OR REPLACE VIEW stg.v9_promo_sources AS
SELECT
  fl.utm_source as promo_source,
  fl.utm_medium as promo_medium,
  fl.utm_campaign as promo_campaign,

  fl.dominant_platform as platform_category,
  fl.source_type,

  COUNT(DISTINCT fl.client_id) as total_leads,
  COUNT(DISTINCT fc.client_id) as total_contracts,
  SUM(fc.contract_amount) as total_revenue,

  MIN(fl.lead_day) as first_lead_date,
  MAX(fl.lead_day) as last_lead_date,

  ROUND(AVG(fc.contract_amount), 0) as avg_contract_value,
  ROUND(100.0 * COUNT(DISTINCT fc.client_id) / NULLIF(COUNT(DISTINCT fl.client_id), 0), 2) as conversion_rate

FROM stg.fact_leads fl
LEFT JOIN stg.fact_contracts fc ON fl.client_id = fc.client_id

WHERE fl.dominant_platform IN ('email', 'telegram', 'viber', 'instagram', 'tiktok', 'youtube', 'promo')
  OR fl.source_type LIKE 'promo_%'
  OR fl.source_type LIKE 'organic_%'

GROUP BY fl.utm_source, fl.utm_medium, fl.utm_campaign, fl.dominant_platform, fl.source_type
HAVING COUNT(DISTINCT fl.client_id) > 0
ORDER BY total_leads DESC;

COMMENT ON VIEW stg.v9_promo_sources IS 'V9: Promo & organic sources performance';

-- ============================================================================
-- SUCCESS CHECK & ATTRIBUTION ANALYSIS
-- ============================================================================
SELECT
  'ENHANCED ATTRIBUTION TEST' as test_name,

  -- Distribution by platform
  COUNT(*) FILTER (WHERE dominant_platform = 'direct') as direct_count,
  COUNT(*) FILTER (WHERE dominant_platform = 'event') as event_count,
  COUNT(*) FILTER (WHERE dominant_platform = 'facebook') as facebook_count,
  COUNT(*) FILTER (WHERE dominant_platform = 'google') as google_count,
  COUNT(*) FILTER (WHERE dominant_platform = 'email') as email_count,
  COUNT(*) FILTER (WHERE dominant_platform = 'telegram') as telegram_count,
  COUNT(*) FILTER (WHERE dominant_platform = 'instagram') as instagram_count,
  COUNT(*) FILTER (WHERE dominant_platform = 'promo') as promo_count,

  -- Attribution rate
  ROUND(100.0 * COUNT(*) FILTER (WHERE dominant_platform != 'direct') / COUNT(*), 2) as attribution_rate

FROM stg.source_attribution;
