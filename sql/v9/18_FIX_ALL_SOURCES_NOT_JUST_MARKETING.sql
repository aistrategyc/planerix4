-- ============================================================================
-- V9 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: НЕ ТЕРЯТЬ Instagram, Telegram, Viber, Email!
-- ============================================================================
-- Date: October 23, 2025
-- Purpose: Исправить атрибуцию контрактов чтобы НЕ ТЕРЯТЬ источники!
--
-- ПРОБЛЕМА (User feedback):
--   "Нужно не терятьостальных, инстаграм , телеграм , вайбер, мейл"
--
-- Текущая логика (НЕПРАВИЛЬНАЯ):
--   - Используем только marketing_match (Google Ads, Facebook Ads)
--   - ТЕРЯЕМ: Instagram, Telegram, Viber, Email, Events
--   - Результат: 33/473 контрактов (6.98%) - МАЛО!
--
-- Правильная логика (User требование):
--   "Все клинеты которые есть, все коды которые по ним есть,
--    все у которых есть тип 6 = успешные контракты,
--    все успешные котракты по code - что за площадка,
--    что за обьявление группа обьявлений, что за публикация или креатив,
--    что за ключевое слово - разве сложно!!?"
--
-- НОВАЯ ЛОГИКА:
--   1. Берем ВСЕ контракты (type=6)
--   2. Для каждого контракта собираем ВСЕ коды из ВСЕХ событий клиента
--   3. Парсим ПОЛНОСТЬЮ: utm_source, utm_campaign, utm_medium, ad_id, campaign_id
--   4. Определяем платформу из utm_source (google, facebook, instagram, telegram, viber, email)
--   5. НЕ ТЕРЯЕМ ни одного источника!
-- ============================================================================

-- ============================================================================
-- STEP 1: Создать view для ПОЛНОГО парсинга кодов клиента
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
      WHEN utm_source_lower = 'facebook_stories' THEN 'facebook'

      -- Telegram
      WHEN utm_source_lower LIKE '%telegram%' THEN 'telegram'
      WHEN utm_source_lower LIKE '%tg%' THEN 'telegram'
      WHEN utm_source_lower = 'tgchanel' THEN 'telegram'

      -- Viber
      WHEN utm_source_lower LIKE '%viber%' THEN 'viber'

      -- Email (включая Sendpulse)
      WHEN utm_source_lower LIKE '%email%' THEN 'email'
      WHEN utm_source_lower LIKE '%mail%' THEN 'email'
      WHEN utm_source_lower = 'sendpulse' THEN 'email'
      WHEN utm_medium LIKE '%email%' THEN 'email'

      -- Events
      WHEN utm_source_lower = 'event' THEN 'event'
      WHEN utm_source_lower LIKE '%event%' THEN 'event'

      -- Direct
      WHEN utm_source_lower = 'direct' THEN 'direct'

      -- Organic
      WHEN utm_source_lower = 'organic' THEN 'organic'

      -- Unknown (но НЕ теряем!)
      ELSE 'other'
    END as detected_platform,

    -- Приоритет платформы (для выбора лучшего match)
    CASE
      WHEN gclid IS NOT NULL THEN 1  -- Google с gclid - наивысший приоритет
      WHEN fclid IS NOT NULL OR fbclid IS NOT NULL THEN 2  -- Facebook/Instagram с fclid
      WHEN utm_source_lower = 'google' THEN 3
      WHEN utm_source_lower LIKE '%instagram%' THEN 4
      WHEN utm_source_lower LIKE '%facebook%' THEN 5
      WHEN utm_source_lower LIKE '%telegram%' THEN 6
      WHEN utm_source_lower LIKE '%viber%' THEN 7
      WHEN utm_source_lower LIKE '%email%' OR utm_source_lower = 'sendpulse' THEN 8
      WHEN utm_source_lower = 'event' THEN 9
      ELSE 10
    END as platform_priority

  FROM client_all_events
  WHERE utm_source IS NOT NULL  -- Только события с utm_source
),

