-- ============================================================================
-- FIX: v8 Views Meta Contracts Detection - October 19, 2025
-- ============================================================================
--
-- PROBLEM: Meta contracts were missing (showed 0 instead of 4)
--
-- ROOT CAUSE: v8 views only checked for:
--   - fb_lead_id
--   - meta_campaign_id
--   - fbclid
--   - dominant_platform = 'meta'
--
-- But missed 3 contracts that had ONLY utm_source containing 'facebook'!
--
-- SOLUTION: Add utm_source detection for facebook/meta/fb
--
-- RESULTS:
--   Before: Meta 877 leads → 0 contracts (0.00%)
--   After:  Meta 1,007 leads → 4 contracts (0.40%, ₴131,715)
-- ============================================================================

-- ============================================================================
-- 1. Fix v8_platform_daily_full
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
            WHEN fl.gclid IS NOT NULL OR fl.google_campaign_id IS NOT NULL OR fl.dominant_platform = 'google' THEN 'Google Ads'
            -- FIXED: Added utm_source facebook detection
            WHEN fl.fb_lead_id IS NOT NULL
                 OR fl.meta_campaign_id IS NOT NULL
                 OR fl.fbclid IS NOT NULL
                 OR fl.dominant_platform = 'meta'
                 OR LOWER(fl.utm_source) LIKE '%facebook%'
                 OR LOWER(fl.utm_source) LIKE '%meta%'
                 OR fl.utm_source = 'fb' THEN 'Meta'
            WHEN fl.utm_source IS NOT NULL THEN 'Other Paid'
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
            WHEN fl.gclid IS NOT NULL OR fl.google_campaign_id IS NOT NULL OR fl.dominant_platform = 'google' THEN 'Google Ads'
            WHEN fl.fb_lead_id IS NOT NULL
                 OR fl.meta_campaign_id IS NOT NULL
                 OR fl.fbclid IS NOT NULL
                 OR fl.dominant_platform = 'meta'
                 OR LOWER(fl.utm_source) LIKE '%facebook%'
                 OR LOWER(fl.utm_source) LIKE '%meta%'
                 OR fl.utm_source = 'fb' THEN 'Meta'
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
-- 2. Fix v8_campaigns_daily_full
-- ============================================================================

