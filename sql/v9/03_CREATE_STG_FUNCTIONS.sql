-- ============================================================================
-- V9 ANALYTICS: CREATE STG FUNCTIONS
-- ============================================================================
-- Цель: Создать функции для ETL процессов из raw в stg
-- Дата: 22 октября 2025
-- ============================================================================

-- ФУНКЦИЯ 1: refresh_stg_crm_events()
-- Цель: Обновить stg.crm_events из raw.itcrm_new_source
-- ============================================================================
CREATE OR REPLACE FUNCTION stg.refresh_stg_crm_events()
RETURNS TABLE(
  rows_inserted BIGINT,
  rows_updated BIGINT,
  rows_total BIGINT,
  execution_time_ms INTEGER
) AS $$
DECLARE
  v_start_time TIMESTAMP;
  v_inserted BIGINT := 0;
  v_updated BIGINT := 0;
  v_total BIGINT := 0;
BEGIN
  v_start_time := clock_timestamp();

  -- Очистить таблицу (для full refresh)
  TRUNCATE TABLE stg.crm_events CASCADE;

  -- Вставить данные из raw
  INSERT INTO stg.crm_events (
    id_source,
    client_id,
    event_date,
    event_day,
    event_type_id,
    event_type_name,
    is_first_touch,
    is_contract,
    is_rejection,
    is_no_answer,
    contract_amount,
    contract_date,
    id_user,
    updated_at
  )
  SELECT
    ns.id_source,
    ns.id_uniq as client_id,
    ns.date_time as event_date,
    ns.days as event_day,
    ns.type as event_type_id,
    nt.types_descr as event_type_name,

    -- Определение первого касания (критично!)
    ROW_NUMBER() OVER (PARTITION BY ns.id_uniq ORDER BY ns.date_time) = 1 as is_first_touch,

    -- Флаги
    ns.dogovor = 1 as is_contract,
    ns.rejection = 1 as is_rejection,
    ns.no_answer = 1 as is_no_answer,

    -- Сумма договора (если есть)
    CASE
      WHEN ns.dogovor = 1 THEN dc.total_cost_of_the_contract
      ELSE NULL
    END as contract_amount,

    CASE
      WHEN ns.dogovor = 1 THEN ns.days
      ELSE NULL
    END as contract_date,

    ns.id_user,
    ns.updated_at

  FROM raw.itcrm_new_source ns
  LEFT JOIN raw.itcrm_new_types nt ON ns.type = nt.id_type
  LEFT JOIN raw.itcrm_docs_clients dc ON (
    ns.id_source = dc.id_source AND
    ns.dogovor = 1
  )
  WHERE ns.date_time >= '2025-01-01'  -- Фильтр для производительности
    AND ns.id_uniq IS NOT NULL
    AND ns.date_time IS NOT NULL;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  v_total := v_inserted;

  -- Вернуть статистику
  RETURN QUERY SELECT
    v_inserted,
    v_updated,
    v_total,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION stg.refresh_stg_crm_events() IS 'V9: Полное обновление stg.crm_events из raw.itcrm_new_source с определением первого касания';

-- ============================================================================
-- ФУНКЦИЯ 2: refresh_stg_source_attribution()
-- Цель: Обновить stg.source_attribution (распарсить code JSONB)
-- ============================================================================
CREATE OR REPLACE FUNCTION stg.refresh_stg_source_attribution()
RETURNS TABLE(
  rows_inserted BIGINT,
  rows_updated BIGINT,
  rows_total BIGINT,
  execution_time_ms INTEGER
) AS $$
DECLARE
  v_start_time TIMESTAMP;
  v_inserted BIGINT := 0;
  v_updated BIGINT := 0;
  v_total BIGINT := 0;
