-- ============================================================================
-- ОБНОВЛЕНИЕ v8 VIEWS С МЕТРИКАМИ ИЗ v6 (spend, clicks, impressions)
-- Дата: October 19, 2025
-- Использует ПРАВИЛЬНУЮ архитектуру: fact_leads + crm_requests + ad performance
-- ============================================================================

BEGIN;

-- ============================================================================
-- v8_campaigns_daily_full: Полные метрики по кампаниям (leads + ad performance)
-- ============================================================================
CREATE OR REPLACE VIEW dashboards.v8_campaigns_daily_full AS
WITH google_ads AS (
  SELECT
    gcd.date AS dt,
    gcd.campaign_id::TEXT AS campaign_id,
    gcd.campaign_name,
    SUM(gcd.impressions) AS impressions,
    SUM(gcd.clicks) AS clicks,
    SUM(gcd.cost_micros) / 1000000.0 AS spend,
    AVG(gcd.ctr) AS ctr,
    SUM(gcd.conversions) AS conversions
  FROM raw.google_ads_campaign_daily gcd
  WHERE gcd.date >= CURRENT_DATE - 90
  GROUP BY gcd.date, gcd.campaign_id, gcd.campaign_name
),
fb_ads AS (
  SELECT
    fbi.date_start AS dt,
    fbi.campaign_id,
    MAX(c.name) AS campaign_name,
    SUM(fbi.impressions) AS impressions,
    SUM(fbi.clicks) AS clicks,
    SUM(fbi.spend) AS spend
  FROM raw.fb_ad_insights fbi
  LEFT JOIN raw.fb_campaigns c ON c.campaign_id = fbi.campaign_id
  WHERE fbi.date_start >= CURRENT_DATE - 90
  GROUP BY fbi.date_start, fbi.campaign_id
),
leads_contracts AS (
  SELECT
    cr.source_date_time::DATE AS dt,
    COALESCE(fl.google_campaign_name, fl.meta_campaign_name, 'Direct') AS campaign_name,
    COALESCE(fl.google_campaign_id, fl.meta_campaign_id) AS campaign_id,
    CASE
      WHEN fl.google_campaign_id IS NOT NULL THEN 'Google Ads'
      WHEN fl.meta_campaign_id IS NOT NULL THEN 'Meta'
      ELSE 'Direct'
    END AS platform,
    COUNT(DISTINCT fl.id_source) AS leads,
    COUNT(DISTINCT fl.id_source) FILTER (WHERE cr.contract_id IS NOT NULL) AS contracts,
    SUM(cr.contract_total) AS revenue,
    ROUND(AVG(cr.contract_total) FILTER (WHERE cr.contract_id IS NOT NULL), 2) AS avg_contract
  FROM dashboards.fact_leads fl
  JOIN dashboards.crm_requests cr ON cr.id_source = fl.id_source
  WHERE cr.source_date_time >= CURRENT_DATE - 90
  GROUP BY cr.source_date_time::DATE,
           COALESCE(fl.google_campaign_name, fl.meta_campaign_name, 'Direct'),
           COALESCE(fl.google_campaign_id, fl.meta_campaign_id),
           CASE
             WHEN fl.google_campaign_id IS NOT NULL THEN 'Google Ads'
             WHEN fl.meta_campaign_id IS NOT NULL THEN 'Meta'
             ELSE 'Direct'
           END
)
SELECT
  lc.dt,
  lc.campaign_name,
  lc.campaign_id,
  lc.platform,
  lc.leads,
  lc.contracts,
  lc.revenue,
  lc.avg_contract,
  -- Ad performance metrics (unified Google + Facebook)
  COALESCE(ga.impressions, fb.impressions, 0) AS impressions,
  COALESCE(ga.clicks, fb.clicks, 0) AS clicks,
  COALESCE(ga.spend, fb.spend, 0) AS spend,
  COALESCE(ga.conversions, 0) AS ad_conversions,
  -- Calculated KPIs
  CASE
    WHEN lc.leads > 0 AND (COALESCE(ga.spend, 0) + COALESCE(fb.spend, 0)) > 0
    THEN ROUND((COALESCE(ga.spend, 0) + COALESCE(fb.spend, 0)) / lc.leads, 2)
    ELSE NULL
  END AS cpl,
  CASE
    WHEN (COALESCE(ga.spend, 0) + COALESCE(fb.spend, 0)) > 0 AND lc.revenue > 0
    THEN ROUND(lc.revenue / (COALESCE(ga.spend, 0) + COALESCE(fb.spend, 0)), 2)
    ELSE NULL
  END AS roas,
  CASE
    WHEN COALESCE(ga.impressions, fb.impressions, 0) > 0 AND COALESCE(ga.clicks, fb.clicks, 0) > 0
    THEN ROUND(100.0 * COALESCE(ga.clicks, fb.clicks, 0) / COALESCE(ga.impressions, fb.impressions, 0), 4)
    ELSE NULL
  END AS ctr,
  CASE
    WHEN lc.leads > 0
    THEN ROUND(100.0 * lc.contracts / lc.leads, 2)
    ELSE NULL
  END AS conversion_rate
