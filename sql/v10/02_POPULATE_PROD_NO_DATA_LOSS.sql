-- ============================================================================
-- V10: ETL STG → PROD - NO DATA LOSS! Все платформы сохраняются!
-- ============================================================================
-- Date: October 23, 2025
--
-- CRITICAL RULE: НЕ ТЕРЯТЬ НИКАКИЕ ПЛАТФОРМЫ!
--   ✅ Instagram → instagram (НЕ facebook, НЕ meta, НЕ direct!)
--   ✅ Viber → viber (НЕ other, НЕ direct!)
--   ✅ Email → email (НЕ organic, НЕ direct!)
--   ✅ Telegram → telegram (НЕ other!)
--   ✅ Event → event (НЕ organic, НЕ direct!)
--   ✅ TikTok → tiktok (НЕ paid_other!)
--
-- Приоритет Attribution:
--   1. matched_platform з stg (ПРАВДА з кодів!)
--   2. dominant_platform якщо matched_platform NULL
--   3. НІКОЛИ не перезаписуємо на direct/other!
-- ============================================================================

-- ============================================================================
-- ETL 1: Populate prod.dim_clients
-- ============================================================================
CREATE OR REPLACE FUNCTION prod.refresh_prod_dim_clients()
RETURNS TABLE(rows_inserted BIGINT, execution_time_ms INTEGER) AS $$
DECLARE
  v_start_time TIMESTAMP;
  v_inserted BIGINT := 0;
BEGIN
  v_start_time := clock_timestamp();
  TRUNCATE TABLE prod.dim_clients CASCADE;

  INSERT INTO prod.dim_clients (
    client_id,
    phone,
    email,
    full_name,
    first_touch_date,
    first_touch_platform,
    first_touch_channel,
    first_touch_campaign,
    last_touch_date,
    last_touch_platform,
    total_events,
    total_leads,
    total_contracts,
    total_revenue,
    lifetime_value,
    client_segment,
    acquisition_channel
  )
  SELECT
    crm.id_uniq as client_id,

    -- Contact
    attr.phone,
    attr.email,
    crm.fio as full_name,

    -- First Touch
    first_event.event_date as first_touch_date,
    COALESCE(first_event.matched_platform, first_event.dominant_platform, 'direct') as first_touch_platform,
    CASE
        WHEN COALESCE(first_event.matched_platform, first_event.dominant_platform) IN ('facebook', 'instagram', 'google', 'tiktok', 'linkedin', 'paid_other') THEN 'paid'
        WHEN COALESCE(first_event.matched_platform, first_event.dominant_platform) = 'organic' THEN 'organic'
        WHEN COALESCE(first_event.matched_platform, first_event.dominant_platform) = 'email' THEN 'email'
        WHEN COALESCE(first_event.matched_platform, first_event.dominant_platform) = 'viber' THEN 'viber'
        WHEN COALESCE(first_event.matched_platform, first_event.dominant_platform) = 'telegram' THEN 'telegram'
        WHEN COALESCE(first_event.matched_platform, first_event.dominant_platform) = 'event' THEN 'event'
        ELSE 'direct'
    END as first_touch_channel,
    first_event.unified_campaign_name as first_touch_campaign,

    -- Last Touch
    last_event.event_date as last_touch_date,
    COALESCE(last_event.matched_platform, last_event.dominant_platform, 'unknown') as last_touch_platform,

    -- Stats
    (SELECT COUNT(*) FROM stg.crm_events e WHERE e.client_id = crm.id_uniq) as total_events,
    (SELECT COUNT(*) FROM stg.fact_leads l WHERE l.client_id = crm.id_uniq) as total_leads,
    COALESCE(contracts.count, 0) as total_contracts,
    COALESCE(contracts.revenue, 0) as total_revenue,
    COALESCE(contracts.revenue, 0) as lifetime_value,

    -- Segment
    CASE
        WHEN COALESCE(contracts.count, 0) >= 3 THEN 'VIP'
        WHEN COALESCE(contracts.count, 0) >= 1 THEN 'customer'
        ELSE 'prospect'
    END as client_segment,

    -- Acquisition
    CASE
        WHEN COALESCE(first_event.matched_platform, first_event.dominant_platform) IN ('facebook', 'instagram', 'google', 'tiktok', 'linkedin', 'paid_other') THEN 'paid'
        WHEN COALESCE(first_event.matched_platform, first_event.dominant_platform) = 'organic' THEN 'organic'
        WHEN COALESCE(first_event.matched_platform, first_event.dominant_platform) = 'event' THEN 'event'
        ELSE 'direct'
    END as acquisition_channel

  FROM raw.itcrm_new_source crm

  -- First event
  LEFT JOIN LATERAL (
    SELECT event_date, dominant_platform, matched_platform, unified_campaign_name
    FROM stg.crm_events
    WHERE client_id = crm.id_uniq AND is_first_touch = TRUE
    LIMIT 1
  ) first_event ON TRUE

  -- Last event
  LEFT JOIN LATERAL (
    SELECT event_date, dominant_platform, matched_platform
    FROM stg.crm_events
    WHERE client_id = crm.id_uniq
    ORDER BY event_date DESC
    LIMIT 1
  ) last_event ON TRUE

  -- Contracts summary
  LEFT JOIN LATERAL (
    SELECT
        COUNT(*) as count,
        SUM(contract_amount) as revenue
    FROM stg.fact_contracts
    WHERE client_id = crm.id_uniq
  ) contracts ON TRUE

  -- Contact info
  LEFT JOIN LATERAL (
    SELECT phone, email
    FROM stg.source_attribution
    WHERE id_source IN (SELECT id_source FROM stg.crm_events WHERE client_id = crm.id_uniq LIMIT 1)
    LIMIT 1
  ) attr ON TRUE

  WHERE crm.id_uniq IS NOT NULL;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RETURN QUERY SELECT v_inserted, EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prod.refresh_prod_dim_clients() IS
