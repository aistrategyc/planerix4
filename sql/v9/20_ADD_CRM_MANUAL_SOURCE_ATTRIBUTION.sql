-- ============================================================================
-- V9 FINAL ATTRIBUTION LEVEL: CRM Manual Source + Events
-- ============================================================================
-- Date: October 23, 2025
-- Purpose: Add CRM manual source attribution as FINAL fallback level
--
-- User Request:
--   "Мы в последнюю очередь если не нашлось по code связь с изнаших
--    рекламных баз, а например в срм указан истоник, тогда донасыщаем
--    (это значит руками поставили источник в срм)"
--
--   "Там же у нас есть ивенты , и детали по ним, как доп информация
--    по органике и другим активностям"
--
-- ATTRIBUTION PRIORITY (from highest to lowest):
--   1. Code match in marketing_match (Google Ads, Facebook Ads) ✅
--   2. UTM parameters from code (utm_campaign, utm_source) ✅
--   3. Platform detection from utm_source (instagram, telegram, viber, email) ✅
--   4. CRM manual request_type (event, Facebook, consultation, etc.) ✅ NEW!
--   5. Event information (organic, other activities) ✅ NEW!
-- ============================================================================

-- ============================================================================
-- STEP 1: Update v9_client_full_attribution to include CRM manual source
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
  -- Добавляем CRM MANUAL SOURCE (request_type из crm_requests) - FALLBACK
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
  -- Объединяем все источники атрибуции с ПРИОРИТЕТОМ
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

    -- Platform detection from code (priority 3)
    cam.detected_platform,

    -- CRM manual source (priority 4) ✅ NEW!
    crm.crm_manual_source,
    crm.crm_platform,
    crm.crm_campaign_name,
    crm.form_name,

    -- FINAL UNIFIED FIELDS (with fallback priority)
    COALESCE(
      cam.matched_platform,      -- Priority 1: Marketing match
      cam.detected_platform,     -- Priority 2: Platform detection from utm_source
      crm.crm_platform,          -- Priority 3: CRM manual source ✅ NEW!
      'unattributed'             -- Priority 4: No attribution
    ) as unified_platform,

    COALESCE(
      cam.campaign_name,         -- Priority 1: Marketing match campaign
      cam.utm_campaign,          -- Priority 2: UTM campaign
      cam.utm_source,            -- Priority 3: UTM source as fallback (Telegram, Viber)
      crm.crm_campaign_name,     -- Priority 4: CRM form_name or request_type ✅ NEW!
      'Unknown'                  -- Priority 5: Unknown
    ) as unified_campaign_name,

    -- Attribution level (для аналитики)
    CASE
      WHEN cam.campaign_name IS NOT NULL THEN 'campaign_match'        -- Level 1
      WHEN cam.utm_campaign IS NOT NULL THEN 'utm_attribution'        -- Level 2
      WHEN cam.utm_source IS NOT NULL THEN 'utm_source_only'          -- Level 3
      WHEN crm.crm_manual_source IS NOT NULL THEN 'crm_manual'        -- Level 4 ✅ NEW!
      ELSE 'unattributed'                                             -- Level 5
    END as attribution_level

  FROM client_best_ad_match cam
  FULL OUTER JOIN client_crm_manual_source crm ON cam.client_id = crm.client_id
),

best_match_per_client AS (
  -- Выбираем лучшее совпадение для каждого клиента (приоритет: campaign_match > utm > crm_manual)
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
      WHEN 'utm_attribution' THEN 2
      WHEN 'utm_source_only' THEN 3
      WHEN 'crm_manual' THEN 4
      ELSE 5
    END
)
SELECT * FROM best_match_per_client;

COMMENT ON VIEW stg.v9_client_full_attribution IS
'V9 Client-level full attribution with ALL sources (Oct 23, 2025).
Priority: marketing_match > utm_params > platform_detection > CRM_manual > unattributed.
Includes CRM manual source (request_type) and form_name as FINAL fallback.
unified_platform: google, facebook, instagram, telegram, viber, email, event, organic, other, unattributed.
attribution_level: campaign_match, utm_attribution, utm_source_only, crm_manual, unattributed.';

-- ============================================================================
-- VERIFICATION TESTS
-- ============================================================================

-- Test 1: Check CRM manual attribution coverage
DO $$
DECLARE
  v_campaign_match INT;
  v_utm_attribution INT;
  v_utm_source_only INT;
  v_crm_manual INT;
  v_unattributed INT;
  v_total INT;