FROM leads_contracts lc
LEFT JOIN google_ads ga ON ga.dt = lc.dt AND ga.campaign_id = lc.campaign_id
LEFT JOIN fb_ads fb ON fb.dt = lc.dt AND fb.campaign_id = lc.campaign_id
ORDER BY lc.dt DESC, lc.leads DESC;

COMMENT ON VIEW dashboards.v8_campaigns_daily_full IS
'Полные метрики по кампаниям: leads, contracts, revenue + ad performance (clicks, impressions, spend, CPL, ROAS)';

-- ============================================================================
-- v8_platform_daily_full: Полные метрики по платформам
-- ============================================================================
CREATE OR REPLACE VIEW dashboards.v8_platform_daily_full AS
WITH google_ads AS (
  SELECT
    gcd.date AS dt,
    SUM(gcd.impressions) AS impressions,
    SUM(gcd.clicks) AS clicks,
    SUM(gcd.cost_micros) / 1000000.0 AS spend,
    SUM(gcd.conversions) AS conversions
  FROM raw.google_ads_campaign_daily gcd
  WHERE gcd.date >= CURRENT_DATE - 90
  GROUP BY gcd.date
),
fb_ads AS (
  SELECT
    fbi.date_start AS dt,
    SUM(fbi.impressions) AS impressions,
    SUM(fbi.clicks) AS clicks,
    SUM(fbi.spend) AS spend
  FROM raw.fb_ad_insights fbi
  WHERE fbi.date_start >= CURRENT_DATE - 90
  GROUP BY fbi.date_start
),
leads_contracts AS (
  SELECT
    cr.source_date_time::DATE AS dt,
    CASE
      WHEN fl.gclid IS NOT NULL OR fl.google_campaign_id IS NOT NULL THEN 'Google Ads'
      WHEN fl.fb_lead_id IS NOT NULL OR fl.meta_campaign_id IS NOT NULL THEN 'Meta'
      WHEN fl.utm_source IS NOT NULL THEN 'Other Paid'
      ELSE 'Direct'
    END AS platform,
    COUNT(DISTINCT fl.id_source) AS leads,
    COUNT(DISTINCT fl.id_source) FILTER (WHERE cr.contract_id IS NOT NULL) AS contracts,
    SUM(cr.contract_total) AS revenue
  FROM dashboards.fact_leads fl
  JOIN dashboards.crm_requests cr ON cr.id_source = fl.id_source
  WHERE cr.source_date_time >= CURRENT_DATE - 90
  GROUP BY cr.source_date_time::DATE,
           CASE
             WHEN fl.gclid IS NOT NULL OR fl.google_campaign_id IS NOT NULL THEN 'Google Ads'
             WHEN fl.fb_lead_id IS NOT NULL OR fl.meta_campaign_id IS NOT NULL THEN 'Meta'
             WHEN fl.utm_source IS NOT NULL THEN 'Other Paid'
             ELSE 'Direct'
           END
)
SELECT
  lc.dt,
  lc.platform,
  lc.leads,
  lc.contracts,
  lc.revenue,
  -- Ad performance metrics (platform-specific)
  CASE
    WHEN lc.platform = 'Google Ads' THEN COALESCE(ga.impressions, 0)
    WHEN lc.platform = 'Meta' THEN COALESCE(fb.impressions, 0)
    ELSE 0
  END AS impressions,
  CASE
    WHEN lc.platform = 'Google Ads' THEN COALESCE(ga.clicks, 0)
    WHEN lc.platform = 'Meta' THEN COALESCE(fb.clicks, 0)
    ELSE 0
  END AS clicks,
  CASE
    WHEN lc.platform = 'Google Ads' THEN COALESCE(ga.spend, 0)
    WHEN lc.platform = 'Meta' THEN COALESCE(fb.spend, 0)
    ELSE 0
  END AS spend,
  CASE WHEN lc.platform = 'Google Ads' THEN COALESCE(ga.conversions, 0) ELSE 0 END AS ad_conversions,
  -- Calculated KPIs
  CASE
    WHEN lc.leads > 0
    THEN ROUND(100.0 * lc.contracts / lc.leads, 2)
    ELSE NULL
  END AS conversion_rate,
  CASE
    WHEN lc.platform IN ('Google Ads', 'Meta') AND lc.leads > 0
    THEN ROUND(
      CASE
        WHEN lc.platform = 'Google Ads' THEN COALESCE(ga.spend, 0)
        WHEN lc.platform = 'Meta' THEN COALESCE(fb.spend, 0)
      END / lc.leads, 2)
    ELSE NULL
  END AS cpl,
  CASE
    WHEN lc.platform IN ('Google Ads', 'Meta') AND lc.revenue > 0
    THEN ROUND(
      lc.revenue /
      CASE
        WHEN lc.platform = 'Google Ads' THEN NULLIF(COALESCE(ga.spend, 0), 0)
        WHEN lc.platform = 'Meta' THEN NULLIF(COALESCE(fb.spend, 0), 0)
      END, 2)
    ELSE NULL
  END AS roas,
  CASE
    WHEN lc.platform = 'Google Ads' AND COALESCE(ga.impressions, 0) > 0
    THEN ROUND(100.0 * COALESCE(ga.clicks, 0) / ga.impressions, 4)
    WHEN lc.platform = 'Meta' AND COALESCE(fb.impressions, 0) > 0
    THEN ROUND(100.0 * COALESCE(fb.clicks, 0) / fb.impressions, 4)
    ELSE NULL
  END AS ctr