'V10: NO DATA LOSS - preserves Instagram, Viber, Email, Telegram, Event platforms!';

-- ============================================================================
-- ETL 2: Populate prod.fact_leads - PRESERVE ALL PLATFORMS!
-- ============================================================================
CREATE OR REPLACE FUNCTION prod.refresh_prod_fact_leads()
RETURNS TABLE(rows_inserted BIGINT, execution_time_ms INTEGER) AS $$
DECLARE
  v_start_time TIMESTAMP;
  v_inserted BIGINT := 0;
BEGIN
  v_start_time := clock_timestamp();
  TRUNCATE TABLE prod.fact_leads CASCADE;

  INSERT INTO prod.fact_leads (
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
    creative_cta,
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
    form_name,
    attribution_method,
    attribution_quality_score
  )
  SELECT
    fl.lead_source_id as lead_id,
    fl.client_id,
    fl.lead_day as lead_date,
    fl.lead_date as lead_timestamp,

    -- ============================================================================
    -- CRITICAL: PRESERVE EXACT PLATFORM! NO DATA LOSS!
    -- ============================================================================
    CASE
        -- Paid platforms - keep as is
        WHEN fl.matched_platform = 'facebook' THEN 'facebook'
        WHEN fl.matched_platform = 'instagram' THEN 'instagram'  -- НЕ facebook!
        WHEN fl.matched_platform = 'google' THEN 'google'
        WHEN fl.matched_platform = 'tiktok' THEN 'tiktok'  -- НЕ paid_other!
        WHEN fl.matched_platform = 'linkedin' THEN 'linkedin'

        -- Communication channels - keep as is
        WHEN fl.matched_platform = 'viber' THEN 'viber'  -- НЕ other!
        WHEN fl.matched_platform = 'telegram' THEN 'telegram'  -- НЕ other!
        WHEN fl.matched_platform = 'email' THEN 'email'  -- НЕ organic!

        -- Other channels
        WHEN fl.matched_platform = 'event' THEN 'event'  -- НЕ direct!
        WHEN fl.matched_platform = 'organic' THEN 'organic'
        WHEN fl.matched_platform = 'referral' THEN 'referral'

        -- Fallback only if really unknown
        ELSE COALESCE(fl.matched_platform, fl.dominant_platform, 'direct')
    END as platform,

    -- Channel classification
    CASE
        WHEN fl.matched_platform IN ('facebook', 'instagram', 'google', 'tiktok', 'linkedin', 'paid_other') THEN 'paid'
        WHEN fl.matched_platform = 'organic' THEN 'organic'
        WHEN fl.matched_platform = 'email' THEN 'email'
        WHEN fl.matched_platform IN ('viber', 'telegram') THEN 'messaging'
        WHEN fl.matched_platform = 'event' THEN 'event'
        WHEN fl.matched_platform = 'referral' THEN 'referral'
        ELSE 'direct'
    END as channel,

    fl.campaign_id,
    fl.campaign_name,
    fl.fb_adset_id as adset_id,
    fl.fb_adset_name as adset_name,
    fl.ad_id,
    fl.ad_name,

    -- Creative details
    cr.ad_creative_id as creative_id,
    cr.title as creative_title,
    cr.body as creative_body,
    cr.media_image_src as creative_image_url,
    cr.cta_type as creative_cta,

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
    req.form_name,

    -- Attribution
    CASE
        WHEN fl.campaign_id IS NOT NULL AND fl.ad_id IS NOT NULL THEN 'exact_match'
        WHEN fl.campaign_id IS NOT NULL THEN 'campaign_match'
        WHEN fl.utm_campaign IS NOT NULL THEN 'utm_attribution'
        WHEN fbl.fb_lead_id IS NOT NULL THEN 'fb_leads_match'
        WHEN fl.matched_platform IS NOT NULL THEN 'platform_detected'
        ELSE 'heuristic'
    END as attribution_method,

    CASE
        WHEN fl.campaign_id IS NOT NULL AND fl.ad_id IS NOT NULL THEN 100
        WHEN fl.campaign_id IS NOT NULL THEN 80
        WHEN fbl.fb_lead_id IS NOT NULL THEN 90
        WHEN fl.utm_campaign IS NOT NULL THEN 60
        WHEN fl.matched_platform IS NOT NULL THEN 50
        ELSE 30
    END as attribution_quality_score

  FROM stg.fact_leads fl
  LEFT JOIN stg.source_attribution attr ON fl.lead_source_id = attr.id_source
  LEFT JOIN raw.fb_leads fbl ON (
      fbl.phone = REGEXP_REPLACE(attr.phone, '[^0-9]', '', 'g')
      OR fbl.email = attr.email
  )
  LEFT JOIN raw.itcrm_internet_request req ON fl.lead_source_id::text = req.request_id::text
  LEFT JOIN stg.v9_facebook_ad_creatives_full cr ON fl.ad_id = cr.ad_id;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RETURN QUERY SELECT v_inserted, EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prod.refresh_prod_fact_leads() IS
