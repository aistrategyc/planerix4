-- ============================================================================
-- V9 ETL FUNCTION 3: refresh_stg_marketing_match() - COMPLETELY FIXED
-- ============================================================================
-- Исправления:
-- 1. fb_leads уже содержит campaign_id, adset_id, ad_id (не нужен fb_ad_map)
-- 2. fbclid хранится в fb_leads.code (JSONB), а не в отдельной колонке
-- 3. Используем прямой маппинг через fb_leads → fb_campaigns/fb_adsets/fb_ads
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

  -- Вставить маппинг CRM → Facebook/Google campaigns
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
      WHEN fb_leads.campaign_id IS NOT NULL THEN 'facebook'
      WHEN google_clicks.campaign_id IS NOT NULL THEN 'google'
      ELSE NULL
    END as matched_platform,

    -- Facebook details (прямо из fb_leads)
    fb_leads.campaign_id as fb_campaign_id,
    fb_campaigns.name as fb_campaign_name,
    fb_leads.adset_id as fb_adset_id,
    fb_adsets.name as fb_adset_name,
    fb_leads.ad_id as fb_ad_id,
    fb_ads.ad_name as fb_ad_name,

    -- Google details
    google_clicks.campaign_id::text as google_campaign_id,
    google_names.campaign_name as google_campaign_name,
    google_clicks.ad_group_id::text as google_ad_group_id,
    google_names.ad_group_name as google_ad_group_name,

    -- Unified fields
    COALESCE(fb_leads.campaign_id, google_clicks.campaign_id::text) as campaign_id,
    COALESCE(fb_campaigns.name, google_names.campaign_name) as campaign_name,
    COALESCE(fb_leads.ad_id, google_clicks.ad_group_id::text) as ad_id,
    COALESCE(fb_ads.ad_name, google_names.ad_group_name) as ad_name

  FROM stg.source_attribution attr

  -- ========================================================================
  -- FACEBOOK MATCH: 3 способа связать CRM с Facebook leads
  -- ========================================================================
  LEFT JOIN raw.fb_leads ON (
    -- Способ 1: fbclid из code JSONB (самый точный)
    (attr.fbclid IS NOT NULL AND attr.fbclid = fb_leads.code->>'fbclid')
    OR
    -- Способ 2: fclid из code JSONB (альтернативный Facebook click ID)
    (attr.fclid IS NOT NULL AND attr.fclid = fb_leads.code->>'fclid')
    OR
    -- Способ 3: utm_term содержит ad_id (15+ цифр)
    (attr.utm_term IS NOT NULL AND attr.utm_term ~ '^\d{15,}$' AND attr.utm_term = fb_leads.ad_id)
    OR
    -- Способ 4: по телефону и email (если все остальное не сработало)
    (
      attr.phone IS NOT NULL AND fb_leads.phone IS NOT NULL AND
      regexp_replace(attr.phone, '\D', '', 'g') = regexp_replace(fb_leads.phone, '\D', '', 'g')
    )
    OR
    (
      attr.email IS NOT NULL AND fb_leads.email IS NOT NULL AND
      LOWER(attr.email) = LOWER(fb_leads.email)
    )
  )

  -- Facebook campaign/adset/ad names
  LEFT JOIN raw.fb_campaigns ON fb_leads.campaign_id = fb_campaigns.campaign_id
  LEFT JOIN raw.fb_adsets ON fb_leads.adset_id = fb_adsets.adset_id
  LEFT JOIN raw.fb_ads ON fb_leads.ad_id = fb_ads.ad_id

  -- ========================================================================
  -- GOOGLE ADS MATCH: по gclid
  -- ========================================================================
  LEFT JOIN raw.google_ads_clicks google_clicks ON (
    attr.gclid IS NOT NULL AND attr.gclid = google_clicks.gclid
  )

  -- Google campaign/ad group names
  LEFT JOIN raw.google_ads_names google_names ON (
    google_clicks.customer_id = google_names.customer_id AND
    google_clicks.campaign_id = google_names.campaign_id AND
    google_clicks.ad_group_id = google_names.ad_group_id
  )

  WHERE attr.dominant_platform IN ('facebook', 'google');

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  v_total := v_inserted;

  RETURN QUERY SELECT
    v_inserted,
    v_updated,
    v_total,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION stg.refresh_stg_marketing_match() IS 'V9: Маппинг CRM источников на Facebook/Google campaigns';

-- ============================================================================
-- ТЕСТ: Проверка маппинга
-- ============================================================================
-- После выполнения функции проверить:
-- SELECT matched_platform, COUNT(*) FROM stg.marketing_match GROUP BY matched_platform;
-- Ожидается: facebook (большинство), google (меньше)
