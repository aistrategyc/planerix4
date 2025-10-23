-- ============================================================================
-- ПРАВИЛЬНЫЙ SQL ДЛЯ fact_leads
-- Использует crm_requests напрямую (без lead_marketing_enriched)
-- Date: October 19, 2025
-- ============================================================================

BEGIN;

-- ============================================================================
-- DDL: Создать таблицу fact_leads (если не существует)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboards.fact_leads (
  id_source text PRIMARY KEY,

  internet_request_id text,
  request_type        text,
  form_name           text,
  created_date_txt    text,

  utm_source  text,
  utm_medium  text,
  utm_campaign text,
  utm_content text,
  utm_term text,

  dominant_platform text,

  gclid               text,
  google_campaign_id  text,
  google_campaign_name text,
  google_channel_type text,
  google_ad_group_id  text,
  google_ad_group_name text,
  google_keyword_text text,
  google_search_term  text,

  fb_lead_id         text,
  fbclid             text,
  meta_campaign_id   text,
  meta_campaign_name text,
  meta_adset_id      text,
  meta_adset_name    text,
  meta_ad_id         text,
  meta_ad_name       text,
  meta_page_id       text,
  meta_form_id       text,
  meta_form_name     text,
  meta_platform      text,

  unified_campaign_name_google text,
  unified_campaign_name_meta   text,

  is_paid boolean,
  n_paid_ops integer,
  contract_amount numeric(18,2),

  row_created_at timestamptz NOT NULL DEFAULT now(),
  row_updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger для автоматического обновления row_updated_at
CREATE OR REPLACE FUNCTION dashboards.fn_touch_row_updated()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.row_updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_touch_fact_leads ON dashboards.fact_leads;
CREATE TRIGGER trg_touch_fact_leads
BEFORE UPDATE ON dashboards.fact_leads
FOR EACH ROW EXECUTE FUNCTION dashboards.fn_touch_row_updated();

COMMIT;

-- ============================================================================
-- UPSERT: Загрузить данные из crm_requests + reference tables
-- ============================================================================
BEGIN;

WITH
-- Campaign reference для Google (human-readable names)
cr_g AS (
  SELECT DISTINCT ON (campaign_id)
         platform,
         account_id,
         campaign_id,
         campaign_name_human
  FROM dashboards.campaign_reference
  WHERE platform = 'google'
  ORDER BY campaign_id, last_seen_date DESC NULLS LAST
),
-- Campaign reference для Meta (human-readable names)
cr_m AS (
  SELECT DISTINCT ON (campaign_id)
         platform,
         account_id,
         campaign_id,
         campaign_name_human
  FROM dashboards.campaign_reference
  WHERE platform = 'meta'
  ORDER BY campaign_id, last_seen_date DESC NULLS LAST
),
-- Извлечь tracking параметры из crm_requests.code (JSONB)
extracted_params AS (
  SELECT
    id_source,
    internet_request_id,
    request_type,
    form_name,
    source_date_time::TEXT as created_date_txt,

    -- UTM parameters
    code->>'utm_source' as utm_source,
    code->>'utm_medium' as utm_medium,
    code->>'utm_campaign' as utm_campaign,
    code->>'utm_content' as utm_content,
    code->>'utm_term' as utm_term,

    -- Google parameters
    code->>'gclid' as gclid,
    code->>'campaign_id' as google_campaign_id_raw,
    code->>'campaign_name' as google_campaign_name_raw,

    -- Facebook/Meta parameters
    code->>'fb_lead_id' as fb_lead_id,
    code->>'fbclid' as fbclid,
    code->>'campaign_id' as meta_campaign_id_raw,
    code->>'campaign_name' as meta_campaign_name_raw,
    code->>'adset_id' as meta_adset_id,
    code->>'adset_name' as meta_adset_name,
    code->>'ad_id' as meta_ad_id,
    code->>'ad_name' as meta_ad_name,
    code->>'page_id' as meta_page_id,
    code->>'form_id' as meta_form_id,
    code->>'form_name' as meta_form_name,

    -- Определить dominant_platform
    CASE
      WHEN code->>'gclid' IS NOT NULL AND code->>'gclid' != '' THEN 'google'
      WHEN code->>'fb_lead_id' IS NOT NULL AND code->>'fb_lead_id' != '' THEN 'meta'
      WHEN code->>'fbclid' IS NOT NULL AND code->>'fbclid' != '' THEN 'meta'
      WHEN code->>'utm_source' = 'google' THEN 'google'
      WHEN code->>'utm_source' IN ('facebook', 'instagram', 'meta') THEN 'meta'
      WHEN code->>'utm_source' IS NOT NULL THEN 'other'
      ELSE 'direct'
    END as dominant_platform,

    -- Contract info
    contract_id,
    contract_total as contract_amount

  FROM dashboards.crm_requests
  WHERE source_date_time >= '2025-09-01'  -- Только свежие данные
),
-- Enriched with Google Ads reference data
enriched_google AS (
  SELECT
    ep.*,
    gar.campaign_id as gar_campaign_id,
    gar.campaign_name as gar_campaign_name,
    gar.advertising_channel_type as gar_channel_type,
    gar.ad_group_id as gar_ad_group_id,
    gar.ad_group_name as gar_ad_group_name,
    gar.keyword_text as gar_keyword_text,
    gar.search_term as gar_search_term
  FROM extracted_params ep
  LEFT JOIN dashboards.google_ad_reference gar
    ON gar.gclid = ep.gclid
  WHERE ep.dominant_platform IN ('google', 'direct', 'other')
     OR ep.gclid IS NOT NULL
),
-- Enriched with Facebook Ads reference data
enriched_meta AS (
  SELECT
    eg.*,
    far.campaign_id as far_campaign_id,
    far.campaign_name as far_campaign_name,
    far.adset_id as far_adset_id,
    far.adset_name as far_adset_name,
    far.ad_id as far_ad_id,
    far.ad_name as far_ad_name,
    far.page_id as far_page_id,
    far.form_id as far_form_id,
    far.form_name as far_form_name,
    far.platform as far_platform
  FROM enriched_google eg
  LEFT JOIN dashboards.fb_ad_reference far
    ON (
      (eg.fb_lead_id IS NOT NULL AND eg.fb_lead_id != '' AND far.fb_lead_id = eg.fb_lead_id)
      OR
      (eg.fbclid IS NOT NULL AND eg.fbclid != '' AND far.fbclid = eg.fbclid)
    )
)

-- Final INSERT with all enriched data
INSERT INTO dashboards.fact_leads AS tgt (
  id_source,
  internet_request_id,
  request_type,
  form_name,
  created_date_txt,

  utm_source,
  utm_medium,
  utm_campaign,
  utm_content,
  utm_term,

  dominant_platform,

  gclid,
  google_campaign_id,
  google_campaign_name,
  google_channel_type,
  google_ad_group_id,
  google_ad_group_name,
  google_keyword_text,
  google_search_term,

  fb_lead_id,
  fbclid,
  meta_campaign_id,
  meta_campaign_name,
  meta_adset_id,
  meta_adset_name,
  meta_ad_id,
  meta_ad_name,
  meta_page_id,
  meta_form_id,
  meta_form_name,
  meta_platform,

  unified_campaign_name_google,
  unified_campaign_name_meta,

  is_paid,
  n_paid_ops,
  contract_amount
)
SELECT
  em.id_source,
  em.internet_request_id,
  em.request_type,
  em.form_name,
  em.created_date_txt,

  em.utm_source,
  em.utm_medium,
  em.utm_campaign,
  em.utm_content,
  em.utm_term,

  em.dominant_platform,

  -- Google fields (prioritize extracted, fallback to reference)
  COALESCE(NULLIF(em.gclid, ''), NULL) as gclid,
  COALESCE(NULLIF(em.google_campaign_id_raw, ''), em.gar_campaign_id) as google_campaign_id,
  COALESCE(NULLIF(em.google_campaign_name_raw, ''), em.gar_campaign_name) as google_campaign_name,
  em.gar_channel_type as google_channel_type,
  em.gar_ad_group_id as google_ad_group_id,
  em.gar_ad_group_name as google_ad_group_name,
  em.gar_keyword_text as google_keyword_text,
  em.gar_search_term as google_search_term,

  -- Meta fields (prioritize extracted, fallback to reference)
  COALESCE(NULLIF(em.fb_lead_id, ''), em.far_campaign_id) as fb_lead_id,
  COALESCE(NULLIF(em.fbclid, ''), NULL) as fbclid,
  COALESCE(NULLIF(em.meta_campaign_id_raw, ''), em.far_campaign_id) as meta_campaign_id,
  COALESCE(NULLIF(em.meta_campaign_name_raw, ''), em.far_campaign_name) as meta_campaign_name,
  COALESCE(NULLIF(em.meta_adset_id, ''), em.far_adset_id) as meta_adset_id,
  COALESCE(NULLIF(em.meta_adset_name, ''), em.far_adset_name) as meta_adset_name,
  COALESCE(NULLIF(em.meta_ad_id, ''), em.far_ad_id) as meta_ad_id,
  COALESCE(NULLIF(em.meta_ad_name, ''), em.far_ad_name) as meta_ad_name,
  COALESCE(NULLIF(em.meta_page_id, ''), em.far_page_id) as meta_page_id,
  COALESCE(NULLIF(em.meta_form_id, ''), em.far_form_id) as meta_form_id,
  COALESCE(NULLIF(em.meta_form_name, ''), em.far_form_name) as meta_form_name,
  em.far_platform as meta_platform,

  -- Human-readable campaign names from campaign_reference
  cg.campaign_name_human as unified_campaign_name_google,
  cm.campaign_name_human as unified_campaign_name_meta,

  -- Payment/Contract info
  CASE
    WHEN em.dominant_platform IN ('google', 'meta', 'other') THEN TRUE
    ELSE FALSE
  END as is_paid,
  CASE
    WHEN em.dominant_platform IN ('google', 'meta', 'other') THEN 1
    ELSE 0
  END as n_paid_ops,
  em.contract_amount

FROM enriched_meta em
LEFT JOIN cr_g cg ON cg.campaign_id = COALESCE(NULLIF(em.google_campaign_id_raw, ''), em.gar_campaign_id)
LEFT JOIN cr_m cm ON cm.campaign_id = COALESCE(NULLIF(em.meta_campaign_id_raw, ''), em.far_campaign_id)

ON CONFLICT (id_source) DO UPDATE SET
  internet_request_id = EXCLUDED.internet_request_id,
  request_type        = EXCLUDED.request_type,
  form_name           = EXCLUDED.form_name,
  created_date_txt    = EXCLUDED.created_date_txt,

  utm_source          = COALESCE(EXCLUDED.utm_source,   tgt.utm_source),
  utm_medium          = COALESCE(EXCLUDED.utm_medium,   tgt.utm_medium),
  utm_campaign        = COALESCE(EXCLUDED.utm_campaign, tgt.utm_campaign),
  utm_content         = COALESCE(EXCLUDED.utm_content,  tgt.utm_content),
  utm_term            = COALESCE(EXCLUDED.utm_term,     tgt.utm_term),

  dominant_platform   = COALESCE(EXCLUDED.dominant_platform, tgt.dominant_platform),

  gclid               = COALESCE(EXCLUDED.gclid,               tgt.gclid),
  google_campaign_id  = COALESCE(EXCLUDED.google_campaign_id,  tgt.google_campaign_id),
  google_campaign_name= COALESCE(EXCLUDED.google_campaign_name,tgt.google_campaign_name),
  google_channel_type = COALESCE(EXCLUDED.google_channel_type, tgt.google_channel_type),
  google_ad_group_id  = COALESCE(EXCLUDED.google_ad_group_id,  tgt.google_ad_group_id),
  google_ad_group_name= COALESCE(EXCLUDED.google_ad_group_name,tgt.google_ad_group_name),
  google_keyword_text = COALESCE(EXCLUDED.google_keyword_text, tgt.google_keyword_text),
  google_search_term  = COALESCE(EXCLUDED.google_search_term,  tgt.google_search_term),

  fb_lead_id          = COALESCE(EXCLUDED.fb_lead_id,          tgt.fb_lead_id),
  fbclid              = COALESCE(EXCLUDED.fbclid,              tgt.fbclid),
  meta_campaign_id    = COALESCE(EXCLUDED.meta_campaign_id,    tgt.meta_campaign_id),
  meta_campaign_name  = COALESCE(EXCLUDED.meta_campaign_name,  tgt.meta_campaign_name),
  meta_adset_id       = COALESCE(EXCLUDED.meta_adset_id,       tgt.meta_adset_id),
  meta_adset_name     = COALESCE(EXCLUDED.meta_adset_name,     tgt.meta_adset_name),
  meta_ad_id          = COALESCE(EXCLUDED.meta_ad_id,          tgt.meta_ad_id),
  meta_ad_name        = COALESCE(EXCLUDED.meta_ad_name,        tgt.meta_ad_name),
  meta_page_id        = COALESCE(EXCLUDED.meta_page_id,        tgt.meta_page_id),
  meta_form_id        = COALESCE(EXCLUDED.meta_form_id,        tgt.meta_form_id),
  meta_form_name      = COALESCE(EXCLUDED.meta_form_name,      tgt.meta_form_name),
  meta_platform       = COALESCE(EXCLUDED.meta_platform,       tgt.meta_platform),

  unified_campaign_name_google = COALESCE(EXCLUDED.unified_campaign_name_google, tgt.unified_campaign_name_google),
  unified_campaign_name_meta   = COALESCE(EXCLUDED.unified_campaign_name_meta,   tgt.unified_campaign_name_meta),

  is_paid            = COALESCE(EXCLUDED.is_paid,     tgt.is_paid),
  n_paid_ops         = COALESCE(EXCLUDED.n_paid_ops,  tgt.n_paid_ops),
  contract_amount    = COALESCE(EXCLUDED.contract_amount, tgt.contract_amount),

  row_updated_at     = now();

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check total leads
SELECT COUNT(*) as total_leads FROM dashboards.fact_leads;

-- Check gclid coverage
SELECT
  COUNT(*) FILTER (WHERE gclid IS NOT NULL AND gclid != '') as gclid_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE gclid IS NOT NULL AND gclid != '') / COUNT(*), 2) as gclid_percent
FROM dashboards.fact_leads;

-- Check platform distribution
SELECT
  dominant_platform,
  COUNT(*) as leads,
  COUNT(*) FILTER (WHERE contract_amount > 0) as contracts,
  SUM(contract_amount) as revenue
FROM dashboards.fact_leads
GROUP BY dominant_platform
ORDER BY leads DESC;

-- Expected results after running:
-- total_leads: ~16,962
-- gclid_count: 357 (2.11%)
-- fb_lead_id: ~1,078 (6.36%)
-- platforms: google, meta, direct, other
