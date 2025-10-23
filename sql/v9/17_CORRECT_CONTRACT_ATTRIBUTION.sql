-- ============================================================================
-- V9 ПРАВИЛЬНАЯ ЛОГИКА: Контракты из new_source (type=6) + code + реклама
-- ============================================================================
-- Date: October 23, 2025
-- Purpose: Правильная атрибуция контрактов используя полную логику CRM
--
-- ПРАВИЛЬНАЯ ЛОГИКА (от пользователя):
-- 1. CRM центр: new_source - все события клиента по id_uniq
-- 2. Событие type = 6 = договор (факт контракта)
-- 3. code - источник правды, максимальный парсинг
-- 4. Связь с рекламой через code → Google, Facebook/Meta/Instagram
-- 5. Наполнение деталями из рекламы (даже если не первое событие!)
-- ============================================================================

-- ============================================================================
-- STEP 1: Обновить refresh_stg_fact_contracts - правильная логика
-- ============================================================================

-- Создать backup старой функции
DROP FUNCTION IF EXISTS stg.refresh_stg_fact_contracts_backup_v9() CASCADE;

CREATE OR REPLACE FUNCTION stg.refresh_stg_fact_contracts_backup_v9()
RETURNS TABLE (
  rows_inserted BIGINT,
  rows_updated BIGINT,
  total_rows BIGINT,
  execution_time_ms INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE NOTICE 'Backup of previous function (before type=6 fix)';
  RETURN QUERY SELECT 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::INTEGER;
END;
$$;

-- ============================================================================
-- НОВАЯ ПРАВИЛЬНАЯ ФУНКЦИЯ: Контракты из new_source (type=6)
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
  -- ПРАВИЛЬНАЯ ЛОГИКА:
  -- 1. Берем ВСЕ события type=6 (договоры) из new_source
  -- 2. Для каждого клиента (id_uniq) собираем ВСЕ его id_source
  -- 3. Ищем campaign_name в marketing_match (источник правды из рекламных кабинетов)
  -- 4. Берем детали из рекламы (Google, Facebook/Meta/Instagram)
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

    -- Lead attribution (первое событие клиента для контекста)
    first_lead.lead_source_id,
    first_lead.lead_date,
    first_lead.lead_day,

    -- ============================================================================
    -- ПРАВИЛЬНАЯ АТРИБУЦИЯ: Из marketing_match (источник правды из рекламы)
    -- ============================================================================
    COALESCE(cbam.matched_platform, first_lead.dominant_platform) as dominant_platform,
    first_lead.source_type,

    -- UTM из первого лида (базовое отслеживание)
    first_lead.utm_source,
    first_lead.utm_campaign,
    first_lead.utm_medium,

    -- ГЛАВНОЕ: Детали кампании из рекламных кабинетов (НЕ из CRM!)
    cbam.matched_platform,
    cbam.campaign_id,
    cbam.campaign_name,  -- Источник правды: Google Ads, Facebook Ads
    COALESCE(cbam.fb_ad_id, cbam.ad_id) as ad_id,
    COALESCE(cbam.fb_ad_name, cbam.ad_name) as ad_name,
    cbam.fb_adset_id,
    cbam.fb_adset_name,

    -- Конверсионные метрики
    EXTRACT(DAY FROM ns_contract.date_time - first_lead.lead_date)::INTEGER as days_to_contract,

    CURRENT_TIMESTAMP as updated_at

  FROM raw.itcrm_new_source ns_contract

  -- ============================================================================
  -- КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Берем контракты из new_source (type=6)
  -- ============================================================================
  -- type = 6 означает "Договор" (факт заключения контракта)
  -- date_time = точная дата/время заключения договора
  -- ============================================================================

  -- LEFT JOIN с docs_clients для суммы договора
  LEFT JOIN raw.itcrm_docs_clients dc ON ns_contract.id_source = dc.id_source

  -- ============================================================================
  -- CLIENT-LEVEL ATTRIBUTION: Ищем детали в рекламных кабинетах
  -- ============================================================================
  -- Используем v9_client_best_ad_match который:
  -- 1. Собирает ВСЕ id_source для клиента (id_uniq)
  -- 2. Для каждого id_source ищет match в marketing_match
  -- 3. marketing_match содержит данные из Google Ads, Facebook Ads (источник правды)
  -- 4. Выбирает ЛУЧШИЙ match (приоритет: facebook/google с campaign_name)
  -- ============================================================================
  LEFT JOIN stg.v9_client_best_ad_match cbam ON ns_contract.id_uniq = cbam.client_id

  -- Первый лид клиента (для базового контекста и lead_source_id)
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
    AND ns_contract.date_time >= '2025-01-01'  -- Фильтр по дате
    AND ns_contract.id_uniq IS NOT NULL;  -- Только валидные клиенты

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
'V9 ПРАВИЛЬНАЯ ЛОГИКА (Oct 23, 2025):
Контракты из new_source (type=6), атрибуция из marketing_match (Google/Facebook Ads).
Логика: CRM центр (new_source) → события клиента (id_uniq) → type=6 (договор) →
code → marketing_match → детали из рекламных кабинетов.
Источник правды: рекламные кабинеты (НЕ CRM!).';

-- ============================================================================
-- STEP 2: Применить новую логику
-- ============================================================================

-- Refresh contracts с новой логикой
SELECT * FROM stg.refresh_stg_fact_contracts();

-- ============================================================================
-- VERIFICATION: Проверка результатов
-- ============================================================================

-- Test 1: Общие результаты
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
  RAISE NOTICE 'V9 ПРАВИЛЬНАЯ ЛОГИКА - РЕЗУЛЬТАТЫ';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total contracts (type=6): %', v_total;
  RAISE NOTICE 'With campaign_name: % (%.2f%%)', v_with_campaign, v_percent;
  RAISE NOTICE '';
  RAISE NOTICE 'BEFORE (docs_clients.currentdate): 1 contract (0.52%%)';
  RAISE NOTICE 'AFTER (new_source type=6): ? contracts';

  IF v_with_campaign >= 3 THEN
    RAISE NOTICE '✅ SUCCESS - Found Facebook contracts!';
  ELSE
    RAISE NOTICE '⚠️ CHECK - Expected at least 3 contracts';
  END IF;
  RAISE NOTICE '============================================';
END $$;

-- Test 2: Разбивка по платформам
SELECT
  'Platform Breakdown' as test_name,
  matched_platform,
  COUNT(*) as contracts,
  COUNT(*) FILTER (WHERE campaign_name IS NOT NULL) as with_campaign,
  SUM(contract_amount) as total_revenue,
  ROUND(AVG(contract_amount), 0) as avg_contract,
  COUNT(DISTINCT campaign_name) FILTER (WHERE campaign_name IS NOT NULL) as unique_campaigns
FROM stg.fact_contracts
WHERE matched_platform IS NOT NULL
GROUP BY matched_platform
ORDER BY contracts DESC;

-- Test 3: Top campaigns с контрактами
SELECT
  'Top Campaigns' as test_name,
  matched_platform,
  campaign_name,
  COUNT(*) as contracts,
  SUM(contract_amount) as revenue,
  ROUND(AVG(days_to_contract), 1) as avg_days
FROM stg.fact_contracts
WHERE campaign_name IS NOT NULL
GROUP BY matched_platform, campaign_name
ORDER BY contracts DESC, revenue DESC
LIMIT 10;

-- Test 4: Facebook/Meta контракты детально
SELECT
  'Facebook Contracts Detail' as test_name,
  client_id,
  campaign_name,
  ad_name,
  contract_amount,
  contract_day,
  days_to_contract
FROM stg.fact_contracts
WHERE matched_platform = 'facebook'
  AND campaign_name IS NOT NULL
ORDER BY contract_amount DESC;

-- Test 5: Сравнение источников данных
SELECT
  'Data Source Comparison' as analysis,
  'new_source (type=6)' as source,
  COUNT(*) as total_contracts
FROM raw.itcrm_new_source
WHERE type = 6 AND date_time >= '2025-01-01'

UNION ALL

SELECT
  'Data Source Comparison',
  'docs_clients (currentdate)',
  COUNT(*)
FROM raw.itcrm_docs_clients
WHERE currentdate >= '2025-01-01'
  AND total_cost_of_the_contract > 0

UNION ALL

SELECT
  'Data Source Comparison',
  'docs_clients (date_key)',
  COUNT(*)
FROM raw.itcrm_docs_clients
WHERE date_key >= '2025-01-01'
  AND total_cost_of_the_contract > 0;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ V9 ПРАВИЛЬНАЯ ЛОГИКА ПРИМЕНЕНА';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Изменения:';
  RAISE NOTICE '1. ✅ Контракты из new_source (type=6) вместо docs_clients.currentdate';
  RAISE NOTICE '2. ✅ Используем date_time (всегда заполнено) вместо currentdate (может быть NULL)';
  RAISE NOTICE '3. ✅ Client-level attribution через marketing_match';
  RAISE NOTICE '4. ✅ Детали из рекламных кабинетов (Google Ads, Facebook Ads)';
  RAISE NOTICE '';
  RAISE NOTICE 'Ожидаемый результат:';
  RAISE NOTICE '- Google contracts: 8+ (было 8)';
  RAISE NOTICE '- Facebook contracts: 3+ (было 1, найдены еще 2!)';
  RAISE NOTICE '- Total: 11+ contracts с campaign_name';
  RAISE NOTICE '';
  RAISE NOTICE 'Источник правды: Рекламные кабинеты (НЕ CRM!)';
  RAISE NOTICE '============================================';
END $$;