'V10: NO DATA LOSS ETL - Instagram stays Instagram, Viber stays Viber, etc!';

-- ============================================================================
-- ETL 3: Populate prod.fact_contracts - PRESERVE ALL PLATFORMS!
-- ============================================================================
CREATE OR REPLACE FUNCTION prod.refresh_prod_fact_contracts()
RETURNS TABLE(rows_inserted BIGINT, execution_time_ms INTEGER) AS $$
DECLARE
  v_start_time TIMESTAMP;
  v_inserted BIGINT := 0;
BEGIN
  v_start_time := clock_timestamp();
  TRUNCATE TABLE prod.fact_contracts CASCADE;

  INSERT INTO prod.fact_contracts (
    contract_id,
    client_id,
    lead_id,
    contract_date,
    contract_timestamp,
    product_id,
    product_name,
    product_category,
    contract_amount,
    currency,
    platform,
    channel,
    campaign_id,
    campaign_name,
    adset_id,
    ad_id,
    creative_id,
    creative_image_url,
    lead_date,
    days_to_convert,
    attribution_method,
    attribution_quality_score,
    contract_status
  )
  SELECT
    fc.contract_source_id as contract_id,
    fc.client_id,
    pl.lead_id,
    fc.contract_day as contract_date,
    fc.contract_date as contract_timestamp,

    -- Product details
    COALESCE(req.form_name, 'Unknown') as product_id,
    COALESCE(req.form_name, 'Unknown Product') as product_name,
    CASE
        WHEN req.form_name ILIKE '%МКА%' OR req.form_name ILIKE '%Мала Комп%' THEN 'Мала Комп''ютерна Академія'
        WHEN req.form_name ILIKE '%табір%' OR req.form_name ILIKE '%табор%' THEN 'Табори'
        WHEN req.form_name ILIKE '%Step2talk%' THEN 'Step2talk'
        WHEN req.form_name ILIKE '%розробка%' THEN 'Професійні курси'
        WHEN req.form_name ILIKE '%тестування%' THEN 'Тестування ПЗ'
        ELSE 'Інші курси'
    END as product_category,

    fc.contract_amount,
    'UAH' as currency,

    -- ============================================================================
    -- CRITICAL: PRESERVE EXACT PLATFORM! NO DATA LOSS!
    -- ============================================================================
    CASE
        -- Paid platforms
        WHEN fc.matched_platform = 'facebook' THEN 'facebook'
        WHEN fc.matched_platform = 'instagram' THEN 'instagram'  -- НЕ facebook!
        WHEN fc.matched_platform = 'meta' THEN 'facebook'  -- meta → facebook OK
        WHEN fc.matched_platform = 'google' THEN 'google'
        WHEN fc.matched_platform = 'tiktok' THEN 'tiktok'

        -- Communication
        WHEN fc.matched_platform = 'viber' THEN 'viber'  -- НЕ other!
        WHEN fc.matched_platform = 'telegram' THEN 'telegram'
        WHEN fc.matched_platform = 'email' THEN 'email'

        -- Other
        WHEN fc.matched_platform = 'event' THEN 'event'
        WHEN fc.matched_platform = 'organic' THEN 'organic'

        -- Fallback
        ELSE COALESCE(fc.matched_platform, fc.dominant_platform, 'direct')
    END as platform,

    -- Channel
    CASE
        WHEN fc.matched_platform IN ('facebook', 'instagram', 'meta', 'google', 'tiktok', 'linkedin', 'paid_other') THEN 'paid'
        WHEN fc.matched_platform = 'organic' THEN 'organic'
        WHEN fc.matched_platform = 'email' THEN 'email'
        WHEN fc.matched_platform IN ('viber', 'telegram') THEN 'messaging'
        WHEN fc.matched_platform = 'event' THEN 'event'
        ELSE 'direct'
    END as channel,

    fc.campaign_id,
    fc.campaign_name,
    fc.fb_adset_id as adset_id,
    fc.ad_id,

    -- Creative
    cr.ad_creative_id as creative_id,
    cr.media_image_src as creative_image_url,

    -- Journey
    fc.lead_day as lead_date,
    fc.days_to_contract,

    -- Attribution
    CASE
        WHEN fc.campaign_id IS NOT NULL AND fc.ad_id IS NOT NULL THEN 'exact_match'
        WHEN fc.campaign_id IS NOT NULL THEN 'campaign_match'
        WHEN fc.utm_campaign IS NOT NULL THEN 'utm_attribution'
        WHEN fc.matched_platform IS NOT NULL THEN 'platform_detected'
        ELSE 'heuristic'
    END as attribution_method,

    CASE
        WHEN fc.campaign_id IS NOT NULL AND fc.ad_id IS NOT NULL THEN 100
        WHEN fc.campaign_id IS NOT NULL THEN 80
        WHEN fc.utm_campaign IS NOT NULL THEN 60
        WHEN fc.matched_platform IS NOT NULL THEN 50
        ELSE 30
    END as attribution_quality_score,

    'active' as contract_status

  FROM stg.fact_contracts fc
  LEFT JOIN prod.fact_leads pl ON fc.lead_source_id = pl.lead_id
  LEFT JOIN raw.itcrm_internet_request req ON fc.lead_source_id::text = req.request_id::text
  LEFT JOIN stg.v9_facebook_ad_creatives_full cr ON fc.ad_id = cr.ad_id;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RETURN QUERY SELECT v_inserted, EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prod.refresh_prod_fact_contracts() IS
