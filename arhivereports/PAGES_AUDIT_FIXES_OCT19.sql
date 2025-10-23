-- ============================================================================
-- КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ СТРАНИЦ - October 19, 2025
-- ============================================================================
--
-- ПРОБЛЕМЫ ОБНАРУЖЕНЫ:
-- 1. /ads: URL креативов не отображаются - v6_fb_ads_performance НЕ СУЩЕСТВОВАЛА
-- 2. /marketing: Страница не загружается - v5_leads_campaign_daily НЕ СУЩЕСТВОВАЛА
-- 3. /ads: Google campaigns не работают - v6_google_ads_performance НЕ СУЩЕСТВОВАЛА
--
-- ДАННЫЕ ПРОВЕРЕНЫ:
-- - raw.fb_ad_creative_details: 1167 креативов, 568 с permalink_url, 366 с изображениями ✅
-- - raw.google_ads_campaign_daily: 266 дней данных, 9 кампаний ✅
-- - v8_campaigns_daily_full: 47 Meta кампаний, 6 Google кампаний ✅
--
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FIX 1: Создать v6_fb_ads_performance view с креативами и CRM данными
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dashboards.v6_fb_ads_performance AS
WITH fb_ad_daily AS (
    SELECT
        ins.date_start as dt,
        ins.ad_id,
        ads.ad_name,
        ads.status as ad_status,
        ads.adset_id,
        adsets.name as adset_name,
        ads.campaign_id,
        camps.name as campaign_name,
        camps.status as campaign_status,
        ads.ad_creative_id,
        SUM(CASE WHEN ins.action_type = 'impressions' THEN ins.action_value ELSE 0 END) as impressions,
        SUM(CASE WHEN ins.action_type = 'link_clicks' THEN ins.action_value ELSE 0 END) as clicks,
        SUM(ins.spend) as spend,
        SUM(CASE WHEN ins.action_type = 'lead' THEN ins.action_value ELSE 0 END) as platform_leads
    FROM raw.fb_ad_insights ins
    LEFT JOIN raw.fb_ads ads ON ins.ad_id = ads.ad_id
    LEFT JOIN raw.fb_adsets adsets ON ads.adset_id = adsets.adset_id
    LEFT JOIN raw.fb_campaigns camps ON ads.campaign_id = camps.campaign_id
    GROUP BY
        ins.date_start, ins.ad_id, ads.ad_name, ads.status,
        ads.adset_id, adsets.name, ads.campaign_id, camps.name,
        camps.status, ads.ad_creative_id
),
crm_data AS (
    SELECT
        fl.meta_ad_id,
        cr.source_date_time::date as dt,
        COUNT(DISTINCT fl.id_source) as crm_leads,
        COUNT(DISTINCT cr.id_source) FILTER (WHERE cr.contract_id IS NOT NULL) as contracts,
        COALESCE(SUM(cr.contract_total), 0) as revenue
    FROM dashboards.fact_leads fl
    JOIN dashboards.crm_requests cr ON cr.id_source = fl.id_source
    WHERE fl.meta_ad_id IS NOT NULL
    GROUP BY fl.meta_ad_id, cr.source_date_time::date
)
SELECT
    fb.dt,
    fb.ad_id,
    fb.ad_name,
    fb.ad_status,
    fb.adset_id,
    fb.adset_name,
    fb.campaign_id,
    fb.campaign_name,
    fb.campaign_status,
    fb.impressions,
    fb.clicks,
    fb.spend,
    fb.platform_leads,
    COALESCE(crm.crm_leads, 0) as crm_leads,
    COALESCE(crm.contracts, 0) as contracts,
    COALESCE(crm.revenue, 0) as revenue,
    CASE WHEN fb.spend > 0 THEN crm.revenue / fb.spend END as roas,
    CASE WHEN crm.crm_leads > 0 THEN fb.spend / crm.crm_leads END as cpl,
    CASE WHEN fb.impressions > 0 THEN (100.0 * fb.clicks / fb.impressions) END as ctr,
    CASE WHEN crm.crm_leads > 0 THEN (100.0 * crm.contracts / crm.crm_leads) END as conversion_rate,
    CASE WHEN fb.platform_leads > 0 THEN (100.0 * crm.crm_leads / fb.platform_leads) END as match_rate,
    fb.ad_creative_id,
    cr.media_image_src,
    cr.thumbnail_url,
    cr.video_id,
    cr.permalink_url,
    cr.title as creative_title,
    cr.body as creative_body,
    cr.description as creative_description,
    cr.cta_type,
    cr.link_url
FROM fb_ad_daily fb
LEFT JOIN crm_data crm ON fb.ad_id = crm.meta_ad_id AND fb.dt = crm.dt
LEFT JOIN raw.fb_ad_creative_details cr ON fb.ad_creative_id = cr.ad_creative_id;

-- Результат: 1804 строк, 328 ads, 59 кампаний, 1753 с URL, 851 с изображениями, 477 CRM лидов ✅