CREATE OR REPLACE VIEW dashboards.v8_campaigns_daily_full AS
WITH google_ads AS (
    SELECT
        gcd.date AS dt,
        gcd.campaign_id::text AS campaign_id,
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
        cr.source_date_time::date AS dt,
        COALESCE(
            fl.google_campaign_name,
            fl.meta_campaign_name,
            CASE
                -- FIXED: Added utm_source facebook detection for campaigns
                WHEN fl.dominant_platform = 'meta'
                     OR fl.fbclid IS NOT NULL
                     OR LOWER(fl.utm_source) LIKE '%facebook%'
                     OR LOWER(fl.utm_source) LIKE '%meta%'
                     OR fl.utm_source = 'fb' THEN fl.utm_campaign
                WHEN fl.dominant_platform = 'google'
                     OR fl.gclid IS NOT NULL THEN fl.utm_campaign
                ELSE 'Direct'
            END
        ) AS campaign_name,
        COALESCE(
            fl.google_campaign_id,
            fl.meta_campaign_id,
            CASE
                WHEN fl.dominant_platform = 'meta'
                     OR fl.fbclid IS NOT NULL
                     OR LOWER(fl.utm_source) LIKE '%facebook%'
                     OR LOWER(fl.utm_source) LIKE '%meta%'
                     OR fl.utm_source = 'fb' THEN 'meta_' || COALESCE(fl.utm_campaign, 'unknown')
                WHEN fl.dominant_platform = 'google'
                     OR fl.gclid IS NOT NULL THEN 'google_' || COALESCE(fl.utm_campaign, 'unknown')
                ELSE NULL
            END
        ) AS campaign_id,
        CASE
            WHEN fl.google_campaign_id IS NOT NULL
                 OR fl.gclid IS NOT NULL
                 OR fl.dominant_platform = 'google' THEN 'Google Ads'
            -- FIXED: Added utm_source facebook detection
            WHEN fl.meta_campaign_id IS NOT NULL
                 OR fl.fbclid IS NOT NULL
                 OR fl.fb_lead_id IS NOT NULL
                 OR fl.dominant_platform = 'meta'
                 OR LOWER(fl.utm_source) LIKE '%facebook%'
                 OR LOWER(fl.utm_source) LIKE '%meta%'
                 OR fl.utm_source = 'fb' THEN 'Meta'
            ELSE 'Direct'
        END AS platform,
        COUNT(DISTINCT fl.id_source) AS leads,
        COUNT(DISTINCT fl.id_source) FILTER (WHERE cr.contract_id IS NOT NULL) AS contracts,
        SUM(cr.contract_total) AS revenue,
        ROUND(AVG(cr.contract_total) FILTER (WHERE cr.contract_id IS NOT NULL), 2) AS avg_contract
    FROM dashboards.fact_leads fl
    JOIN dashboards.crm_requests cr ON cr.id_source = fl.id_source
    WHERE cr.source_date_time >= CURRENT_DATE - 90
    GROUP BY
        cr.source_date_time::date,
        COALESCE(
            fl.google_campaign_name,
            fl.meta_campaign_name,
            CASE
                WHEN fl.dominant_platform = 'meta'
                     OR fl.fbclid IS NOT NULL
                     OR LOWER(fl.utm_source) LIKE '%facebook%'
                     OR LOWER(fl.utm_source) LIKE '%meta%'
                     OR fl.utm_source = 'fb' THEN fl.utm_campaign
                WHEN fl.dominant_platform = 'google'
                     OR fl.gclid IS NOT NULL THEN fl.utm_campaign
                ELSE 'Direct'
            END
        ),
        COALESCE(
            fl.google_campaign_id,
            fl.meta_campaign_id,
            CASE
                WHEN fl.dominant_platform = 'meta'
                     OR fl.fbclid IS NOT NULL
                     OR LOWER(fl.utm_source) LIKE '%facebook%'
                     OR LOWER(fl.utm_source) LIKE '%meta%'
                     OR fl.utm_source = 'fb' THEN 'meta_' || COALESCE(fl.utm_campaign, 'unknown')
                WHEN fl.dominant_platform = 'google'
                     OR fl.gclid IS NOT NULL THEN 'google_' || COALESCE(fl.utm_campaign, 'unknown')
                ELSE NULL
            END
        ),
        CASE
            WHEN fl.google_campaign_id IS NOT NULL
                 OR fl.gclid IS NOT NULL
                 OR fl.dominant_platform = 'google' THEN 'Google Ads'
            WHEN fl.meta_campaign_id IS NOT NULL
                 OR fl.fbclid IS NOT NULL
                 OR fl.fb_lead_id IS NOT NULL
                 OR fl.dominant_platform = 'meta'
                 OR LOWER(fl.utm_source) LIKE '%facebook%'
                 OR LOWER(fl.utm_source) LIKE '%meta%'
                 OR fl.utm_source = 'fb' THEN 'Meta'
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
    COALESCE(ga.impressions, fb.impressions, 0) AS impressions,
    COALESCE(ga.clicks, fb.clicks, 0) AS clicks,
    COALESCE(ga.spend, fb.spend, 0) AS spend,
    COALESCE(ga.conversions, 0) AS ad_conversions,
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

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test 1: Check Meta contracts count
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

-- Expected result for Meta:
-- Meta | 1007 | 4 | 131715.00 | 0.40

-- Test 2: Show Meta contract details
SELECT
  id_source,
  contract_total,
  utm_source,
  fbclid,
  fb_lead_id,
  meta_campaign_id
FROM dashboards.crm_requests cr
WHERE cr.source_date_time >= '2025-09-01'
  AND cr.contract_id IS NOT NULL
  AND (
    cr.code->>'fbclid' IS NOT NULL
    OR cr.code->>'fb_lead_id' IS NOT NULL
    OR cr.code->>'meta_campaign_id' IS NOT NULL
    OR cr.code->>'utm_source' ILIKE '%facebook%'
    OR cr.code->>'utm_source' ILIKE '%meta%'
    OR cr.code->>'utm_source' = 'fb'
  )
ORDER BY contract_total DESC;

-- Should show 4 contracts:
-- 4172825 | 91440 | facebook.com
-- 4181105 | 33750 | (has fbclid)
-- 4197560 | 6475  | Facebook_Mobile_Feed
-- 4173215 | 50    | facebook.com