FROM leads_contracts lc
LEFT JOIN google_ads ga ON ga.dt = lc.dt AND lc.platform = 'Google Ads'
LEFT JOIN fb_ads fb ON fb.dt = lc.dt AND lc.platform = 'Meta'
ORDER BY lc.dt DESC, lc.leads DESC;

COMMENT ON VIEW dashboards.v8_platform_daily_full IS
'Полные метрики по платформам: leads, contracts, revenue + ad performance (clicks, impressions, spend, CPL, ROAS, CTR)';

-- ============================================================================
-- Оставить старые v8 views БЕЗ ИЗМЕНЕНИЙ (для обратной совместимости)
-- Новые views: v8_campaigns_daily_full, v8_platform_daily_full
-- ============================================================================

COMMIT;

-- ============================================================================
-- ПРОВЕРКА РЕЗУЛЬТАТА
-- ============================================================================

-- Проверка 1: v8_campaigns_daily_full имеет все метрики
SELECT
  COUNT(*) AS total_rows,
  COUNT(*) FILTER (WHERE spend > 0) AS rows_with_spend,
  COUNT(*) FILTER (WHERE clicks > 0) AS rows_with_clicks,
  COUNT(*) FILTER (WHERE impressions > 0) AS rows_with_impressions,
  COUNT(*) FILTER (WHERE cpl IS NOT NULL) AS rows_with_cpl,
  COUNT(*) FILTER (WHERE roas IS NOT NULL) AS rows_with_roas
FROM dashboards.v8_campaigns_daily_full;

-- Проверка 2: v8_platform_daily_full имеет все метрики
SELECT
  platform,
  COUNT(*) AS days,
  SUM(leads) AS total_leads,
  SUM(contracts) AS total_contracts,
  SUM(revenue) AS total_revenue,
  SUM(spend) AS total_spend,
  ROUND(AVG(conversion_rate), 2) AS avg_conversion_rate
FROM dashboards.v8_platform_daily_full
GROUP BY platform
ORDER BY total_leads DESC;

-- Проверка 3: Список всех v8 views
SELECT viewname, obj_description(oid, 'pg_class') AS description
FROM pg_views v
JOIN pg_class c ON c.relname = v.viewname
WHERE schemaname = 'dashboards' AND viewname LIKE 'v8_%'
ORDER BY viewname;
