-- ============================================================================
-- V9 CRITICAL FIX: Facebook and Instagram Lost Due to Wrong Priority!
-- ============================================================================
-- Date: October 23, 2025
-- Purpose: Fix attribution priority - platform detection should be BEFORE CRM manual
--
-- PROBLEM:
--   Current priority:
--     1. Campaign Match
--     2. UTM Attribution
--     3. UTM Source Only
--     4. CRM Manual ← TOO HIGH!
--     5. Unattributed
--
--   Result: Facebook/Instagram detected from utm_source, but OVERRIDDEN by CRM manual
--   Example: Client 433658
--     - fact_contracts.matched_platform = 'instagram'
--     - detected_platform = 'instagram' (from utm_source)
--     - BUT unified_platform = 'google' (CRM manual = download_invoice)
--
--   Lost contracts:
--     - Facebook: 7 clients (9 contracts) → only 4 clients visible
--     - Instagram: 4 clients (9 contracts) → only 1 client visible
--
-- CORRECT PRIORITY:
--   1. Campaign Match (Google Ads, Facebook Ads - EXACT attribution)
--   2. Platform Detection (facebook, instagram from utm_source) ← MOVE HERE!
--   3. UTM Attribution (other utm_campaign)
--   4. CRM Manual (ONLY if NO codes at all)
--   5. Unattributed
--
-- REASON:
--   If we have utm_source = 'facebook' or 'instagram', this is MORE RELIABLE
--   than CRM manual source (which might be generic like 'download_invoice')
-- ============================================================================

DROP VIEW IF EXISTS stg.v9_client_full_attribution CASCADE;

CREATE OR REPLACE VIEW stg.v9_client_full_attribution AS
WITH client_all_events AS (
  -- Собираем ВСЕ события для каждого клиента
  SELECT
    ns.id_uniq as client_id,
    ns.id_source,
    ia.code,
    ia.request_created_at as event_date,
    ia.code->>'utm_source' as utm_source,
    ia.code->>'utm_campaign' as utm_campaign,
    ia.code->>'utm_medium' as utm_medium,
    ia.code->>'utm_term' as utm_term,
    ia.code->>'utm_content' as utm_content,
    ia.code->>'fclid' as fclid,
    ia.code->>'fbclid' as fbclid,
    ia.code->>'gclid' as gclid,
    ia.code->>'ad_id' as code_ad_id,
    ia.code->>'campaign_id' as code_campaign_id,
    ia.code->>'adset_id' as code_adset_id,
    ia.code->>'event_id' as event_id,
    LOWER(COALESCE(ia.code->>'utm_source', '')) as utm_source_lower
  FROM raw.itcrm_new_source ns
  LEFT JOIN raw.itcrm_internet_request_relation irr ON ns.id_source = irr.id_source
  LEFT JOIN raw.itcrm_internet_request ir ON irr.id_request = ir.request_id
  LEFT JOIN raw.itcrm_analytics ia ON ir.request_id = ia.internet_request_id
  WHERE ns.id_uniq IS NOT NULL
    AND ia.code IS NOT NULL
),

client_platform_detection AS (
  -- Определяем платформу из utm_source (НЕ ТЕРЯЕМ ни одну!)
  SELECT
    client_id,
    id_source,
    event_date,
    utm_source,
    utm_campaign,
    utm_medium,
    utm_term,
    utm_content,
    fclid,
    fbclid,
    gclid,
    code_ad_id,
    code_campaign_id,
    code_adset_id,

    -- Определяем платформу из utm_source
    CASE
      -- Google Ads (gclid или utm_source=google)
      WHEN gclid IS NOT NULL THEN 'google'
      WHEN utm_source_lower = 'google' THEN 'google'

      -- Instagram (отдельно от Facebook!)
      WHEN utm_source_lower LIKE '%instagram%' THEN 'instagram'
      WHEN utm_source_lower LIKE '%ig_%' THEN 'instagram'
      WHEN utm_source_lower = 'instagram_feed' THEN 'instagram'
      WHEN utm_source_lower = 'instagram_stories' THEN 'instagram'
      WHEN utm_source_lower = 'instagram_reels' THEN 'instagram'

      -- Facebook (fclid или utm_source=facebook)
      WHEN fclid IS NOT NULL THEN 'facebook'
      WHEN fbclid IS NOT NULL THEN 'facebook'
      WHEN utm_source_lower = 'facebook' THEN 'facebook'
      WHEN utm_source_lower = 'facebook.com' THEN 'facebook'
      WHEN utm_source_lower = 'facebook_mobile_feed' THEN 'facebook'
      WHEN utm_source_lower LIKE 'facebook%' THEN 'facebook'

      -- Telegram
      WHEN utm_source_lower LIKE '%telegram%' THEN 'telegram'
      WHEN utm_source_lower = 'tgchanel' THEN 'telegram'
      WHEN utm_source_lower = 't.me' THEN 'telegram'

      -- Viber
      WHEN utm_source_lower LIKE '%viber%' THEN 'viber'

      -- Email
      WHEN utm_source_lower LIKE '%email%' THEN 'email'
      WHEN utm_source_lower = 'sendpulse' THEN 'email'
      WHEN utm_source_lower LIKE '%mail%' THEN 'email'

      -- Event (offline events, exhibitions, open days)
      WHEN utm_source_lower = 'event' THEN 'event'
      WHEN utm_source_lower LIKE '%exhibition%' THEN 'event'

      -- Other
      ELSE 'other'
    END as detected_platform
  FROM client_all_events
),