BEGIN
  v_start_time := clock_timestamp();

  -- Очистить таблицу
  TRUNCATE TABLE stg.source_attribution CASCADE;

  -- Вставить распарсенные данные
  INSERT INTO stg.source_attribution (
    id_source,
    fbclid,
    fclid,
    gclid,
    utm_source,
    utm_campaign,
    utm_medium,
    utm_term,
    utm_content,
    dominant_platform,
    source_type,
    phone,
    email,
    internet_request_id,
    event_id,
    form_id,
    request_created_at
  )
  SELECT
    ce.id_source,

    -- JSONB parsing из itcrm_analytics
    ia.code->>'fbclid' as fbclid,
    ia.code->>'fclid' as fclid,
    ia.code->>'gclid' as gclid,
    ia.code->>'utm_source' as utm_source,
    ia.code->>'utm_campaign' as utm_campaign,
    ia.code->>'utm_medium' as utm_medium,
    ia.code->>'utm_term' as utm_term,
    ia.code->>'utm_content' as utm_content,

    -- Определение платформы (приоритет: fbclid > gclid > utm_source)
    CASE
      WHEN ia.code->>'fbclid' IS NOT NULL OR ia.code->>'fclid' IS NOT NULL THEN 'facebook'
      WHEN ia.code->>'gclid' IS NOT NULL THEN 'google'
      WHEN LOWER(ia.code->>'utm_source') = 'viber' THEN 'viber'
      WHEN LOWER(ia.code->>'utm_source') = 'telegram' THEN 'telegram'
      WHEN LOWER(ia.code->>'utm_source') = 'tiktok' THEN 'tiktok'
      WHEN LOWER(ia.code->>'utm_source') LIKE '%email%' THEN 'email'
      WHEN LOWER(ia.code->>'utm_source') = 'facebook' OR LOWER(ia.code->>'utm_source') = 'fb' THEN 'facebook'
      WHEN LOWER(ia.code->>'utm_source') = 'google' OR LOWER(ia.code->>'utm_source') = 'an' THEN 'google'
      WHEN ia.email IS NOT NULL AND ia.email != '' AND ia.email LIKE '%@%' THEN 'email'
      WHEN irr.id_request IS NOT NULL THEN 'internet_request'
      WHEN er.id_event IS NOT NULL THEN 'event'
      ELSE 'direct'
    END as dominant_platform,

    -- Тип источника
    CASE
      WHEN irr.id_request IS NOT NULL THEN 'internet_request'
      WHEN er.id_event IS NOT NULL THEN 'event'
      WHEN nf.form_id IS NOT NULL THEN 'form'
      ELSE 'direct'
    END as source_type,

    -- Contact info
    ia.phone,
    ia.email,

    -- Связи
    irr.id_request as internet_request_id,
    er.id_event as event_id,
    nf.form_id,
    ia.request_created_at

  FROM stg.crm_events ce

  -- Связь через internet_request
  LEFT JOIN raw.itcrm_internet_request_relation irr ON ce.id_source = irr.id_source
  LEFT JOIN raw.itcrm_analytics ia ON irr.id_request = ia.internet_request_id

  -- Связь через event
  LEFT JOIN raw.itcrm_events_relations er ON ce.id_source = er.id_source

  -- Связь через form
  LEFT JOIN raw.itcrm_new_form nf ON ce.id_source = nf.id_source;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  v_total := v_inserted;

  -- Вернуть статистику
  RETURN QUERY SELECT
    v_inserted,
    v_updated,
    v_total,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION stg.refresh_stg_source_attribution() IS 'V9: Обновление stg.source_attribution с парсингом JSONB code и определением платформы';

-- ============================================================================
-- ФУНКЦИЯ 3: refresh_stg_marketing_match()
-- Цель: Обновить stg.marketing_match (связь с рекламными кампаниями)
-- ============================================================================
CREATE OR REPLACE FUNCTION stg.refresh_stg_marketing_match()
RETURNS TABLE(
  rows_inserted BIGINT,
  rows_updated BIGINT,
  rows_total BIGINT,
  execution_time_ms INTEGER
) AS $$
DECLARE
  v_start_time TIMESTAMP;
  v_inserted BIGINT := 0;
  v_updated BIGINT := 0;
  v_total BIGINT := 0;
