-- ============================================================================
-- V9 ETL FUNCTIONS - FIXED VERSION 2
-- ============================================================================
-- Исправления:
-- 1. Добавлен DISTINCT ON для устранения дубликатов id_source
-- 2. Приоритет по наличию fbclid/gclid (самые ценные данные сначала)
-- ============================================================================

-- ФУНКЦИЯ 2: refresh_stg_source_attribution() - FIXED V2
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

  -- Вставить распарсенные данные с DISTINCT ON для устранения дубликатов
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
    request_created_at,
    fb_lead_id
  )
  SELECT DISTINCT ON (id_source)
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
    request_created_at,
    fb_lead_id
  FROM (
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
        WHEN nf.id_form IS NOT NULL THEN 'form'
        ELSE 'direct'
      END as source_type,

      -- Contact info
      ia.phone,
      ia.email,

      -- Связи
      irr.id_request as internet_request_id,
      er.id_event as event_id,
      nf.id_form as form_id,
      ia.request_created_at,

      -- Facebook Lead ID (для прямой связи с fb_leads)
      ia.code->>'fb_lead_id' as fb_lead_id,

      -- Приоритет для сортировки (самые ценные данные сначала)
      CASE
        WHEN ia.code->>'fb_lead_id' IS NOT NULL THEN 1  -- fb_lead_id самый точный!
        WHEN ia.code->>'fbclid' IS NOT NULL THEN 2
        WHEN ia.code->>'fclid' IS NOT NULL THEN 3
        WHEN ia.code->>'gclid' IS NOT NULL THEN 4
        WHEN ia.code->>'utm_campaign' IS NOT NULL THEN 5
        WHEN ia.code->>'utm_source' IS NOT NULL THEN 6
        WHEN ia.email IS NOT NULL THEN 7
        ELSE 99
      END as priority

    FROM stg.crm_events ce

    -- Связь через internet_request
    LEFT JOIN raw.itcrm_internet_request_relation irr ON ce.id_source = irr.id_source
    LEFT JOIN raw.itcrm_analytics ia ON irr.id_request = ia.internet_request_id

    -- Связь через event
    LEFT JOIN raw.itcrm_events_relations er ON ce.id_source = er.id_source

    -- Связь через form
    LEFT JOIN raw.itcrm_new_form nf ON ce.id_source = nf.id_source
  ) sub
  ORDER BY id_source, priority ASC;  -- Берем запись с лучшим приоритетом для каждого id_source

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  v_total := v_inserted;

  RETURN QUERY SELECT
    v_inserted,
    v_updated,
    v_total,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION stg.refresh_stg_source_attribution() IS 'V9: Обновление stg.source_attribution с DISTINCT ON для устранения дубликатов';

-- ============================================================================
-- ТЕСТ: Проверка что дубликаты устранены
-- ============================================================================
-- После выполнения функции должно быть 0 дубликатов:
-- SELECT id_source, COUNT(*) FROM stg.source_attribution GROUP BY id_source HAVING COUNT(*) > 1;