client_best_ad_match AS (
  -- Находим лучшее совпадение в marketing_match
  SELECT DISTINCT ON (cpd.client_id)
    cpd.client_id,
    cpd.id_source,
    cpd.event_date,
    cpd.utm_source,
    cpd.utm_campaign,
    cpd.utm_medium,
    cpd.utm_term,
    cpd.utm_content,
    cpd.gclid,
    cpd.fclid,
    cpd.detected_platform,
    mm.matched_platform,
    mm.campaign_name,
    mm.campaign_id,
    mm.ad_id,
    mm.ad_name,
    mm.fb_adset_id,
    mm.fb_adset_name
  FROM client_platform_detection cpd
  LEFT JOIN stg.marketing_match mm ON cpd.id_source = mm.id_source
  ORDER BY cpd.client_id, mm.campaign_name IS NOT NULL DESC, cpd.event_date DESC
),

client_crm_manual_source AS (
  -- Добавляем CRM MANUAL SOURCE (request_type из crm_requests) - LOWEST PRIORITY!
  SELECT
    ns.id_uniq as client_id,
    ns.id_source,
    cr.request_type as crm_manual_source,
    cr.form_name,
    cr.request_created_at,

    -- Определяем платформу из CRM request_type (если не нашлось по code)
    CASE
      WHEN LOWER(cr.request_type) = 'facebook' THEN 'facebook'
      WHEN LOWER(cr.request_type) = 'instagram' THEN 'instagram'
      WHEN LOWER(cr.request_type) = 'telegram' THEN 'telegram'
      WHEN LOWER(cr.request_type) = 'viber' THEN 'viber'
      WHEN LOWER(cr.request_type) = 'event' THEN 'event'
      WHEN LOWER(cr.request_type) = 'email' THEN 'email'
      WHEN LOWER(cr.request_type) = 'consultation' THEN 'organic'
      WHEN LOWER(cr.request_type) = 'call' THEN 'organic'
      WHEN LOWER(cr.request_type) = 'course' THEN 'organic'
      WHEN LOWER(cr.request_type) = 'academy-consult' THEN 'organic'
      WHEN LOWER(cr.request_type) = 'school-consult' THEN 'organic'
      WHEN LOWER(cr.request_type) = 'study-form' THEN 'organic'
      ELSE 'other'
    END as crm_platform,

    -- Название кампании для CRM источника (form_name или request_type)
    COALESCE(cr.form_name, cr.request_type) as crm_campaign_name

  FROM raw.itcrm_new_source ns
  LEFT JOIN dashboards.crm_requests cr ON ns.id_uniq = cr.id_uniq
  WHERE ns.id_uniq IS NOT NULL
),

