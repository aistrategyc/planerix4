-- ============================================================================
-- CRITICAL FIX: Reclassify Instagram, Google CPC, Email, Telegram in fact_leads
-- Date: October 19, 2025
-- ============================================================================
--
-- PROBLEM: 57+ Instagram leads classified as 'other', losing 2 contracts
-- SOLUTION: Update dominant_platform in fact_leads + update v8 views
--
-- EXPECTED RESULT:
--   Meta: 1,007 → 1,100+ leads (+ Instagram), 4 → 6+ contracts
--   Google Ads: 155 → 215+ leads (+ Google CPC)
--   Email: new category (22 leads)
--   Telegram: new category (20 leads)
-- ============================================================================

-- ============================================================================
-- STEP 1: Fix Instagram Leads (Instagram = META)
-- ============================================================================

-- Show current Instagram classification BEFORE fix
SELECT
  'BEFORE FIX: Instagram' as status,
  dominant_platform,
  COUNT(*) as leads,
  COUNT(DISTINCT CASE WHEN cr.contract_id IS NOT NULL THEN fl.id_source END) as contracts
FROM dashboards.fact_leads fl
LEFT JOIN dashboards.crm_requests cr ON cr.id_source = fl.id_source
WHERE fl.created_date_txt::date >= '2025-09-01'
  AND (
    LOWER(fl.utm_source) LIKE '%instagram%'
    OR fl.utm_source = 'ig'
  )
GROUP BY fl.dominant_platform
ORDER BY leads DESC;

-- FIX: Reclassify Instagram as Meta
UPDATE dashboards.fact_leads
SET dominant_platform = 'meta'
WHERE (
  LOWER(utm_source) LIKE '%instagram%'
  OR utm_source = 'ig'
)
AND dominant_platform IN ('other', 'paid_other', 'direct');

-- Verify fix
SELECT
  'AFTER FIX: Instagram' as status,
  dominant_platform,
  COUNT(*) as leads
FROM dashboards.fact_leads
WHERE created_date_txt::date >= '2025-09-01'
  AND (
    LOWER(utm_source) LIKE '%instagram%'
    OR utm_source = 'ig'
  )
GROUP BY dominant_platform;

-- ============================================================================
-- STEP 2: Fix Google CPC Leads (Google utm_source + CPC medium = Google Ads)
-- ============================================================================

-- Show current Google CPC classification BEFORE fix
SELECT
  'BEFORE FIX: Google CPC' as status,
  dominant_platform,
  COUNT(*) as leads
FROM dashboards.fact_leads
WHERE created_date_txt::date >= '2025-09-01'
  AND utm_source = 'google'
  AND (utm_medium = 'cpc' OR utm_medium = 'ppc')
GROUP BY dominant_platform;

-- FIX: Reclassify Google CPC as Google
UPDATE dashboards.fact_leads
SET dominant_platform = 'google'
WHERE utm_source = 'google'
  AND (utm_medium = 'cpc' OR utm_medium = 'ppc')
  AND dominant_platform IN ('other', 'paid_other', 'direct');

-- Verify fix
SELECT
  'AFTER FIX: Google CPC' as status,
  dominant_platform,
  COUNT(*) as leads
FROM dashboards.fact_leads
WHERE created_date_txt::date >= '2025-09-01'
  AND utm_source = 'google'
  AND (utm_medium = 'cpc' OR utm_medium = 'ppc')
GROUP BY dominant_platform;

-- ============================================================================
-- STEP 3: Create Email Category
-- ============================================================================

-- Show current Email classification BEFORE fix
SELECT
  'BEFORE FIX: Email' as status,
  dominant_platform,
  COUNT(*) as leads
FROM dashboards.fact_leads
WHERE created_date_txt::date >= '2025-09-01'
  AND (
    LOWER(utm_source) LIKE '%email%'
    OR utm_source = 'sendpulse'
    OR utm_medium = 'email'
  )
GROUP BY dominant_platform;

-- FIX: Create Email category
UPDATE dashboards.fact_leads
SET dominant_platform = 'email'
WHERE (
  LOWER(utm_source) LIKE '%email%'
  OR utm_source = 'sendpulse'
  OR utm_medium = 'email'
)
AND dominant_platform IN ('other', 'paid_other', 'direct');

-- Verify fix
SELECT
  'AFTER FIX: Email' as status,
  COUNT(*) as leads
FROM dashboards.fact_leads
WHERE created_date_txt::date >= '2025-09-01'
  AND dominant_platform = 'email';

-- ============================================================================
-- STEP 4: Create Telegram Category
-- ============================================================================

-- Show current Telegram classification BEFORE fix
SELECT
  'BEFORE FIX: Telegram' as status,
  dominant_platform,
  COUNT(*) as leads