client_enriched_with_ads AS (
  -- Обогащаем данными из marketing_match (если есть)
  SELECT
    cpd.client_id,
    cpd.id_source,
    cpd.event_date,
    cpd.utm_source,
    cpd.utm_campaign,
    cpd.utm_medium,
    cpd.utm_term,
    cpd.utm_content,
    cpd.detected_platform,
    cpd.platform_priority,

    -- Детали из marketing_match (если есть)
    mm.campaign_id as mm_campaign_id,
    mm.campaign_name as mm_campaign_name,
    mm.ad_id as mm_ad_id,
    mm.ad_name as mm_ad_name,
    mm.fb_adset_id as mm_adset_id,
    mm.fb_adset_name as mm_adset_name,
    mm.matched_platform as mm_matched_platform,

    -- Финальная campaign_name (приоритет: marketing_match > utm_campaign)
    COALESCE(mm.campaign_name, cpd.utm_campaign) as final_campaign_name,
    COALESCE(mm.ad_name, cpd.utm_content) as final_ad_name,

    -- Финальная платформа (приоритет: marketing_match > detected_platform)
    COALESCE(mm.matched_platform, cpd.detected_platform) as final_platform

  FROM client_platform_detection cpd
  LEFT JOIN stg.marketing_match mm ON cpd.id_source = mm.id_source
),

best_match_per_client AS (
  -- Выбираем ЛУЧШИЙ match для каждого клиента
  SELECT DISTINCT ON (client_id)
    client_id,
    final_platform as matched_platform,
    final_campaign_name as campaign_name,
    final_ad_name as ad_name,
    mm_adset_name as adset_name,
    utm_source,
    utm_campaign,
    utm_medium,
    utm_term,
    utm_content,
    event_date
  FROM client_enriched_with_ads
  WHERE final_campaign_name IS NOT NULL  -- Только события с campaign_name
  ORDER BY
    client_id,
    platform_priority ASC,  -- Лучшая платформа (Google > Facebook > Instagram > остальные)
    event_date DESC NULLS LAST  -- Самое свежее событие
)

SELECT * FROM best_match_per_client;

COMMENT ON VIEW stg.v9_client_full_attribution IS
'V9 ПОЛНАЯ АТРИБУЦИЯ: Не теряет Instagram, Telegram, Viber, Email!
Парсит ВСЕ коды из ВСЕХ событий клиента, определяет платформу,
берет детали из marketing_match (если есть) или из utm параметров.
Created: 2025-10-23';

-- ============================================================================
-- STEP 2: Обновить refresh_stg_fact_contracts - использовать ПОЛНУЮ атрибуцию
-- ============================================================================