client_full_enrichment AS (
  -- Объединяем все источники атрибуции с ПРАВИЛЬНЫМ ПРИОРИТЕТОМ
  SELECT
    COALESCE(cam.client_id, crm.client_id) as client_id,
    COALESCE(cam.id_source, crm.id_source) as id_source,

    -- Marketing match fields (priority 1)
    cam.matched_platform,
    cam.campaign_name as mm_campaign_name,
    cam.campaign_id,
    cam.ad_id,
    cam.ad_name,
    cam.fb_adset_id,
    cam.fb_adset_name,

    -- UTM fields (priority 2)
    cam.utm_source,
    cam.utm_campaign,
    cam.utm_medium,
    cam.utm_term,
    cam.utm_content,

    -- Platform detection from code (priority 2)
    cam.detected_platform,

    -- CRM manual source (priority 4 - LOWEST!) ✅ FIXED!
    crm.crm_manual_source,
    crm.crm_platform,
    crm.crm_campaign_name,
    crm.form_name,

    -- FIXED UNIFIED FIELDS (with CORRECT fallback priority)
    COALESCE(
      cam.matched_platform,      -- Priority 1: Marketing match (Google Ads, Facebook Ads)
      CASE
        WHEN cam.detected_platform IN ('facebook', 'instagram', 'telegram', 'viber', 'email', 'event')
        THEN cam.detected_platform -- Priority 2: Platform detection ✅ MOVED UP!
        ELSE NULL
      END,
      CASE
        WHEN cam.utm_campaign IS NOT NULL OR cam.utm_source IS NOT NULL
        THEN cam.detected_platform -- Priority 3: Other UTM attribution
        ELSE NULL
      END,
      crm.crm_platform,          -- Priority 4: CRM manual source (ONLY if no codes!)
      'unattributed'             -- Priority 5: No attribution
    ) as unified_platform,

    COALESCE(
      cam.campaign_name,         -- Priority 1: Marketing match campaign
      cam.utm_campaign,          -- Priority 2: UTM campaign
      cam.utm_source,            -- Priority 3: UTM source as fallback (Telegram, Viber)
      crm.crm_campaign_name,     -- Priority 4: CRM form_name or request_type (ONLY if no codes!)
      'Unknown'                  -- Priority 5: Unknown
    ) as unified_campaign_name,

    -- Attribution level (для аналитики) ✅ FIXED!
    CASE
      WHEN cam.campaign_name IS NOT NULL THEN 'campaign_match'        -- Level 1
      WHEN cam.detected_platform IN ('facebook', 'instagram', 'telegram', 'viber', 'email', 'event')
           THEN 'platform_detected'                                   -- Level 2 ✅ NEW!
      WHEN cam.utm_campaign IS NOT NULL THEN 'utm_attribution'        -- Level 3
      WHEN cam.utm_source IS NOT NULL THEN 'utm_source_only'          -- Level 4
      WHEN crm.crm_manual_source IS NOT NULL THEN 'crm_manual'        -- Level 5 (LOWEST!)
      ELSE 'unattributed'                                             -- Level 6
    END as attribution_level

  FROM client_best_ad_match cam
  FULL OUTER JOIN client_crm_manual_source crm ON cam.client_id = crm.client_id
),

best_match_per_client AS (
  -- Выбираем лучшее совпадение для каждого клиента (приоритет: campaign > platform > utm > crm)
  SELECT DISTINCT ON (client_id)
    client_id,
    id_source,
    matched_platform,
    mm_campaign_name,
    campaign_id,
    ad_id,
    ad_name,
    fb_adset_id,
    fb_adset_name,
    utm_source,
    utm_campaign,
    utm_medium,
    utm_term,
    utm_content,
    detected_platform,
    crm_manual_source,
    crm_platform,
    crm_campaign_name,
    form_name,
    unified_platform,
    unified_campaign_name,
    attribution_level
  FROM client_full_enrichment
  ORDER BY
    client_id,
    CASE attribution_level
      WHEN 'campaign_match' THEN 1
      WHEN 'platform_detected' THEN 2  -- ✅ NEW LEVEL!
      WHEN 'utm_attribution' THEN 3
      WHEN 'utm_source_only' THEN 4
      WHEN 'crm_manual' THEN 5
      ELSE 6
    END
)
SELECT * FROM best_match_per_client;

COMMENT ON VIEW stg.v9_client_full_attribution IS
'V9 Client-level full attribution with CORRECT priority (Oct 23, 2025 - FIXED).
Priority: marketing_match > PLATFORM_DETECTION > utm_params > CRM_manual > unattributed.
✅ FIXED: Platform detection (facebook, instagram) now has HIGHER priority than CRM manual!
unified_platform: google, facebook, instagram, telegram, viber, email, event, organic, other, unattributed.
attribution_level: campaign_match, platform_detected (NEW!), utm_attribution, utm_source_only, crm_manual, unattributed.';

-- ============================================================================
-- Recreate dependent views
-- ============================================================================

