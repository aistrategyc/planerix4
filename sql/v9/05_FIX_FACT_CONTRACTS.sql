-- ============================================================================
-- V9 FIX: FACT_CONTRACTS - DIRECT CONTRACT LINKAGE
-- ============================================================================
-- Проблема: is_contract флаг всегда FALSE в crm_events
-- Решение: Брать договоры напрямую из itcrm_docs_clients через id_source
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

  -- Вставить договоры с FIRST TOUCH атрибуцией (НОВАЯ ЛОГИКА)
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
    -- Contract details (из itcrm_docs_clients)
    dc.id_source as contract_source_id,
    ns.id_uniq as client_id,
    dc.currentdate as contract_date,
    dc.currentdate::date as contract_day,
    dc.total_cost_of_the_contract as contract_amount,

    -- FIRST TOUCH ATTRIBUTION (из fact_leads)
    fl.lead_source_id,
    fl.lead_date,
    fl.lead_day,
    fl.dominant_platform,
    fl.source_type,
    fl.utm_source,
    fl.utm_campaign,
    fl.utm_medium,
    fl.matched_platform,
    fl.campaign_id,
    fl.campaign_name,
    fl.ad_id,
    fl.ad_name,
    fl.fb_adset_id,
    fl.fb_adset_name,

    -- Conversion metrics
    EXTRACT(DAY FROM dc.currentdate - fl.lead_date)::INTEGER as days_to_contract,

    CURRENT_TIMESTAMP as updated_at

  FROM raw.itcrm_docs_clients dc

  -- Связь с new_source для получения client_id (id_uniq)
  INNER JOIN raw.itcrm_new_source ns ON dc.id_source = ns.id_source

  -- First touch attribution через fact_leads
  LEFT JOIN stg.fact_leads fl ON ns.id_uniq = fl.client_id

  WHERE dc.currentdate >= '2025-01-01'
    AND dc.total_cost_of_the_contract > 0
    AND ns.id_uniq IS NOT NULL;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  v_total := v_inserted;

  RETURN QUERY SELECT
    v_inserted,
    v_updated,
    v_total,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION stg.refresh_stg_fact_contracts() IS 'V9: FIXED - Договоры из itcrm_docs_clients с FIRST TOUCH атрибуцией';

-- ============================================================================
-- ПРОВЕРКА ПОСЛЕ ВЫПОЛНЕНИЯ
-- ============================================================================
-- Должно загрузиться ~193 договора (88.94% из 217 raw contracts)
-- SELECT COUNT(*), SUM(contract_amount), MIN(contract_day), MAX(contract_day)
-- FROM stg.fact_contracts;