FROM dashboards.fact_leads
WHERE created_date_txt::date >= '2025-09-01'
  AND (
    LOWER(utm_source) LIKE '%telegram%'
    OR utm_source = 'tgchanel'
    OR utm_source LIKE 'tg_%'
  )
GROUP BY dominant_platform;

-- FIX: Create Telegram category
UPDATE dashboards.fact_leads
SET dominant_platform = 'telegram'
WHERE (
  LOWER(utm_source) LIKE '%telegram%'
  OR utm_source = 'tgchanel'
  OR utm_source LIKE 'tg_%'
)
AND dominant_platform IN ('other', 'paid_other', 'direct');

-- Verify fix
SELECT
  'AFTER FIX: Telegram' as status,
  COUNT(*) as leads
FROM dashboards.fact_leads
WHERE created_date_txt::date >= '2025-09-01'
  AND dominant_platform = 'telegram';

-- ============================================================================
-- STEP 5: Create Viber Category
-- ============================================================================

-- FIX: Create Viber category
UPDATE dashboards.fact_leads
SET dominant_platform = 'viber'
WHERE utm_source = 'viber'
  AND dominant_platform IN ('other', 'paid_other', 'direct');

-- ============================================================================
-- STEP 6: Update v8_platform_daily_full with ALL platforms
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
        cr.source_date_time::date AS dt,
        CASE
            -- Google Ads (includes Google CPC)
            WHEN fl.gclid IS NOT NULL
                 OR fl.google_campaign_id IS NOT NULL
                 OR fl.dominant_platform = 'google'
                 OR (fl.utm_source = 'google' AND (fl.utm_medium = 'cpc' OR fl.utm_medium = 'ppc'))
                 THEN 'Google Ads'

            -- Meta (Facebook + Instagram)
            WHEN fl.fb_lead_id IS NOT NULL
                 OR fl.meta_campaign_id IS NOT NULL
                 OR fl.fbclid IS NOT NULL
                 OR fl.dominant_platform = 'meta'
                 OR LOWER(fl.utm_source) LIKE '%facebook%'
                 OR LOWER(fl.utm_source) LIKE '%meta%'
                 OR LOWER(fl.utm_source) LIKE '%instagram%'
                 OR fl.utm_source = 'fb'
                 OR fl.utm_source = 'ig'
                 THEN 'Meta'

            -- Email
            WHEN fl.dominant_platform = 'email'
                 OR LOWER(fl.utm_source) LIKE '%email%'
                 OR fl.utm_source = 'sendpulse'
                 OR fl.utm_medium = 'email'
                 THEN 'Email'

            -- Telegram
            WHEN fl.dominant_platform = 'telegram'
                 OR LOWER(fl.utm_source) LIKE '%telegram%'
                 OR fl.utm_source = 'tgchanel'
                 OR fl.utm_source LIKE 'tg_%'
                 THEN 'Telegram'

            -- Viber
            WHEN fl.dominant_platform = 'viber'
                 OR fl.utm_source = 'viber'
                 THEN 'Viber'

            -- Other Paid (has UTM but not identified)
            WHEN fl.utm_source IS NOT NULL
                 AND fl.utm_source != ''
                 THEN 'Other Paid'

            -- Direct (no UTM at all)
            ELSE 'Direct'
        END AS platform,
        COUNT(DISTINCT fl.id_source) AS leads,
        COUNT(DISTINCT fl.id_source) FILTER (WHERE cr.contract_id IS NOT NULL) AS contracts,
        SUM(cr.contract_total) AS revenue
    FROM dashboards.fact_leads fl
    JOIN dashboards.crm_requests cr ON cr.id_source = fl.id_source
    WHERE cr.source_date_time >= CURRENT_DATE - 90
    GROUP BY
        cr.source_date_time::date,
        CASE
            WHEN fl.gclid IS NOT NULL
                 OR fl.google_campaign_id IS NOT NULL
                 OR fl.dominant_platform = 'google'
                 OR (fl.utm_source = 'google' AND (fl.utm_medium = 'cpc' OR fl.utm_medium = 'ppc'))
                 THEN 'Google Ads'
            WHEN fl.fb_lead_id IS NOT NULL
                 OR fl.meta_campaign_id IS NOT NULL
                 OR fl.fbclid IS NOT NULL
                 OR fl.dominant_platform = 'meta'
                 OR LOWER(fl.utm_source) LIKE '%facebook%'
                 OR LOWER(fl.utm_source) LIKE '%meta%'
                 OR LOWER(fl.utm_source) LIKE '%instagram%'
                 OR fl.utm_source = 'fb'
                 OR fl.utm_source = 'ig'
                 THEN 'Meta'
            WHEN fl.dominant_platform = 'email'
                 OR LOWER(fl.utm_source) LIKE '%email%'
                 OR fl.utm_source = 'sendpulse'
                 OR fl.utm_medium = 'email'
                 THEN 'Email'
            WHEN fl.dominant_platform = 'telegram'
                 OR LOWER(fl.utm_source) LIKE '%telegram%'
                 OR fl.utm_source = 'tgchanel'
                 OR fl.utm_source LIKE 'tg_%'
                 THEN 'Telegram'
            WHEN fl.dominant_platform = 'viber'
                 OR fl.utm_source = 'viber'
                 THEN 'Viber'
            WHEN fl.utm_source IS NOT NULL
                 AND fl.utm_source != ''
                 THEN 'Other Paid'
            ELSE 'Direct'
        END
)
SELECT
    lc.dt,
    lc.platform,
    lc.leads,
    lc.contracts,
    lc.revenue,
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
    CASE
        WHEN lc.platform = 'Google Ads' THEN COALESCE(ga.conversions, 0)
        ELSE 0
    END AS ad_conversions,
    CASE
        WHEN lc.leads > 0 THEN ROUND(100.0 * lc.contracts / lc.leads, 2)
        ELSE NULL
    END AS conversion_rate,
    CASE
        WHEN lc.platform IN ('Google Ads', 'Meta') AND lc.leads > 0 THEN ROUND(
            CASE
                WHEN lc.platform = 'Google Ads' THEN COALESCE(ga.spend, 0)
                WHEN lc.platform = 'Meta' THEN COALESCE(fb.spend, 0)
            END / lc.leads, 2)
        ELSE NULL
    END AS cpl,
    CASE
        WHEN lc.platform IN ('Google Ads', 'Meta') AND lc.revenue > 0 THEN ROUND(
            lc.revenue / NULLIF(
                CASE
                    WHEN lc.platform = 'Google Ads' THEN COALESCE(ga.spend, 0)
                    WHEN lc.platform = 'Meta' THEN COALESCE(fb.spend, 0)
                END, 0), 2)
        ELSE NULL
    END AS roas,
    CASE
        WHEN lc.platform = 'Google Ads' AND COALESCE(ga.impressions, 0) > 0 THEN ROUND(100.0 * COALESCE(ga.clicks, 0) / ga.impressions, 4)
        WHEN lc.platform = 'Meta' AND COALESCE(fb.impressions, 0) > 0 THEN ROUND(100.0 * COALESCE(fb.clicks, 0) / fb.impressions, 4)
        ELSE NULL
    END AS ctr