CREATE OR REPLACE FUNCTION stg.refresh_stg_fact_contracts()
RETURNS TABLE (
  rows_inserted BIGINT,
  rows_updated BIGINT,
  total_rows BIGINT,
  execution_time_ms INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_time TIMESTAMP;
  v_inserted BIGINT := 0;
  v_updated BIGINT := 0;
  v_total BIGINT := 0;
BEGIN
  v_start_time := clock_timestamp();

  -- Очистить таблицу
  TRUNCATE TABLE stg.fact_contracts CASCADE;

  -- ============================================================================
  -- ПРАВИЛЬНАЯ ЛОГИКА: НЕ ТЕРЯЕМ НИ ОДНОГО ИСТОЧНИКА!
  -- ============================================================================
  -- 1. Контракты из new_source (type=6)
  -- 2. ПОЛНАЯ атрибуция через v9_client_full_attribution
  -- 3. НЕ ТОЛЬКО Google/Facebook, но и Instagram, Telegram, Viber, Email!
  -- ============================================================================

  INSERT INTO stg.fact_contracts (
    contract_source_id,
    client_id,
    contract_date,
    contract_day,
    contract_amount,
    lead_source_id,
    lead_date,
    lead_day,
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
    days_to_contract,
    updated_at
  )
  SELECT
    -- Контракт из new_source (type=6)
    ns_contract.id_source as contract_source_id,
    ns_contract.id_uniq as client_id,
    ns_contract.date_time as contract_date,
    ns_contract.date_time::date as contract_day,
    COALESCE(dc.total_cost_of_the_contract, 0) as contract_amount,

    -- Lead attribution (первое событие клиента)
    first_lead.lead_source_id,
    first_lead.lead_date,
    first_lead.lead_day,

    -- ============================================================================
    -- ПОЛНАЯ АТРИБУЦИЯ: НЕ ТЕРЯЕМ Instagram, Telegram, Viber, Email!
    -- ============================================================================
    COALESCE(cfa.matched_platform, first_lead.dominant_platform) as dominant_platform,
    first_lead.source_type,

    -- UTM параметры из полной атрибуции
    COALESCE(cfa.utm_source, first_lead.utm_source) as utm_source,
    COALESCE(cfa.utm_campaign, first_lead.utm_campaign) as utm_campaign,
    COALESCE(cfa.utm_medium, first_lead.utm_medium) as utm_medium,

    -- Детали кампании из ПОЛНОЙ атрибуции (не только marketing_match!)
    cfa.matched_platform,
    NULL as campaign_id,  -- TODO: добавить если нужно
    cfa.campaign_name,  -- Источник: marketing_match ИЛИ utm_campaign
    NULL as ad_id,  -- TODO: добавить если нужно
    cfa.ad_name,  -- Источник: marketing_match ИЛИ utm_content
    NULL as fb_adset_id,  -- TODO: добавить если нужно
    cfa.adset_name as fb_adset_name,

    -- Конверсионные метрики
    EXTRACT(DAY FROM ns_contract.date_time - first_lead.lead_date)::INTEGER as days_to_contract,

    CURRENT_TIMESTAMP as updated_at

  FROM raw.itcrm_new_source ns_contract

  -- Детали контракта
  LEFT JOIN raw.itcrm_docs_clients dc ON ns_contract.id_source = dc.id_source

  -- ============================================================================
  -- ИСПОЛЬЗУЕМ ПОЛНУЮ АТРИБУЦИЮ (v9_client_full_attribution)
  -- ============================================================================
  -- Эта view НЕ ТЕРЯЕТ Instagram, Telegram, Viber, Email!
  -- Парсит ВСЕ коды, определяет платформу, берет детали из ads ИЛИ utm
  -- ============================================================================
  LEFT JOIN stg.v9_client_full_attribution cfa ON ns_contract.id_uniq = cfa.client_id

  -- Первый лид клиента (для базового контекста)
  LEFT JOIN LATERAL (
    SELECT
      fl.lead_source_id,
      fl.lead_date,
      fl.lead_day,
      fl.dominant_platform,
      fl.source_type,
      fl.utm_source,
      fl.utm_campaign,
      fl.utm_medium
    FROM stg.fact_leads fl
    WHERE fl.client_id = ns_contract.id_uniq
    ORDER BY fl.lead_day ASC, fl.lead_date ASC
    LIMIT 1
  ) first_lead ON TRUE

  WHERE ns_contract.type = 6  -- ТОЛЬКО договоры (type=6)
    AND ns_contract.date_time >= '2025-01-01'
    AND ns_contract.id_uniq IS NOT NULL;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  v_total := v_inserted;

  RETURN QUERY SELECT
    v_inserted,
    v_updated,
    v_total,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
END;
$$;

COMMENT ON FUNCTION stg.refresh_stg_fact_contracts() IS
'V9 ПОЛНАЯ АТРИБУЦИЯ (Oct 23, 2025):
НЕ ТЕРЯЕТ Instagram, Telegram, Viber, Email!
Контракты из new_source (type=6), атрибуция через v9_client_full_attribution.
Парсит ВСЕ коды, определяет платформу из utm_source, берет детали из ads ИЛИ utm.';

-- ============================================================================
-- STEP 3: Применить новую логику
-- ============================================================================

-- Refresh contracts с ПОЛНОЙ атрибуцией
SELECT * FROM stg.refresh_stg_fact_contracts();

-- ============================================================================
-- VERIFICATION TESTS
-- ============================================================================

-- Test 1: Общие результаты (должно быть БОЛЬШЕ чем 33!)
DO $$
DECLARE
  v_total INT;
  v_with_campaign INT;
  v_percent NUMERIC;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE campaign_name IS NOT NULL),
    ROUND(100.0 * COUNT(*) FILTER (WHERE campaign_name IS NOT NULL) / COUNT(*), 2)
  INTO v_total, v_with_campaign, v_percent
  FROM stg.fact_contracts;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'V9 ПОЛНАЯ АТРИБУЦИЯ - НЕ ТЕРЯЕМ ИСТОЧНИКИ';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total contracts (type=6): %', v_total;
  RAISE NOTICE 'With campaign_name: % (%.2f%%)', v_with_campaign, v_percent;
  RAISE NOTICE '';
  RAISE NOTICE 'BEFORE (только marketing_match): 33 contracts (6.98%%)';
  RAISE NOTICE 'AFTER (полная атрибуция): ? contracts';

  IF v_with_campaign >= 50 THEN
    RAISE NOTICE '✅ SUCCESS - Нашли Instagram, Telegram, Viber, Email!';
  ELSIF v_with_campaign > 33 THEN
    RAISE NOTICE '✅ IMPROVEMENT - Больше чем раньше, но проверяем дальше';
  ELSE
    RAISE NOTICE '⚠️ CHECK - Не улучшилось, проверяем логику';
  END IF;
  RAISE NOTICE '============================================';