BEGIN
  v_start_time := clock_timestamp();

  -- Очистить таблицу
  TRUNCATE TABLE stg.marketing_match CASCADE;

  -- Вставить matched данные
  INSERT INTO stg.marketing_match (
    id_source,
    matched_platform,
    fb_campaign_id,
    fb_campaign_name,
    fb_adset_id,
    fb_adset_name,
    fb_ad_id,
    fb_ad_name,
    google_campaign_id,
    google_campaign_name,
    google_ad_group_id,
    google_ad_group_name,
    campaign_id,
    campaign_name,
    ad_id,
    ad_name
  )
  SELECT
    attr.id_source,

    -- Определенная платформа после маппинга
    CASE
      WHEN fb_map.campaign_id IS NOT NULL THEN 'facebook'
      WHEN google_clicks.campaign_id IS NOT NULL THEN 'google'
      ELSE NULL
    END as matched_platform,

    -- Facebook details
    fb_map.campaign_id::text as fb_campaign_id,
    fb_campaigns.name as fb_campaign_name,
    fb_map.adset_id::text as fb_adset_id,
    fb_adsets.name as fb_adset_name,
    fb_map.ad_id::text as fb_ad_id,
    fb_ads.name as fb_ad_name,

    -- Google details
    google_clicks.campaign_id::text as google_campaign_id,
    google_names.campaign_name as google_campaign_name,
    google_clicks.ad_group_id::text as google_ad_group_id,
    google_names.ad_group_name as google_ad_group_name,

    -- Unified fields
    COALESCE(fb_map.campaign_id::text, google_clicks.campaign_id::text) as campaign_id,
    COALESCE(fb_campaigns.name, google_names.campaign_name) as campaign_name,
    COALESCE(fb_map.ad_id::text, google_clicks.ad_group_id::text) as ad_id,
    COALESCE(fb_ads.name, google_names.ad_group_name) as ad_name

  FROM stg.source_attribution attr

  -- Facebook match (3 способа)
  LEFT JOIN raw.fb_leads ON (
    attr.fbclid = fb_leads.fbclid OR
    attr.fclid = fb_leads.fclid OR
    (attr.utm_term IS NOT NULL AND attr.utm_term ~ '^\d{15,}$' AND attr.utm_term = fb_leads.ad_id::text)
  )
  LEFT JOIN raw.fb_ad_map fb_map ON fb_leads.ad_id = fb_map.ad_id
  LEFT JOIN raw.fb_campaigns ON fb_map.campaign_id = fb_campaigns.id
  LEFT JOIN raw.fb_adsets ON fb_map.adset_id = fb_adsets.id
  LEFT JOIN raw.fb_ads ON fb_map.ad_id = fb_ads.id

  -- Google match
  LEFT JOIN raw.google_ads_clicks google_clicks ON attr.gclid = google_clicks.gclid
  LEFT JOIN raw.google_ads_names google_names ON (
    google_clicks.campaign_id = google_names.campaign_id AND
    google_clicks.ad_group_id = google_names.ad_group_id
  )

  WHERE attr.dominant_platform IN ('facebook', 'google');  -- Только для маркетинговых источников

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  v_total := v_inserted;

  -- Вернуть статистику
  RETURN QUERY SELECT
    v_inserted,
    v_updated,
    v_total,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION stg.refresh_stg_marketing_match() IS 'V9: Обновление stg.marketing_match с связью CRM событий к рекламным кампаниям FB/Google';

-- ============================================================================
-- ФУНКЦИЯ 4: refresh_stg_fact_leads()
-- Цель: Обновить stg.fact_leads (объединенные лиды)
-- ============================================================================
CREATE OR REPLACE FUNCTION stg.refresh_stg_fact_leads()
RETURNS TABLE(
  rows_inserted BIGINT,
  rows_updated BIGINT,
  rows_total BIGINT,
  execution_time_ms INTEGER
) AS $$
DECLARE
  v_start_time TIMESTAMP;
  v_inserted BIGINT := 0;
  v_updated BIGINT := 0;
  v_total BIGINT := 0;
BEGIN
  v_start_time := clock_timestamp();

  -- Очистить таблицу
  TRUNCATE TABLE stg.fact_leads CASCADE;

  -- Вставить лиды (только первые касания!)
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
    utm_term,
    matched_platform,
    campaign_id,
    campaign_name,
    ad_id,
    ad_name,
    fb_adset_id,
    fb_adset_name,
    phone,
    email,
    updated_at
  )
  SELECT
    crm.id_source as lead_source_id,
    crm.client_id,
    crm.event_date as lead_date,
    crm.event_day as lead_day,
    crm.event_type_name as lead_event_type,

    -- Attribution
    attr.dominant_platform,
    attr.source_type,
    attr.utm_source,
    attr.utm_campaign,
    attr.utm_medium,
    attr.utm_term,

    -- Marketing match
    match.matched_platform,
    match.campaign_id,
    match.campaign_name,
    match.ad_id,
    match.ad_name,
    match.fb_adset_id,
    match.fb_adset_name,

    -- Contact info
    attr.phone,
    attr.email,

    crm.updated_at

  FROM stg.crm_events crm
  INNER JOIN stg.source_attribution attr ON crm.id_source = attr.id_source
  LEFT JOIN stg.marketing_match match ON crm.id_source = match.id_source

  WHERE crm.is_first_touch = TRUE;  -- Только первые касания!

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  v_total := v_inserted;

  -- Вернуть статистику
  RETURN QUERY SELECT
    v_inserted,
    v_updated,
    v_total,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION stg.refresh_stg_fact_leads() IS 'V9: Обновление stg.fact_leads - единая таблица лидов с полной атрибуцией';

-- ============================================================================
-- ФУНКЦИЯ 5: refresh_stg_fact_contracts()
-- Цель: Обновить stg.fact_contracts (договоры с first touch атрибуцией)
-- ============================================================================
CREATE OR REPLACE FUNCTION stg.refresh_stg_fact_contracts()
RETURNS TABLE(
  rows_inserted BIGINT,
  rows_updated BIGINT,
  rows_total BIGINT,
  execution_time_ms INTEGER
) AS $$
DECLARE
  v_start_time TIMESTAMP;
  v_inserted BIGINT := 0;
  v_updated BIGINT := 0;
  v_total BIGINT := 0;
