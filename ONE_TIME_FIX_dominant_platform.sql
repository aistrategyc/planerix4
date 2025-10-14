-- ============================================================================
-- КРИТИЧНЕ ВИПРАВЛЕННЯ: Перекласифікація dominant_platform
-- ============================================================================
-- Проблема: 90% лідів класифіковані як "direct", хоча мають Meta/Google attribution
-- Рішення: Пріоритезувати реальну атрибуцію (campaign_id) над UTM
-- Очікуваний ефект: 450+ лідів перекласифікуються з "direct" → "meta"/"google"
-- ============================================================================

BEGIN;

\echo '=== ПЕРЕВІРКА ДО ОНОВЛЕННЯ ==='
SELECT
  dominant_platform,
  COUNT(*) as leads,
  COUNT(CASE WHEN contract_amount > 0 THEN 1 END) as contracts,
  COUNT(CASE WHEN meta_campaign_id IS NOT NULL THEN 1 END) as with_meta_attr,
  COUNT(CASE WHEN google_campaign_id IS NOT NULL THEN 1 END) as with_google_attr
FROM dashboards.fact_leads
GROUP BY dominant_platform
ORDER BY leads DESC;

\echo ''
\echo '=== ОНОВЛЕННЯ dominant_platform (Нова логіка) ==='

-- Пріоритети:
-- 1. Якщо є campaign_id (найточніше)
-- 2. Якщо є click_id (fbclid/gclid)
-- 3. Якщо є UTM source
-- 4. Інше = direct

UPDATE dashboards.fact_leads
SET
  dominant_platform = CASE
    -- Priority 1: Campaign IDs (найточніше)
    WHEN meta_campaign_id IS NOT NULL THEN 'meta'
    WHEN google_campaign_id IS NOT NULL THEN 'google'

    -- Priority 2: Click IDs
    WHEN fbclid IS NOT NULL THEN 'meta'
    WHEN gclid IS NOT NULL THEN 'google'

    -- Priority 3: UTM Source
    WHEN LOWER(utm_source) IN ('facebook', 'instagram', 'fb', 'ig') THEN 'meta'
    WHEN LOWER(utm_source) IN ('google', 'google_ads', 'adwords') THEN 'google'
    WHEN LOWER(utm_source) IN ('email', 'newsletter') THEN 'email'
    WHEN LOWER(utm_source) IN ('telegram', 'tg') THEN 'other'
    WHEN utm_source IS NOT NULL AND utm_source != '' THEN 'other'

    -- Default: direct
    ELSE 'direct'
  END,
  row_updated_at = now()
WHERE dominant_platform IS NULL
   OR dominant_platform = 'direct'
   OR dominant_platform = 'unknown';

\echo '=== ПЕРЕВІРКА ПІСЛЯ ОНОВЛЕННЯ ==='
SELECT
  dominant_platform,
  COUNT(*) as leads,
  COUNT(CASE WHEN contract_amount > 0 THEN 1 END) as contracts,
  ROUND(SUM(COALESCE(contract_amount, 0)), 2) as revenue,
  COUNT(CASE WHEN meta_campaign_id IS NOT NULL THEN 1 END) as with_meta_attr,
  COUNT(CASE WHEN google_campaign_id IS NOT NULL THEN 1 END) as with_google_attr
FROM dashboards.fact_leads
GROUP BY dominant_platform
ORDER BY leads DESC;

\echo ''
\echo '=== ПЕРЕКЛАСИФІКОВАНО ==='
SELECT
  'Лідів перекласифіковано' as metric,
  COUNT(*) as value
FROM dashboards.fact_leads
WHERE dominant_platform IN ('meta', 'google')
  AND (meta_campaign_id IS NOT NULL OR google_campaign_id IS NOT NULL);

COMMIT;

\echo ''
\echo '========================================='
\echo '✅ dominant_platform ОНОВЛЕНО'
\echo '========================================='
\echo ''
\echo 'Наступний крок: Перезапустити workflow "2 Staging" для оновлення views'
