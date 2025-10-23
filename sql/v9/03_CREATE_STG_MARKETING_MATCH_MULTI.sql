-- ============================================================================
-- V9 MARKETING MATCH - MULTI-METHOD APPROACH
-- ============================================================================
-- Стратегия: Использовать ВСЕ доступные способы связи CRM ↔ Facebook/Google
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

  -- Вставить маппинг с МАКСИМАЛЬНЫМ покрытием
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
  SELECT DISTINCT ON (attr.id_source)
    attr.id_source,

    -- Определенная платформа (приоритет: Facebook > Google)
    CASE
      WHEN fb_leads.fb_lead_id IS NOT NULL THEN 'facebook'
      WHEN google_clicks.campaign_id IS NOT NULL THEN 'google'
      ELSE NULL
    END as matched_platform,

    -- ========================================================================
    -- FACEBOOK DETAILS
    -- ========================================================================
    fb_leads.campaign_id as fb_campaign_id,
    fb_campaigns.name as fb_campaign_name,
    fb_leads.adset_id as fb_adset_id,
    fb_adsets.name as fb_adset_name,
    fb_leads.ad_id as fb_ad_id,
    fb_ads.ad_name as fb_ad_name,

    -- ========================================================================
    -- GOOGLE DETAILS
    -- ========================================================================
    google_clicks.campaign_id::text as google_campaign_id,
    google_names.campaign_name as google_campaign_name,
    google_clicks.ad_group_id::text as google_ad_group_id,
    google_names.ad_group_name as google_ad_group_name,

    -- ========================================================================
    -- UNIFIED FIELDS
    -- ========================================================================
    COALESCE(fb_leads.campaign_id, google_clicks.campaign_id::text) as campaign_id,
    COALESCE(fb_campaigns.name, google_names.campaign_name) as campaign_name,
    COALESCE(fb_leads.ad_id, google_clicks.ad_group_id::text) as ad_id,
    COALESCE(fb_ads.ad_name, google_names.ad_group_name) as ad_name

  FROM stg.source_attribution attr

  -- ========================================================================
  -- FACEBOOK MATCHING - 5 СПОСОБОВ (приоритет по точности)
  -- ========================================================================
  LEFT JOIN raw.fb_leads ON (
    -- Способ 1: fb_lead_id (самый точный - ПРИОРИТЕТ 1)
    (attr.fb_lead_id IS NOT NULL AND attr.fb_lead_id != '' AND attr.fb_lead_id = fb_leads.fb_lead_id)
    OR
    -- Способ 2: fclid из code JSONB (Facebook click ID - ПРИОРИТЕТ 2)
    (attr.fclid IS NOT NULL AND attr.fclid != '' AND attr.fclid = fb_leads.code->>'fclid')
    OR
    -- Способ 3: fbclid (классический Facebook click ID - ПРИОРИТЕТ 3)
    (attr.fbclid IS NOT NULL AND attr.fbclid != '' AND attr.fbclid = fb_leads.code->>'fbclid')
    OR
    -- Способ 4: utm_term содержит ad_id (15+ цифр - ПРИОРИТЕТ 4)
    (attr.utm_term IS NOT NULL AND attr.utm_term ~ '^\d{15,}$' AND attr.utm_term = fb_leads.ad_id)
    OR
    -- Способ 5: по телефону (нормализованный - ПРИОРИТЕТ 5)
    (
      attr.phone IS NOT NULL AND fb_leads.phone IS NOT NULL AND
      regexp_replace(attr.phone, '\D', '', 'g') = regexp_replace(fb_leads.phone, '\D', '', 'g')
    )
    OR
    -- Способ 6: по email (case-insensitive - ПРИОРИТЕТ 6)
    (
      attr.email IS NOT NULL AND fb_leads.email IS NOT NULL AND
      LOWER(TRIM(attr.email)) = LOWER(TRIM(fb_leads.email))
    )
  )

  -- Facebook campaign/adset/ad names (детали из справочников)
  LEFT JOIN raw.fb_campaigns ON fb_leads.campaign_id = fb_campaigns.campaign_id
  LEFT JOIN raw.fb_adsets ON fb_leads.adset_id = fb_adsets.adset_id
  LEFT JOIN raw.fb_ads ON fb_leads.ad_id = fb_ads.ad_id

  -- ========================================================================
  -- GOOGLE ADS MATCHING - по gclid
  -- ========================================================================
  LEFT JOIN raw.google_ads_clicks google_clicks ON (
    attr.gclid IS NOT NULL AND attr.gclid != '' AND attr.gclid = google_clicks.gclid
  )

  -- Google campaign/ad group names (детали из справочников)
  LEFT JOIN raw.google_ads_names google_names ON (
    google_clicks.customer_id = google_names.customer_id AND
    google_clicks.campaign_id = google_names.campaign_id AND
    google_clicks.ad_group_id = google_names.ad_group_id
  )

  WHERE attr.dominant_platform IN ('facebook', 'google')

  -- Сортировка по приоритету (берём самое качественное совпадение)
  ORDER BY attr.id_source,
    CASE
      WHEN attr.fb_lead_id = fb_leads.fb_lead_id THEN 1
      WHEN attr.fclid = fb_leads.code->>'fclid' THEN 2
      WHEN attr.fbclid = fb_leads.code->>'fbclid' THEN 3
      WHEN attr.utm_term = fb_leads.ad_id THEN 4
      WHEN attr.gclid = google_clicks.gclid THEN 5
      WHEN regexp_replace(attr.phone, '\D', '', 'g') = regexp_replace(fb_leads.phone, '\D', '', 'g') THEN 6
      WHEN LOWER(TRIM(attr.email)) = LOWER(TRIM(fb_leads.email)) THEN 7
      ELSE 99
    END;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  v_total := v_inserted;

  RETURN QUERY SELECT
    v_inserted,
    v_updated,
    v_total,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION stg.refresh_stg_marketing_match() IS 'V9: Multi-method маппинг CRM → Facebook/Google (6 способов связи с приоритизацией)';

-- ============================================================================
-- ТЕСТ: Проверка качества маппинга
-- ============================================================================
-- После выполнения проверить:
-- SELECT matched_platform, COUNT(*), ROUND(AVG(CASE WHEN campaign_name IS NOT NULL THEN 1 ELSE 0 END)*100, 2) as fill_rate
-- FROM stg.marketing_match GROUP BY matched_platform;