BEGIN
  v_start_time := clock_timestamp();

  -- Очистить таблицу
  TRUNCATE TABLE stg.fact_contracts CASCADE;

  -- Вставить договоры с first touch атрибуцией
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
    contract_event.id_source as contract_source_id,
    contract_event.client_id,
    contract_event.event_date as contract_date,
    contract_event.event_day as contract_day,
    contract_event.contract_amount,

    -- FIRST TOUCH ATTRIBUTION (критично!)
    first_lead.lead_source_id,
    first_lead.lead_date,
    first_lead.lead_day,
    first_lead.dominant_platform,
    first_lead.source_type,
    first_lead.utm_source,
    first_lead.utm_campaign,
    first_lead.utm_medium,
    first_lead.matched_platform,
    first_lead.campaign_id,
    first_lead.campaign_name,
    first_lead.ad_id,
    first_lead.ad_name,
    first_lead.fb_adset_id,
    first_lead.fb_adset_name,

    -- Conversion metrics
    EXTRACT(DAY FROM contract_event.event_date - first_lead.lead_date)::INTEGER as days_to_contract,

    contract_event.updated_at

  FROM stg.crm_events contract_event
  INNER JOIN stg.fact_leads first_lead ON (
    contract_event.client_id = first_lead.client_id
  )
  WHERE contract_event.is_contract = TRUE
    AND contract_event.contract_amount > 0;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  v_total := v_inserted;

  -- Вернуть статистику
  RETURN QUERY SELECT
    v_inserted,
    v_updated,
    v_total,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION stg.refresh_stg_fact_contracts() IS 'V9: Обновление stg.fact_contracts - договоры с FIRST TOUCH атрибуцией к источникам';

-- ============================================================================
-- ФУНКЦИЯ 6: refresh_all_stg_tables()
-- Цель: Обновить все таблицы stg в правильном порядке
-- ============================================================================
CREATE OR REPLACE FUNCTION stg.refresh_all_stg_tables()
RETURNS TABLE(
  step_name TEXT,
  rows_processed BIGINT,
  execution_time_ms INTEGER,
  status TEXT
) AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- Step 1: CRM Events
  RAISE NOTICE '[1/5] Refreshing stg.crm_events...';
  SELECT * FROM stg.refresh_stg_crm_events() INTO v_result;
  RETURN QUERY SELECT
    '1. CRM Events'::TEXT,
    v_result.rows_total,
    v_result.execution_time_ms,
    'SUCCESS'::TEXT;

  -- Step 2: Source Attribution
  RAISE NOTICE '[2/5] Refreshing stg.source_attribution...';
  SELECT * FROM stg.refresh_stg_source_attribution() INTO v_result;
  RETURN QUERY SELECT
    '2. Source Attribution'::TEXT,
    v_result.rows_total,
    v_result.execution_time_ms,
    'SUCCESS'::TEXT;

  -- Step 3: Marketing Match
  RAISE NOTICE '[3/5] Refreshing stg.marketing_match...';
  SELECT * FROM stg.refresh_stg_marketing_match() INTO v_result;
  RETURN QUERY SELECT
    '3. Marketing Match'::TEXT,
    v_result.rows_total,
    v_result.execution_time_ms,
    'SUCCESS'::TEXT;

  -- Step 4: Fact Leads
  RAISE NOTICE '[4/5] Refreshing stg.fact_leads...';
  SELECT * FROM stg.refresh_stg_fact_leads() INTO v_result;
  RETURN QUERY SELECT
    '4. Fact Leads'::TEXT,
    v_result.rows_total,
    v_result.execution_time_ms,
    'SUCCESS'::TEXT;

  -- Step 5: Fact Contracts
  RAISE NOTICE '[5/5] Refreshing stg.fact_contracts...';
  SELECT * FROM stg.refresh_stg_fact_contracts() INTO v_result;
  RETURN QUERY SELECT
    '5. Fact Contracts'::TEXT,
    v_result.rows_total,
    v_result.execution_time_ms,
    'SUCCESS'::TEXT;

  RAISE NOTICE 'All STG tables refreshed successfully!';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION stg.refresh_all_stg_tables() IS 'V9: Обновить все таблицы STG в правильном порядке (для ежедневного n8n workflow)';

-- ============================================================================
-- УСПЕШНО СОЗДАНЫ ВСЕ ФУНКЦИИ STG СХЕМЫ
-- ============================================================================
-- Использование:
-- SELECT * FROM stg.refresh_all_stg_tables();  -- Обновить все таблицы
-- ============================================================================
