-- ============================================================================
-- V10 PRODUCTION: FACT_EVENTS - FULL CLIENT FUNNEL
-- Date: October 23, 2025, 21:00 UTC
-- Purpose: ВСЯ ВОРОНКА КЛИЕНТА - каждое событие, каждое касание
-- User Requirement: "все эти ивенты это воронка клиента, что с ним происходило! все нужны!"
-- ============================================================================

-- ============================================================================
-- КРИТИЧНО: НЕ ТОЛЬКО FIRST TOUCH, А ВСЕ СОБЫТИЯ!
-- ============================================================================
-- Старая система (stg.fact_leads): только is_first_touch = TRUE
-- Новая система (prod.fact_events): ВСЕ события клиента
-- Это позволит:
--   1. Видеть полную воронку (все touch points)
--   2. Считать multi-touch attribution
--   3. Не терять Email/Viber/Telegram которые приходят НЕ первыми
--   4. Анализировать customer journey
-- ============================================================================

-- ============================================================================
-- TABLE: prod.fact_events
-- Purpose: ВСЕ события клиента - полная воронка без фильтров
-- ============================================================================
DROP TABLE IF EXISTS prod.fact_events CASCADE;

CREATE TABLE prod.fact_events (
    -- Primary Key
    event_id BIGSERIAL PRIMARY KEY,

    -- Event Identity
    event_source_id BIGINT NOT NULL,  -- id_source из CRM
    client_id BIGINT NOT NULL,         -- id_uniq клиента

    -- Event Timing
    event_date TIMESTAMP NOT NULL,
    event_day DATE NOT NULL,
    event_type_id INTEGER,
    event_type_name VARCHAR(200),

    -- Event Flags (что это за событие?)
    is_first_touch BOOLEAN DEFAULT FALSE,
    is_last_touch BOOLEAN DEFAULT FALSE,
    is_contract BOOLEAN DEFAULT FALSE,
    is_rejection BOOLEAN DEFAULT FALSE,
    is_no_answer BOOLEAN DEFAULT FALSE,
    touch_sequence_number INTEGER,  -- 1, 2, 3... порядок касания

    -- Contract Details (если событие = продажа)
    contract_amount NUMERIC(15,2),
    contract_date TIMESTAMP,
    days_to_contract INTEGER,  -- сколько дней от first touch до контракта

    -- ========================================================================
    -- PLATFORM ATTRIBUTION - PRESERVED EXACTLY! NO DATA LOSS!
    -- ========================================================================
    platform VARCHAR(50),               -- facebook, instagram, google, viber, email, telegram, event, form, direct
    channel VARCHAR(50),                 -- paid, organic, direct, referral, email, social
    source_type VARCHAR(100),            -- Тип источника из CRM

    -- ========================================================================
    -- CAMPAIGN ATTRIBUTION - детали рекламы
    -- ========================================================================
    campaign_id VARCHAR(255),
    campaign_name VARCHAR(500),
    ad_id VARCHAR(255),
    ad_name VARCHAR(500),
    adset_id VARCHAR(255),
    adset_name VARCHAR(500),
    creative_id VARCHAR(255),

    -- ========================================================================
    -- UTM PARAMETERS - полный набор
    -- ========================================================================
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(500),
    utm_content VARCHAR(500),
    utm_term VARCHAR(500),

    -- ========================================================================
    -- CLICK IDs - для точного трекинга
    -- ========================================================================
    fbclid VARCHAR(255),
    gclid VARCHAR(255),

    -- ========================================================================
    -- META/FACEBOOK SPECIFIC
    -- ========================================================================
    fb_lead_id VARCHAR(255),
    fb_page_id VARCHAR(255),
    fb_form_id VARCHAR(255),
    fb_form_name VARCHAR(500),

    -- ========================================================================
    -- GOOGLE SPECIFIC
    -- ========================================================================
    google_keyword TEXT,
    google_ad_group_id VARCHAR(255),
    google_ad_group_name VARCHAR(500),

    -- ========================================================================
    -- OTHER PLATFORMS
    -- ========================================================================
    telegram_source VARCHAR(255),
    viber_source VARCHAR(255),
    email_campaign_id VARCHAR(255),
    event_id_crm VARCHAR(255),

    -- ========================================================================
    -- ATTRIBUTION QUALITY
    -- ========================================================================
    attribution_method VARCHAR(100),  -- fbclid_match, gclid_match, marketing_match, utm_heuristic, crm_manual, unknown
    attribution_confidence INTEGER,    -- 0-100 score
    has_campaign_data BOOLEAN,
    has_creative_data BOOLEAN,

    -- ========================================================================
    -- METADATA
    -- ========================================================================
    id_user INTEGER,                   -- кто в CRM обработал
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES - для быстрых запросов
-- ============================================================================
CREATE INDEX idx_fact_events_client_id ON prod.fact_events(client_id);
CREATE INDEX idx_fact_events_event_date ON prod.fact_events(event_date);
CREATE INDEX idx_fact_events_event_day ON prod.fact_events(event_day);
CREATE INDEX idx_fact_events_platform ON prod.fact_events(platform);
CREATE INDEX idx_fact_events_campaign_id ON prod.fact_events(campaign_id);
CREATE INDEX idx_fact_events_is_first_touch ON prod.fact_events(is_first_touch) WHERE is_first_touch = TRUE;
CREATE INDEX idx_fact_events_is_contract ON prod.fact_events(is_contract) WHERE is_contract = TRUE;
CREATE INDEX idx_fact_events_client_date ON prod.fact_events(client_id, event_date);
CREATE INDEX idx_fact_events_platform_date ON prod.fact_events(platform, event_day);

-- For Email/Viber/Telegram analysis
CREATE INDEX idx_fact_events_special_platforms ON prod.fact_events(platform)
WHERE platform IN ('email', 'viber', 'telegram', 'instagram', 'event');

-- ============================================================================
-- FUNCTION: refresh_prod_fact_events()
-- Purpose: Наполнить prod.fact_events ВСЕМИ событиями из stg.crm_events
-- ============================================================================
CREATE OR REPLACE FUNCTION prod.refresh_prod_fact_events()
RETURNS TABLE(
  rows_inserted BIGINT,
  execution_time_ms INTEGER
) AS $$
DECLARE
  v_start_time TIMESTAMP;
  v_inserted BIGINT := 0;
BEGIN
  v_start_time := clock_timestamp();

  -- Очистить таблицу
  TRUNCATE TABLE prod.fact_events CASCADE;

  -- ========================================================================
  -- Вставить ВСЕ события (не только first touch!)
  -- ========================================================================
  INSERT INTO prod.fact_events (
    event_source_id,
    client_id,
    event_date,
    event_day,
    event_type_id,
    event_type_name,
    is_first_touch,
    is_last_touch,
    is_contract,
    is_rejection,
    is_no_answer,
    touch_sequence_number,
    contract_amount,
    contract_date,
    days_to_contract,
    platform,
    channel,
    source_type,
    campaign_id,
    campaign_name,
    ad_id,
    ad_name,
    adset_id,
    adset_name,
    creative_id,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    fbclid,
    gclid,
    fb_lead_id,
    fb_page_id,
    fb_form_id,
    attribution_method,
    attribution_confidence,
    has_campaign_data,
    has_creative_data,
    id_user
  )
  SELECT
    -- Event Identity
    crm.id_source as event_source_id,
    crm.client_id,

    -- Event Timing
    crm.event_date,
    crm.event_day,
    crm.event_type_id,
    crm.event_type_name,

    -- Event Flags
    crm.is_first_touch,
    -- is_last_touch будет вычислен позже через window function
    ROW_NUMBER() OVER (PARTITION BY crm.client_id ORDER BY crm.event_date DESC) = 1 as is_last_touch,
    crm.is_contract,
    crm.is_rejection,
    crm.is_no_answer,
    -- Touch sequence
    ROW_NUMBER() OVER (PARTITION BY crm.client_id ORDER BY crm.event_date) as touch_sequence_number,

    -- Contract Details
    crm.contract_amount,
    crm.contract_date,
    CASE WHEN crm.contract_date IS NOT NULL AND crm.is_first_touch THEN
      EXTRACT(DAY FROM crm.contract_date - crm.event_date)::INTEGER
    END as days_to_contract,

    -- ====================================================================
    -- PLATFORM ATTRIBUTION - CRITICAL: NO DATA LOSS!
    -- ====================================================================
    CASE
      -- Paid advertising platforms - preserve exactly
      WHEN match.matched_platform = 'facebook' THEN 'facebook'
      WHEN match.matched_platform = 'instagram' THEN 'instagram'  -- НЕ объединять с facebook!
      WHEN match.matched_platform = 'google' THEN 'google'
      WHEN match.matched_platform = 'tiktok' THEN 'tiktok'
      WHEN match.matched_platform = 'linkedin' THEN 'linkedin'

      -- Communication platforms - preserve exactly
      WHEN attr.utm_source = 'email' OR attr.utm_medium = 'email' THEN 'email'
      WHEN attr.utm_source = 'viber' OR attr.source_type ILIKE '%viber%' THEN 'viber'
      WHEN attr.utm_source = 'telegram' OR attr.utm_source = 'tg' OR attr.source_type ILIKE '%telegram%' THEN 'telegram'

      -- Event/Form platforms
      WHEN attr.source_type = 'form_event' OR attr.source_type ILIKE '%event%' THEN 'event'
      WHEN attr.source_type = 'form' OR attr.source_type ILIKE '%form%' THEN 'form'

      -- Other
      WHEN match.matched_platform = 'paid_other' THEN 'paid_other'
      WHEN attr.source_type = 'organic' OR attr.source_type ILIKE '%organic%' THEN 'organic'
      WHEN attr.source_type = 'referral' THEN 'referral'

      -- Fallback
      ELSE COALESCE(match.matched_platform, attr.source_type, 'direct')
    END as platform,

    -- Channel classification
    CASE
      WHEN match.matched_platform IN ('facebook', 'instagram', 'google', 'tiktok', 'linkedin', 'paid_other') THEN 'paid'
      WHEN attr.utm_source = 'email' OR attr.utm_medium = 'email' THEN 'email'
      WHEN attr.utm_source IN ('viber', 'telegram', 'tg') THEN 'social'
      WHEN attr.source_type ILIKE '%event%' THEN 'event'
      WHEN attr.source_type = 'organic' THEN 'organic'
      WHEN attr.source_type = 'referral' THEN 'referral'
      ELSE 'direct'
    END as channel,

    attr.source_type,

    -- ====================================================================
    -- CAMPAIGN ATTRIBUTION
    -- ====================================================================
    match.campaign_id,
    match.campaign_name,
    match.ad_id,
    match.ad_name,
    match.adset_id,
    match.adset_name,
    match.creative_id,

    -- ====================================================================
    -- UTM PARAMETERS
    -- ====================================================================
    attr.utm_source,
    attr.utm_medium,
    attr.utm_campaign,
    attr.utm_content,
    attr.utm_term,

    -- ====================================================================
    -- CLICK IDs
    -- ====================================================================
    attr.fbclid,
    attr.gclid,

    -- ====================================================================
    -- META/FACEBOOK SPECIFIC
    -- ====================================================================
    match.fb_lead_id,
    match.fb_page_id,
    match.fb_form_id,

    -- ====================================================================
    -- ATTRIBUTION QUALITY
    -- ====================================================================
    CASE
      WHEN attr.fbclid IS NOT NULL THEN 'fbclid_match'
      WHEN attr.gclid IS NOT NULL THEN 'gclid_match'
      WHEN match.campaign_id IS NOT NULL THEN 'marketing_match'
      WHEN attr.utm_source IS NOT NULL THEN 'utm_heuristic'
      WHEN attr.source_type IS NOT NULL THEN 'crm_manual'
      ELSE 'unknown'
    END as attribution_method,

    CASE
      WHEN attr.fbclid IS NOT NULL OR attr.gclid IS NOT NULL THEN 100
      WHEN match.campaign_id IS NOT NULL THEN 90
      WHEN attr.utm_source IS NOT NULL AND attr.utm_campaign IS NOT NULL THEN 80
      WHEN attr.utm_source IS NOT NULL THEN 70
      WHEN attr.source_type IS NOT NULL THEN 60
      ELSE 30
    END as attribution_confidence,

    match.campaign_id IS NOT NULL as has_campaign_data,
    match.creative_id IS NOT NULL as has_creative_data,

    -- ====================================================================
    -- METADATA
    -- ====================================================================
    crm.id_user

  FROM stg.crm_events crm

  -- Left joins чтобы НЕ ТЕРЯТЬ данные если нет match
  LEFT JOIN stg.source_attribution attr ON crm.id_source = attr.id_source
  LEFT JOIN stg.marketing_match match ON crm.id_source = match.id_source

  WHERE crm.event_date >= '2025-01-01'
    AND crm.client_id IS NOT NULL;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RETURN QUERY SELECT
    v_inserted,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEW: prod.view_client_funnel
-- Purpose: Показать полную воронку клиента
-- ============================================================================
CREATE OR REPLACE VIEW prod.view_client_funnel AS
SELECT
  client_id,
  COUNT(*) as total_touches,
  MIN(event_date) as first_touch_date,
  MAX(event_date) as last_touch_date,
  SUM(CASE WHEN is_contract THEN 1 ELSE 0 END) as total_contracts,
  SUM(COALESCE(contract_amount, 0)) as total_revenue,
  STRING_AGG(DISTINCT platform, ', ' ORDER BY platform) as platforms_used,
  STRING_AGG(DISTINCT channel, ', ' ORDER BY channel) as channels_used,
  ARRAY_AGG(platform ORDER BY event_date) as journey_platforms,
  ARRAY_AGG(event_type_name ORDER BY event_date) as journey_events
FROM prod.fact_events
GROUP BY client_id
ORDER BY total_revenue DESC NULLS LAST;

COMMENT ON VIEW prod.view_client_funnel IS
'Полная воронка клиента: все касания, все платформы, весь journey';

-- ============================================================================
-- VIEW: prod.view_platform_touches_analysis
-- Purpose: Анализ по платформам - сколько касаний приводит к продаже
-- ============================================================================
CREATE OR REPLACE VIEW prod.view_platform_touches_analysis AS
WITH client_stats AS (
  SELECT
    client_id,
    platform,
    COUNT(*) as touches_from_platform,
    MIN(event_date) as first_platform_touch,
    MAX(CASE WHEN is_contract THEN event_date END) as contract_date,
    SUM(CASE WHEN is_contract THEN contract_amount ELSE 0 END) as revenue_from_platform
  FROM prod.fact_events
  GROUP BY client_id, platform
)
SELECT
  platform,
  COUNT(DISTINCT client_id) as unique_clients,
  SUM(touches_from_platform) as total_touches,
  ROUND(AVG(touches_from_platform), 2) as avg_touches_per_client,
  SUM(CASE WHEN contract_date IS NOT NULL THEN 1 ELSE 0 END) as clients_who_converted,
  ROUND(100.0 * SUM(CASE WHEN contract_date IS NOT NULL THEN 1 ELSE 0 END) /
        NULLIF(COUNT(DISTINCT client_id), 0), 2) as conversion_rate_pct,
  SUM(revenue_from_platform) as total_revenue,
  ROUND(AVG(revenue_from_platform) FILTER (WHERE revenue_from_platform > 0), 0) as avg_revenue_per_converted
FROM client_stats
GROUP BY platform
ORDER BY total_revenue DESC NULLS LAST;

COMMENT ON VIEW prod.view_platform_touches_analysis IS
'Анализ платформ: сколько касаний, конверсия, revenue. Включает email, viber, telegram!';

-- ============================================================================
-- VIEW: prod.view_multi_touch_attribution
-- Purpose: Multi-touch attribution - какие платформы участвовали в продаже
-- ============================================================================
CREATE OR REPLACE VIEW prod.view_multi_touch_attribution AS
WITH contract_clients AS (
  SELECT DISTINCT client_id
  FROM prod.fact_events
  WHERE is_contract = TRUE
),
client_journey AS (
  SELECT
    e.client_id,
    e.platform,
    e.channel,
    e.event_date,
    e.is_first_touch,
    e.is_last_touch,
    e.touch_sequence_number,
    MAX(CASE WHEN e.is_contract THEN e.contract_amount END) OVER (PARTITION BY e.client_id) as contract_amount
  FROM prod.fact_events e
  WHERE e.client_id IN (SELECT client_id FROM contract_clients)
)
SELECT
  platform,
  channel,
  COUNT(DISTINCT client_id) as involved_in_conversions,
  SUM(CASE WHEN is_first_touch THEN 1 ELSE 0 END) as times_first_touch,
  SUM(CASE WHEN is_last_touch THEN 1 ELSE 0 END) as times_last_touch,
  SUM(CASE WHEN NOT is_first_touch AND NOT is_last_touch THEN 1 ELSE 0 END) as times_middle_touch,
  -- Attribution shares (equal weight for simplicity)
  SUM(contract_amount / NULLIF((SELECT COUNT(*) FROM client_journey cj2 WHERE cj2.client_id = client_journey.client_id), 0)) as attributed_revenue_equal_weight,
  -- First touch attribution
  SUM(CASE WHEN is_first_touch THEN contract_amount ELSE 0 END) as attributed_revenue_first_touch,
  -- Last touch attribution
  SUM(CASE WHEN is_last_touch THEN contract_amount ELSE 0 END) as attributed_revenue_last_touch
FROM client_journey
GROUP BY platform, channel
ORDER BY attributed_revenue_equal_weight DESC NULLS LAST;

COMMENT ON VIEW prod.view_multi_touch_attribution IS
'Multi-touch attribution: First touch, Last touch, Equal weight. Показывает роль каждой платформы в продаже.';

-- ============================================================================
-- TESTING AND VERIFICATION
-- ============================================================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PROD.FACT_EVENTS - TABLE CREATED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Table: prod.fact_events ✅';
  RAISE NOTICE 'Indexes: 11 indexes created ✅';
  RAISE NOTICE 'Function: prod.refresh_prod_fact_events() ✅';
  RAISE NOTICE 'Views: 3 analytical views ✅';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Execute SELECT * FROM prod.refresh_prod_fact_events();';
  RAISE NOTICE '========================================';
END $$;