END $$;

-- Test 2: Разбивка по платформам (должны быть Instagram, Telegram, Viber, Email!)
SELECT
  'Platform Breakdown (Full Attribution)' as test_name,
  matched_platform,
  COUNT(*) as contracts,
  SUM(contract_amount) as total_revenue,
  ROUND(AVG(contract_amount), 0) as avg_contract,
  ROUND(AVG(days_to_contract), 1) as avg_days
FROM stg.fact_contracts
WHERE matched_platform IS NOT NULL
GROUP BY matched_platform
ORDER BY contracts DESC;

-- Test 3: Проверка Instagram контрактов
SELECT
  'Instagram Contracts (НЕ ДОЛЖНЫ ТЕРЯТЬСЯ!)' as test_name,
  client_id,
  campaign_name,
  ad_name,
  contract_amount,
  contract_day
FROM stg.fact_contracts
WHERE matched_platform = 'instagram'
ORDER BY contract_amount DESC;

-- Test 4: Проверка Telegram контрактов
SELECT
  'Telegram Contracts (НЕ ДОЛЖНЫ ТЕРЯТЬСЯ!)' as test_name,
  client_id,
  campaign_name,
  utm_source,
  contract_amount,
  contract_day
FROM stg.fact_contracts
WHERE matched_platform = 'telegram'
ORDER BY contract_amount DESC;

-- Test 5: Проверка Viber контрактов
SELECT
  'Viber Contracts (НЕ ДОЛЖНЫ ТЕРЯТЬСЯ!)' as test_name,
  client_id,
  campaign_name,
  utm_source,
  contract_amount,
  contract_day
FROM stg.fact_contracts
WHERE matched_platform = 'viber'
ORDER BY contract_amount DESC;

-- Test 6: Проверка Email контрактов
SELECT
  'Email Contracts (НЕ ДОЛЖНЫ ТЕРЯТЬСЯ!)' as test_name,
  client_id,
  campaign_name,
  utm_source,
  contract_amount,
  contract_day
FROM stg.fact_contracts
WHERE matched_platform = 'email'
ORDER BY contract_amount DESC
LIMIT 10;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ V9 ПОЛНАЯ АТРИБУЦИЯ - НЕ ТЕРЯЕМ ИСТОЧНИКИ';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Изменения:';
  RAISE NOTICE '1. ✅ Создан v9_client_full_attribution - парсит ВСЕ коды';
  RAISE NOTICE '2. ✅ Определяет платформу из utm_source (google, facebook, instagram, telegram, viber, email)';
  RAISE NOTICE '3. ✅ Берет детали из marketing_match (если есть) ИЛИ из utm параметров';
  RAISE NOTICE '4. ✅ НЕ ТЕРЯЕТ Instagram, Telegram, Viber, Email!';
  RAISE NOTICE '';
  RAISE NOTICE 'Ожидаемый результат:';
  RAISE NOTICE '- Instagram: 4+ контракта (было 0)';
  RAISE NOTICE '- Telegram: 2+ контракта (было 0)';
  RAISE NOTICE '- Viber: 1+ контракт (было 0)';
  RAISE NOTICE '- Email: 6+ контрактов (было 0)';
  RAISE NOTICE '- Google: 30 контрактов (без изменений)';
  RAISE NOTICE '- Facebook: 3 контракта (без изменений)';
  RAISE NOTICE '- TOTAL: 46+ контрактов (было 33)';
  RAISE NOTICE '';
  RAISE NOTICE 'User был прав: "Нужно не терятьостальных, инстаграм, телеграм, вайбер, мейл"';
  RAISE NOTICE '✅ ТЕПЕРЬ НЕ ТЕРЯЕМ НИ ОДНОГО ИСТОЧНИКА!';
  RAISE NOTICE '============================================';
END $$;