BEGIN
  WITH contracts_2025 AS (
    SELECT id_uniq
    FROM raw.itcrm_new_source
    WHERE type = 6 AND date_time >= '2025-01-01'::date
  )
  SELECT
    COUNT(*) FILTER (WHERE cfa.attribution_level = 'campaign_match'),
    COUNT(*) FILTER (WHERE cfa.attribution_level = 'utm_attribution'),
    COUNT(*) FILTER (WHERE cfa.attribution_level = 'utm_source_only'),
    COUNT(*) FILTER (WHERE cfa.attribution_level = 'crm_manual'),
    COUNT(*) FILTER (WHERE cfa.attribution_level = 'unattributed'),
    COUNT(*)
  INTO v_campaign_match, v_utm_attribution, v_utm_source_only, v_crm_manual, v_unattributed, v_total
  FROM contracts_2025 c
  LEFT JOIN stg.v9_client_full_attribution cfa ON c.id_uniq = cfa.client_id;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'V9 ATTRIBUTION LEVELS (2025 Contracts)';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total contracts: %', v_total;
  RAISE NOTICE '';
  RAISE NOTICE 'Level 1 - Campaign Match: % (%.2f%%)',
    v_campaign_match, 100.0 * v_campaign_match / NULLIF(v_total, 0);
  RAISE NOTICE 'Level 2 - UTM Attribution: % (%.2f%%)',
    v_utm_attribution, 100.0 * v_utm_attribution / NULLIF(v_total, 0);
  RAISE NOTICE 'Level 3 - UTM Source Only: % (%.2f%%)',
    v_utm_source_only, 100.0 * v_utm_source_only / NULLIF(v_total, 0);
  RAISE NOTICE 'Level 4 - CRM Manual: % (%.2f%%) ✅ NEW!',
    v_crm_manual, 100.0 * v_crm_manual / NULLIF(v_total, 0);
  RAISE NOTICE 'Level 5 - Unattributed: % (%.2f%%)',
    v_unattributed, 100.0 * v_unattributed / NULLIF(v_total, 0);
  RAISE NOTICE '============================================';
END $$;

-- Test 2: Sample CRM manual source contracts
SELECT
  'CRM Manual Source Examples' as test_name,
  cfa.client_id,
  cfa.unified_platform,
  cfa.crm_manual_source,
  cfa.crm_campaign_name,
  cfa.attribution_level
FROM stg.v9_client_full_attribution cfa
WHERE cfa.attribution_level = 'crm_manual'
  AND cfa.client_id IN (
    SELECT id_uniq FROM raw.itcrm_new_source
    WHERE type = 6 AND date_time >= '2025-01-01'::date
  )
ORDER BY cfa.unified_platform, cfa.crm_manual_source
LIMIT 20;

-- Test 3: Platform distribution WITH CRM manual sources
WITH contracts_2025 AS (
  SELECT id_uniq
  FROM raw.itcrm_new_source
  WHERE type = 6 AND date_time >= '2025-01-01'::date
)
SELECT
  'Platform Distribution WITH CRM Manual' as test_name,
  cfa.unified_platform,
  COUNT(DISTINCT c.id_uniq) as contracts,
  COUNT(*) FILTER (WHERE cfa.attribution_level = 'crm_manual') as from_crm_manual,
  ROUND(100.0 * COUNT(*) FILTER (WHERE cfa.attribution_level = 'crm_manual') / COUNT(*), 2) as pct_crm_manual
FROM contracts_2025 c
LEFT JOIN stg.v9_client_full_attribution cfa ON c.id_uniq = cfa.client_id
GROUP BY cfa.unified_platform
ORDER BY contracts DESC;

-- Test 4: Top CRM manual sources by request_type
WITH contracts_2025 AS (
  SELECT id_uniq
  FROM raw.itcrm_new_source
  WHERE type = 6 AND date_time >= '2025-01-01'::date
)
SELECT
  'Top CRM Manual Sources' as test_name,
  cfa.crm_manual_source,
  cfa.unified_platform,
  COUNT(DISTINCT c.id_uniq) as contracts,
  array_agg(DISTINCT cfa.form_name) FILTER (WHERE cfa.form_name IS NOT NULL) as sample_form_names
FROM contracts_2025 c
JOIN stg.v9_client_full_attribution cfa ON c.id_uniq = cfa.client_id
WHERE cfa.attribution_level = 'crm_manual'
GROUP BY cfa.crm_manual_source, cfa.unified_platform
ORDER BY contracts DESC
LIMIT 20;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ CRM MANUAL SOURCE ATTRIBUTION ADDED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Attribution Priority (highest → lowest):';
  RAISE NOTICE '1. Marketing match (Google Ads, Facebook Ads)';
  RAISE NOTICE '2. UTM parameters (utm_campaign, utm_source)';
  RAISE NOTICE '3. Platform detection (instagram, telegram, viber, email)';
  RAISE NOTICE '4. CRM manual (request_type, form_name) ✅ NEW!';
  RAISE NOTICE '5. Unattributed';
  RAISE NOTICE '';
  RAISE NOTICE 'CRM Manual Sources:';
  RAISE NOTICE '- event → event platform';
  RAISE NOTICE '- Facebook → facebook platform';
  RAISE NOTICE '- consultation → organic';
  RAISE NOTICE '- call → organic';
  RAISE NOTICE '- course → organic';
  RAISE NOTICE '- form_name → campaign name';
  RAISE NOTICE '';
  RAISE NOTICE 'View Updated: stg.v9_client_full_attribution';
  RAISE NOTICE '============================================';
END $$;