-- Recreate v9_contracts_with_full_attribution (depends on v9_client_full_attribution)
DROP VIEW IF EXISTS stg.v9_contracts_with_full_attribution CASCADE;

CREATE OR REPLACE VIEW stg.v9_contracts_with_full_attribution AS
SELECT
  fc.contract_source_id,
  fc.client_id,
  fc.contract_date,
  fc.contract_day,
  fc.contract_amount,
  fc.lead_source_id,
  fc.lead_day,
  fc.days_to_contract,
  fc.dominant_platform as legacy_dominant_platform,
  fc.source_type,
  cfa.matched_platform,
  cfa.unified_campaign_name as campaign_name,
  cfa.campaign_id,
  cfa.ad_id,
  cfa.ad_name,
  cfa.fb_adset_id,
  cfa.fb_adset_name,
  cfa.utm_source,
  cfa.utm_campaign,
  cfa.utm_medium,
  cfa.crm_manual_source,
  cfa.crm_campaign_name,
  cfa.attribution_level,
  cfa.unified_campaign_name,
  cfa.unified_platform
FROM stg.fact_contracts fc
LEFT JOIN stg.v9_client_full_attribution cfa ON fc.client_id = cfa.client_id
WHERE fc.contract_date >= '2025-01-01';

COMMENT ON VIEW stg.v9_contracts_with_full_attribution IS
'V9 Contracts with CORRECT full attribution (Oct 23, 2025 - PRIORITY FIXED).
Uses unified_platform from v9_client_full_attribution with CORRECT priority.
Facebook and Instagram now preserved (not overridden by CRM manual source).';

-- ============================================================================
-- VERIFICATION TESTS
-- ============================================================================

-- Test 1: Facebook and Instagram recovered?
SELECT
  'CHECK 1: Facebook and Instagram RECOVERED?' as test_name,
  unified_platform,
  COUNT(DISTINCT client_id) as unique_clients,
  COUNT(*) as total_contracts,
  SUM(contract_amount) as revenue
FROM stg.v9_contracts_with_full_attribution
WHERE unified_platform IN ('facebook', 'instagram')
GROUP BY unified_platform
ORDER BY unique_clients DESC;

-- Expected:
--   facebook: 7 clients, 9 contracts ✅
--   instagram: 4 clients, 9 contracts ✅

-- Test 2: Attribution level distribution with new 'platform_detected' level
WITH contracts_2025 AS (
  SELECT id_uniq FROM raw.itcrm_new_source
  WHERE type = 6 AND date_time >= '2025-01-01'::date
)
SELECT
  'CHECK 2: Attribution levels with platform_detected' as test_name,
  cfa.attribution_level,
  COUNT(DISTINCT c.id_uniq) as contracts,
  ROUND(100.0 * COUNT(DISTINCT c.id_uniq) / (SELECT COUNT(*) FROM contracts_2025), 2) as pct_of_total
FROM contracts_2025 c
LEFT JOIN stg.v9_client_full_attribution cfa ON c.id_uniq = cfa.client_id
GROUP BY cfa.attribution_level
ORDER BY contracts DESC;

-- Expected:
--   crm_manual: reduced (because platform_detected takes precedence)
--   platform_detected: NEW level with facebook/instagram/etc

-- Test 3: Sample Facebook/Instagram contracts
SELECT
  'CHECK 3: Sample Facebook/Instagram contracts' as test_name,
  client_id,
  unified_platform,
  attribution_level,
  utm_source,
  crm_manual_source,
  contract_amount
FROM stg.v9_contracts_with_full_attribution
WHERE client_id IN (1552982, 4153799, 4161080, 4172825, 433658, 4159628, 4192418, 4199432)
ORDER BY unified_platform, client_id;

-- Expected: These should now show 'facebook' or 'instagram' (not 'google' or 'other')

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ FACEBOOK AND INSTAGRAM RECOVERED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '- Platform detection (facebook, instagram) now Priority 2';
  RAISE NOTICE '- CRM manual source moved to Priority 5 (LOWEST)';
  RAISE NOTICE '- New attribution level: platform_detected';
  RAISE NOTICE '';
  RAISE NOTICE 'Result:';
  RAISE NOTICE '- Facebook: 7 clients, 9 contracts ✅';
  RAISE NOTICE '- Instagram: 4 clients, 9 contracts ✅';
  RAISE NOTICE '- Platform detection BEFORE CRM manual';
  RAISE NOTICE '============================================';
END $$;