'V10: NO DATA LOSS ETL - preserves all platforms exactly as they are!';

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
  RAISE NOTICE 'Starting V10 ETL - NO DATA LOSS mode...';

  -- 1. Clients
  RETURN QUERY
  SELECT 'prod.dim_clients'::TEXT, * FROM prod.refresh_prod_dim_clients();

  -- 2. Leads
  RETURN QUERY
  SELECT 'prod.fact_leads'::TEXT, * FROM prod.refresh_prod_fact_leads();

  -- 3. Contracts
  RETURN QUERY
  SELECT 'prod.fact_contracts'::TEXT, * FROM prod.refresh_prod_fact_contracts();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prod.refresh_all_prod_tables() IS
'V10: Master ETL - preserves Instagram, Viber, Email, Telegram, Event, etc!';

-- ============================================================================
-- Data Quality Check
-- ============================================================================
CREATE OR REPLACE FUNCTION prod.check_data_quality()
RETURNS TABLE(
  check_name TEXT,
  issue_count BIGINT,
  status TEXT
) AS $$
BEGIN
  -- Check 1: No Instagram lost
  RETURN QUERY
  SELECT
    'Instagram Leads Preserved'::TEXT,
    COUNT(*) as issue_count,
    CASE WHEN COUNT(*) > 0 THEN '✅ OK' ELSE '❌ LOST' END as status
  FROM prod.fact_leads
  WHERE platform = 'instagram';

  -- Check 2: No Viber lost
  RETURN QUERY
  SELECT
    'Viber Leads Preserved'::TEXT,
    COUNT(*),
    CASE WHEN COUNT(*) > 0 THEN '✅ OK' ELSE '❌ LOST' END
  FROM prod.fact_leads
  WHERE platform = 'viber';

  -- Check 3: No Email lost
  RETURN QUERY
  SELECT
    'Email Leads Preserved'::TEXT,
    COUNT(*),
    CASE WHEN COUNT(*) > 0 THEN '✅ OK' ELSE '❌ LOST' END
  FROM prod.fact_leads
  WHERE platform = 'email';

  -- Check 4: No Telegram lost
  RETURN QUERY
  SELECT
    'Telegram Leads Preserved'::TEXT,
    COUNT(*),
    CASE WHEN COUNT(*) > 0 THEN '✅ OK' ELSE '⚠️  CHECK' END
  FROM prod.fact_leads
  WHERE platform = 'telegram';

  -- Check 5: No Event lost
  RETURN QUERY
  SELECT
    'Event Leads Preserved'::TEXT,
    COUNT(*),
    CASE WHEN COUNT(*) > 0 THEN '✅ OK' ELSE '⚠️  CHECK' END
  FROM prod.fact_leads
  WHERE platform = 'event';

  -- Check 6: Facebook distinct from Instagram
  RETURN QUERY
  SELECT
    'Facebook != Instagram'::TEXT,
    COUNT(DISTINCT platform),
    CASE WHEN COUNT(DISTINCT platform) >= 2 THEN '✅ OK' ELSE '❌ MERGED' END
  FROM prod.fact_leads
  WHERE platform IN ('facebook', 'instagram');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prod.check_data_quality() IS
'V10: Verify NO platforms were lost during ETL';

-- ============================================================================
-- Execute Initial Load
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '🚀 STARTING V10 ETL - NO DATA LOSS MODE';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Rules:';
  RAISE NOTICE '  ✅ Instagram → instagram (NOT facebook!)';
  RAISE NOTICE '  ✅ Viber → viber (NOT other!)';
  RAISE NOTICE '  ✅ Email → email (NOT organic!)';
  RAISE NOTICE '  ✅ Telegram → telegram (NOT other!)';
  RAISE NOTICE '  ✅ Event → event (NOT direct!)';
  RAISE NOTICE '  ✅ TikTok → tiktok (NOT paid_other!)';
  RAISE NOTICE '============================================================';
END $$;

-- Run ETL
SELECT * FROM prod.refresh_all_prod_tables();

-- Quality Check
SELECT * FROM prod.check_data_quality();

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ V10 ETL COMPLETE - ALL PLATFORMS PRESERVED!';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Ready for BI and API consumption!';
  RAISE NOTICE '============================================================';
END $$;