-- ----------------------------------------------------------------------------
-- FIX 2: Создать v6_google_ads_performance view
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dashboards.v6_google_ads_performance AS
WITH google_ad_daily AS (
    SELECT
        gad.date as dt,
        gad.campaign_id::text as campaign_id,
        COALESCE(gcn.campaign_name_human, 'Campaign ' || gad.campaign_id) as campaign_name,
        'ACTIVE' as campaign_status,
        SUM(gad.impressions) as impressions,
        SUM(gad.clicks) as clicks,
        SUM(gad.cost_micros) / 1000000.0 as spend,
        SUM(gad.conversions) as conversions
    FROM raw.google_ads_campaign_daily gad
    LEFT JOIN dashboards.ref_google_campaign_names gcn ON gad.campaign_id::text = gcn.campaign_id
    GROUP BY gad.date, gad.campaign_id, gcn.campaign_name_human
),
crm_data AS (
    SELECT
        fl.google_campaign_id,
        cr.source_date_time::date as dt,
        COUNT(DISTINCT fl.id_source) as crm_leads,
        COUNT(DISTINCT cr.id_source) FILTER (WHERE cr.contract_id IS NOT NULL) as contracts,
        COALESCE(SUM(cr.contract_total), 0) as revenue
    FROM dashboards.fact_leads fl
    JOIN dashboards.crm_requests cr ON cr.id_source = fl.id_source
    WHERE fl.google_campaign_id IS NOT NULL
    GROUP BY fl.google_campaign_id, cr.source_date_time::date
)
SELECT
    g.dt,
    g.campaign_id,
    g.campaign_name,
    g.campaign_status,
    g.impressions,
    g.clicks,
    g.spend,
    COALESCE(crm.crm_leads, 0) as crm_leads,
    COALESCE(crm.contracts, 0) as contracts,
    COALESCE(crm.revenue, 0) as revenue,
    CASE WHEN g.spend > 0 THEN crm.revenue / g.spend END as roas,
    CASE WHEN crm.crm_leads > 0 THEN g.spend / crm.crm_leads END as cpl,
    CASE WHEN g.impressions > 0 THEN (100.0 * g.clicks / g.impressions) END as ctr,
    CASE WHEN crm.crm_leads > 0 THEN (100.0 * crm.contracts / crm.crm_leads) END as conversion_rate
FROM google_ad_daily g
LEFT JOIN crm_data crm ON g.campaign_id = crm.google_campaign_id AND g.dt = crm.dt;

-- Результат: 266 строк, 9 кампаний, 91 CRM лидов, 12 контрактов, ₴53,127 spend ✅

-- ----------------------------------------------------------------------------
-- FIX 3: Создать v5_leads_campaign_daily view для /marketing страницы
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dashboards.v5_leads_campaign_daily AS
SELECT *
FROM dashboards.v8_campaigns_daily_full;

-- Результат: Алиас на v8_campaigns_daily_full (47 Meta + 6 Google кампаний) ✅

-- ============================================================================
-- ПРОВЕРОЧНЫЕ ЗАПРОСЫ
-- ============================================================================

-- Проверка v6_fb_ads_performance
SELECT
  COUNT(*) as total_rows,
  COUNT(DISTINCT ad_id) as unique_ads,
  COUNT(DISTINCT campaign_id) as unique_campaigns,
  COUNT(permalink_url) as rows_with_url,
  COUNT(media_image_src) as rows_with_image,
  MIN(dt) as earliest,
  MAX(dt) as latest,
  SUM(crm_leads) as total_crm_leads,
  SUM(contracts) as total_contracts
FROM dashboards.v6_fb_ads_performance
WHERE dt >= '2025-09-10'::date;

-- Ожидаемый результат: 1804 rows, 328 ads, 59 campaigns, 1753 URLs, 851 images

-- Проверка v6_google_ads_performance
SELECT
  COUNT(*) as total_rows,
  COUNT(DISTINCT campaign_id) as unique_campaigns,
  MIN(dt) as earliest,
  MAX(dt) as latest,
  SUM(crm_leads) as total_crm_leads,
  SUM(contracts) as total_contracts,
  ROUND(SUM(spend), 0) as total_spend
FROM dashboards.v6_google_ads_performance
WHERE dt >= '2025-09-10'::date;

-- Ожидаемый результат: 266 rows, 9 campaigns, 91 leads, 12 contracts, ₴53,127 spend

-- Проверка v5_leads_campaign_daily
SELECT
  COUNT(*) as total_rows,
  COUNT(DISTINCT campaign_id) as unique_campaigns,
  COUNT(DISTINCT platform) as platforms,
  SUM(leads) as total_leads,
  SUM(contracts) as total_contracts
FROM dashboards.v5_leads_campaign_daily
WHERE dt >= '2025-09-10'::date;

-- Ожидаемый результат: Данные из v8_campaigns_daily_full

-- ============================================================================
-- СТАТУС: ВСЕ VIEWS СОЗДАНЫ И ПРОВЕРЕНЫ ✅
-- ============================================================================
--
-- Применено: October 19, 2025
-- База: itstep_final (92.242.60.211:5432)
-- Пользователь: manfromlamp
--