FROM leads_contracts lc
LEFT JOIN google_ads ga ON ga.dt = lc.dt AND lc.platform = 'Google Ads'
LEFT JOIN fb_ads fb ON fb.dt = lc.dt AND lc.platform = 'Meta'
ORDER BY lc.dt DESC, lc.leads DESC;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test 1: Check all platforms with contracts
SELECT
  platform,
  SUM(leads) as total_leads,
  SUM(contracts) as total_contracts,
  SUM(revenue) as total_revenue,
  ROUND(100.0 * SUM(contracts) / NULLIF(SUM(leads), 0), 2) as conversion_rate
FROM dashboards.v8_platform_daily_full
WHERE dt >= '2025-09-01' AND dt <= '2025-10-19'
GROUP BY platform
ORDER BY total_contracts DESC;

-- Expected results:
-- Direct: ~14,300+ leads, 380+ contracts
-- Meta (Facebook + Instagram): ~1,100+ leads, 6+ contracts
-- Google Ads: ~215+ leads, 15+ contracts
-- Email: 22 leads, 0 contracts
-- Telegram: 20 leads, 0 contracts
-- Other Paid: reduced (moved to specific categories)

-- Test 2: Show Instagram contracts details
SELECT
  fl.utm_source,
  fl.dominant_platform,
  COUNT(DISTINCT fl.id_source) as leads,
  COUNT(DISTINCT cr.id_source) FILTER (WHERE cr.contract_id IS NOT NULL) as contracts,
  SUM(cr.contract_total) as revenue
FROM dashboards.fact_leads fl
LEFT JOIN dashboards.crm_requests cr ON cr.id_source = fl.id_source
WHERE fl.created_date_txt::date >= '2025-09-01'
  AND LOWER(fl.utm_source) LIKE '%instagram%'
GROUP BY fl.utm_source, fl.dominant_platform
ORDER BY contracts DESC, leads DESC;

-- Test 3: Platform breakdown with details
SELECT
  platform,
  COUNT(DISTINCT fl.utm_source) as unique_sources,
  SUM(leads) as leads,
  SUM(contracts) as contracts
FROM dashboards.v8_platform_daily_full
WHERE dt >= '2025-09-01'
GROUP BY platform
ORDER BY leads DESC;
